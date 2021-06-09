use crate::prover::{Prover, ProverError};
use ethers::core::types::H256;
use optics_base::{db::UsingPersistence, home::Homes};
use optics_core::{
    accumulator::{incremental::IncrementalMerkle, INITIAL_ROOT},
    traits::{ChainCommunicationError, Common, Home},
};
use rocksdb::DB;
use std::{sync::Arc, time::Duration};
use tokio::{
    sync::{
        oneshot::{error::TryRecvError, Receiver},
        RwLock,
    },
    time::interval,
};
use tracing::info;

/// Struct to sync prover.
#[derive(Debug)]
pub struct ProverSync {
    prover: Arc<RwLock<Prover>>,
    home: Arc<Homes>,
    incremental: IncrementalMerkle,
    db: Arc<DB>,
    rx: Receiver<()>,
}

impl UsingPersistence<usize, H256> for ProverSync {
    const KEY_PREFIX: &'static [u8] = "index_".as_bytes();

    fn key_to_bytes(key: usize) -> Vec<u8> {
        key.to_be_bytes().into()
    }
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
}

impl ProverSync {
    /// Instantiates a new ProverSync.
    pub fn new(
        prover: Arc<RwLock<Prover>>,
        home: Arc<Homes>,
        db: Arc<DB>,
        rx: Receiver<()>,
    ) -> Self {
        Self {
            prover,
            home,
            incremental: IncrementalMerkle::default(),
            db,
            rx,
        }
    }

    /// Consume self and poll for signed updates at regular interval. Update
    /// local merkle tree with all leaves between local root and
    /// new root. Use short interval for bootup syncing and longer
    /// interval for regular polling.
    #[tracing::instrument(err)]
    pub async fn poll_updates(mut self, interval_seconds: u64) -> Result<(), ProverSyncError> {
        let mut interval = interval(Duration::from_secs(interval_seconds));

        loop {
            let local_root = self.prover.read().await.root();

            let signed_update_opt = self.home.signed_update_by_old_root(local_root).await?;

            // This if block is somewhat ugly.
            // First we check if there is a signed update with the local root.
            //   If so we start ingesting messages under the new root.
            // Otherwise, if there is no update,
            //   We ignore the initial root
            //   We ensure that an update produced the local root.
            //      If no update produced the local root, we error.
            if let Some(signed_update) = signed_update_opt {
                info!("have signed update, updating prover tree");
                self.update_prover_tree(local_root, signed_update.update.new_root)
                    .await?;
            } else if local_root != *INITIAL_ROOT
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
                break;
            }
            interval.tick().await;
        }

        Ok(())
    }

    /// First attempt to update incremental merkle tree with all leaves
    /// produced between `local_root` and `new_root`. If successful (i.e.
    /// incremental tree is updated until its root equals the `new_root`),
    /// commit to changes by batch updating the prover's actual merkle tree.
    #[tracing::instrument(err)]
    async fn update_prover_tree(
        &mut self,
        local_root: H256,
        new_root: H256,
    ) -> Result<(), ProverSyncError> {
        // If roots don't match by end of incremental update, will return
        // MismatchedRoots error
        let leaves = self
            .update_incremental_and_return_leaves(local_root, new_root)
            .await?;

        let mut prover = self.prover.write().await;

        // Check that local root still equals prover's root just in case
        // another entity wrote to prover while we were building the leaf
        // vector. If roots no longer match, return Ok(()) and restart
        // poll_updates loop.
        if local_root != prover.root() {
            return Ok(());
        }

        // Save current index of prover tree before updating tree
        let mut index = prover.count();

        // Extend in-memory tree
        info!("Extending tree with {} leaves", leaves.len());
        let leaves = leaves.into_iter();
        prover.extend(leaves.clone());
        assert_eq!(new_root, prover.root());

        // If in-memory extension succeeded, write kv pairs to disk
        for leaf in leaves {
            Self::db_put(&self.db, index, leaf).expect("!db_put");
            index += 1;
        }

        Ok(())
    }

    /// Given `local_root` and `new_root` from signed update, ingest leaves
    /// into incremental merkle one-by-one until local root matches new root
    /// and return ingested leaves if successful. If incremental merkle is
    /// up-to-date with update but roots still don't match, return
    /// `MismatchedRoots` error.
    #[tracing::instrument(err)]
    async fn update_incremental_and_return_leaves(
        &mut self,
        local_root: H256,
        new_root: H256,
    ) -> Result<Vec<H256>, ProverSyncError> {
        let mut leaves: Vec<H256> = Vec::new();

        // Create copy of ProverSync's incremental so we can easily discard
        // changes in case of bad update
        let mut incremental = self.incremental;
        let mut local_root = local_root;

        while local_root != new_root {
            let tree_size = incremental.count();

            // As we fill the incremental merkle, its tree_size will always be
            // equal to the index of the next leaf we want (e.g. if tree_size
            // is 3, we want the 4th leaf, which is at index 3)
            let leaf_opt = self.home.leaf_by_tree_index(tree_size).await?;

            if let Some(leaf) = leaf_opt {
                incremental.ingest(leaf);
                leaves.push(leaf);
                local_root = incremental.root();
            } else {
                // If local incremental tree is up-to-date but doesn't match new
                // root, bubble up MismatchedRoots error
                local_root = incremental.root();
                if local_root != new_root {
                    return Err(ProverSyncError::MismatchedRoots {
                        local_root,
                        new_root,
                    });
                }
            }
        }

        self.incremental = incremental;
        Ok(leaves)
    }
}
