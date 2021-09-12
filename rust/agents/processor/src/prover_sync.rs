use crate::prover::{Prover, ProverError};
use ethers::core::types::H256;
use optics_base::home::Homes;
use optics_core::{
    accumulator::{incremental::IncrementalMerkle, INITIAL_ROOT},
    db::{DbError, DB},
    traits::{ChainCommunicationError, Common},
};
use std::{ops::Range, sync::Arc, time::Duration};
use tokio::{
    sync::{
        oneshot::{error::TryRecvError, Receiver},
        RwLock,
    },
    time::sleep,
};
use tracing::{debug, info, instrument};

/// Struct to sync prover.
#[derive(Debug)]
pub struct ProverSync {
    home: Arc<Homes>,
    db: DB,
    prover: Arc<RwLock<Prover>>,
    incremental: IncrementalMerkle,
    rx: Receiver<()>,
}

/// ProverSync errors
#[derive(Debug, thiserror::Error)]
pub enum ProverSyncError {
    /// Local tree up-to-date but root does not match signed update"
    #[error("Local tree up-to-date but root does not match update. Local root: {local_root}. Update root: {new_root}. WARNING: this could indicate malicious updater and/or long reorganization process!")]
    MismatchedRoots {
        /// Root of prover's local merkle tree
        local_root: H256,
        /// New root contained in signed update
        new_root: H256,
    },
    /// Local root was never signed by updater and submitted to Home.
    #[error("Local root {local_root:?} was never signed by updater and submitted to Home.")]
    InvalidLocalRoot {
        /// Root of prover's local merkle tree
        local_root: H256,
    },
    /// ProverSync attempts Prover operation and receives ProverError
    #[error(transparent)]
    ProverError(#[from] ProverError),
    /// ProverSync receives ChainCommunicationError from chain API
    #[error(transparent)]
    ChainCommunicationError(#[from] ChainCommunicationError),
    /// DB Error
    #[error("{0}")]
    DbError(#[from] DbError),
}

impl ProverSync {
    /// Instantiates a new ProverSync.
    pub fn new(prover: Arc<RwLock<Prover>>, home: Arc<Homes>, db: DB, rx: Receiver<()>) -> Self {
        Self {
            prover,
            home,
            incremental: IncrementalMerkle::default(),
            db,
            rx,
        }
    }

    // The current canonical local root. This is the root that the full
    // prover currently has. If that root is the initial root, it is 0.
    async fn local_root(&self) -> H256 {
        let root = self.prover.read().await.root();
        if root == *INITIAL_ROOT {
            H256::zero()
        } else {
            root
        }
    }

    // simple caching
    #[instrument(err)]
    async fn fetch_leaf(&self, leaf_index: u32) -> Result<Option<H256>, ProverSyncError> {
        loop {
            if let Some(idx) = self.db.retrieve_latest_leaf_index()? {
                if idx >= leaf_index {
                    debug!("Retrieving leaf from db.");
                    return Ok(self.db.leaf_by_leaf_index(leaf_index as u32)?);
                }
            }
            // TODO(james): make not suck
            sleep(Duration::from_secs(10)).await;
        }
    }

    // expensive and poorly done
    async fn get_leaf_range(&mut self, range: Range<usize>) -> Result<Vec<H256>, ProverSyncError> {
        let mut leaves = vec![];

        for i in range {
            let leaf = self.fetch_leaf(i as u32).await?;
            if leaf.is_none() {
                break;
            }
            leaves.push(leaf.unwrap());
        }

        Ok(leaves)
    }

    /// First attempt to update incremental merkle tree with all leaves
    /// produced between `local_root` and `new_root`. If successful (i.e.
    /// incremental tree is updated until its root equals the `new_root`),
    /// commit to changes by batch updating the prover's actual merkle tree.
    #[tracing::instrument(err, skip(self))]
    async fn update_full(
        &mut self,
        local_root: H256,
        new_root: H256,
    ) -> Result<(), ProverSyncError> {
        // If roots don't match by end of incremental update, will return
        // MismatchedRoots error.
        // We destructure the range here to avoid cloning it several times
        // later on.
        let Range { start, end } = self.update_incremental(local_root, new_root).await?;
        let leaves = self.get_leaf_range(start..end).await?;

        // Check that local root still equals prover's root just in case
        // another entity wrote to prover while we were building the leaf
        // vector. If roots no longer match, return Ok(()) and restart
        // poll_updates loop.
        if local_root != self.local_root().await {
            info!("ProverSync: Root mismatch during update. Resuming loop.");
            return Ok(());
        }

        // Extend in-memory tree
        info!("Committing leaves {}..{} to prover.", start, end);
        let leaves = leaves.into_iter();

        let mut proofs = vec![];

        {
            // lock bounds
            let mut prover = self.prover.write().await;
            prover.extend(leaves.clone());
            assert_eq!(new_root, prover.root());
            info!("Committed {} leaves to prover.", leaves.len());

            // calculate a proof under the current root for each leaf
            for idx in start..end {
                let proof = prover.prove(idx)?;
                proofs.push((idx, proof));
            }
        }

        // store all calculated proofs in the db
        for (idx, proof) in proofs {
            self.db.store_proof(idx as u32, &proof)?;
        }
        info!("Stored proofs for leaves {}..{}", start, end);

        Ok(())
    }

    /// Given `local_root` and `new_root` from signed update, ingest leaves
    /// into incremental merkle one-by-one until local root matches new root
    /// and return ingested leaves if successful. If incremental merkle is
    /// up-to-date with update but roots still don't match, return
    /// `MismatchedRoots` error.
    #[tracing::instrument(err, skip(self))]
    async fn update_incremental(
        &mut self,
        local_root: H256,
        new_root: H256,
    ) -> Result<Range<usize>, ProverSyncError> {
        // Create copy of ProverSync's incremental so we can easily discard
        // changes in case of bad updates
        let mut incremental = self.incremental;
        let mut local_root = local_root;

        let start = incremental.count();
        let mut tree_size = start;
        info!("Local root is {}, goingt to root {}", local_root, new_root);

        while local_root != new_root {
            info!("Retrieving leaf at index {}", tree_size);

            // As we fill the incremental merkle, its tree_size will always be
            // equal to the index of the next leaf we want (e.g. if tree_size
            // is 3, we want the 4th leaf, which is at index 3)
            if let Some(leaf) = self.fetch_leaf(tree_size as u32).await? {
                info!("Leaf at index {} is {}", tree_size, leaf);
                incremental.ingest(leaf);
                local_root = incremental.root();
            } else {
                // break on no leaf
                local_root = incremental.root();
                break;
            }
            tree_size = incremental.count();
        }

        // If local incremental tree is up-to-date but doesn't match new
        // root, bubble up MismatchedRoots error
        if local_root != new_root {
            return Err(ProverSyncError::MismatchedRoots {
                local_root,
                new_root,
            });
        }

        info!("Committing leaves {}..{} to incremental.", start, tree_size);
        self.incremental = incremental;
        assert!(incremental.root() == new_root);
        Ok(start..tree_size)
    }

    /// Consume self and poll for signed updates at regular interval. Update
    /// local merkle tree with all leaves between local root and
    /// new root. Use short interval for bootup syncing and longer
    /// interval for regular polling.
    #[tracing::instrument(err, skip(self))]
    pub async fn spawn(mut self) -> Result<(), ProverSyncError> {
        loop {
            let local_root = self.local_root().await;
            let signed_update_opt = self.home.signed_update_by_old_root(local_root).await?;

            // This if block is somewhat ugly.
            // First we check if there is a signed update with the local root.
            //   If so we start ingesting messages under the new root.
            // Otherwise, if there is no update,
            //   We ignore the initial root
            //   We ensure that an update produced the local root.
            //      If no update produced the local root, we error.
            if let Some(signed_update) = signed_update_opt {
                info!(
                    "have signed update from {} to {}",
                    signed_update.update.previous_root, signed_update.update.new_root,
                );
                self.update_full(local_root, signed_update.update.new_root)
                    .await?;
            } else if !local_root.is_zero()
                && self
                    .home
                    .signed_update_by_new_root(local_root)
                    .await?
                    .is_none()
            {
                return Err(ProverSyncError::InvalidLocalRoot { local_root });
            }

            // Check to see if the parent task has shut down
            if let Err(TryRecvError::Closed) = self.rx.try_recv() {
                info!("ProverSync: Parent task has shut down.");
                break;
            }
        }

        Ok(())
    }
}
