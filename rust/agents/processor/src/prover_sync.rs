use crate::prover::{Prover, ProverError};
use color_eyre::eyre::{bail, Result};
use ethers::core::types::H256;
use optics_core::{
    accumulator::{incremental::IncrementalMerkle, INITIAL_ROOT},
    db::{DbError, OpticsDB},
    ChainCommunicationError,
};
use std::{fmt::Display, ops::Range, time::Duration};
use tokio::{task::JoinHandle, time::sleep};
use tracing::{debug, error, info, info_span, instrument, instrument::Instrumented, Instrument};

/// Struct to sync prover.
#[derive(Debug)]
pub struct ProverSync {
    db: OpticsDB,
    prover: Prover,
    incremental: IncrementalMerkle,
}

impl Display for ProverSync {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "ProverSync {{ ")?;
        write!(
            f,
            "incremental: {{ root: {:?}, size: {} }}, ",
            self.incremental.root(),
            self.incremental.count()
        )?;
        write!(
            f,
            "prover: {{ root: {:?}, size: {} }} ",
            self.prover.root(),
            self.prover.count()
        )?;
        write!(f, "}}")?;
        Ok(())
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
    /// DB Error
    #[error("{0}")]
    DbError(#[from] DbError),
}

impl ProverSync {
    fn store_proof(&self, leaf_index: u32) -> Result<(), ProverSyncError> {
        match self.prover.prove(leaf_index as usize) {
            Ok(proof) => {
                self.db.store_proof(leaf_index, &proof)?;
                info!(
                    leaf_index,
                    root = ?self.prover.root(),
                    "Storing proof for leaf {}",
                    leaf_index
                );
                Ok(())
            }
            // ignore the storage request if it's out of range (e.g. leaves
            // up-to-date but no update containing leaves produced yet)
            Err(ProverError::ZeroProof { index: _, count: _ }) => Ok(()),
            // bubble up any other errors
            Err(e) => Err(e.into()),
        }
    }

    /// Given rocksdb handle `db` containing merkle tree leaves,
    /// instantiates new `ProverSync` and fills prover's merkle tree
    #[instrument(level = "debug", skip(db))]
    pub fn from_disk(db: OpticsDB) -> Self {
        // Ingest all leaves in db into prover tree
        let mut prover = Prover::default();
        let mut incremental = IncrementalMerkle::default();

        if let Some(root) = db.retrieve_latest_root().expect("db error") {
            for i in 0.. {
                match db.leaf_by_leaf_index(i) {
                    Ok(Some(leaf)) => {
                        debug!(leaf_index = i, "Ingesting leaf from_disk");
                        prover.ingest(leaf).expect("!tree full");
                        incremental.ingest(leaf);
                        assert_eq!(prover.root(), incremental.root());
                        if prover.root() == root {
                            break;
                        }
                    }
                    Ok(None) => break,
                    Err(e) => {
                        error!(error = %e, "Error in ProverSync::from_disk");
                        panic!("Error in ProverSync::from_disk");
                    }
                }
            }
            info!(target_latest_root = ?root, root = ?incremental.root(), "Reloaded ProverSync from disk");
        }

        let sync = Self {
            prover,
            incremental,
            db,
        };

        // Ensure proofs exist for all leaves
        for i in 0..sync.prover.count() as u32 {
            match (
                sync.db.leaf_by_leaf_index(i).expect("db error"),
                sync.db.proof_by_leaf_index(i).expect("db error"),
            ) {
                (Some(_), None) => sync.store_proof(i).expect("db error"),
                (None, _) => break,
                _ => {}
            }
        }

        sync
    }

    // The current canonical local root. This is the root that the full
    // prover currently has. If that root is the initial root, it is 0.
    fn local_root(&self) -> H256 {
        let root = self.prover.root();
        if root == *INITIAL_ROOT {
            H256::zero()
        } else {
            root
        }
    }

    // expensive and poorly done
    async fn get_leaf_range(&self, range: Range<usize>) -> Result<Vec<H256>, ProverSyncError> {
        let mut leaves = vec![];

        for i in range {
            let leaf = self.db.wait_for_leaf(i as u32).await?;
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
    #[tracing::instrument(err, skip(self, local_root, new_root), fields(self = %self, local_root = ?local_root, new_root = ?new_root))]
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

        // Check that local root still equals prover's root just in case
        // another entity wrote to prover while we were building the leaf
        // vector. If roots no longer match, return Ok(()) and restart
        // poll_updates loop.
        if local_root != self.local_root() {
            info!("ProverSync: Root mismatch during update. Resuming loop.");
            return Ok(());
        }

        // Extend in-memory tree
        info!("Committing leaves {}..{} to prover.", start, end);
        let leaves = self.get_leaf_range(start..end).await?;
        let num_leaves = leaves.len();

        self.prover.extend(leaves.into_iter());
        info!("Committed {} leaves to prover.", num_leaves);

        if new_root != self.prover.root() {
            error!(
                start = ?local_root,
                expected = ?new_root,
                actual = ?self.prover.root(),
                "Prover in unexpected state after committing leaves"
            );
            return Err(ProverSyncError::MismatchedRoots {
                local_root: self.prover.root(),
                new_root,
            });
        }

        // if we don't already have a proof in the DB
        // calculate a proof under the current root for each leaf
        // store all calculated proofs in the db
        // TODO(luke): refactor prover_sync so we dont have to iterate over every leaf (match from_disk implementation)
        for idx in 0..self.prover.count() {
            if self.db.proof_by_leaf_index(idx as u32)?.is_none() {
                self.store_proof(idx as u32)?;
            }
        }

        Ok(())
    }

    /// Given `local_root` and `new_root` from signed update, ingest leaves
    /// into incremental merkle one-by-one until local root matches new root
    /// and return ingested leaves if successful. If incremental merkle is
    /// up-to-date with update but roots still don't match, return
    /// `MismatchedRoots` error.
    #[instrument(err, skip(self), fields(self = %self))]
    async fn update_incremental(
        &mut self,
        local_root: H256,
        new_root: H256,
    ) -> Result<Range<usize>, ProverSyncError> {
        // Create copy of ProverSync's incremental so we can easily discard
        // changes in case of bad updates
        let mut incremental = self.incremental;
        let mut current_root = local_root;

        let start = incremental.count();
        let mut tree_size = start;
        info!(
            local_root = ?local_root,
            new_root = ?new_root,
            "Local root is {}, going to root {}",
            local_root,
            new_root
        );

        let mut leaves = vec![];

        while current_root != new_root {
            info!(
                current_root = ?local_root,
                index = tree_size,
                "Retrieving next leaf, at index {}",
                tree_size
            );

            // As we fill the incremental merkle, its tree_size will always be
            // equal to the index of the next leaf we want (e.g. if tree_size
            // is 3, we want the 4th leaf, which is at index 3)
            if let Some(leaf) = self.db.wait_for_leaf(tree_size as u32).await? {
                info!(
                    index = tree_size,
                    leaf = ?leaf,
                    "Leaf at index {} is {}",
                    tree_size,
                    leaf
                );
                incremental.ingest(leaf);
                leaves.push(leaf);
                current_root = incremental.root();
            } else {
                // break on no leaf (warn: path never taken)
                current_root = incremental.root();
                break;
            }
            tree_size = incremental.count();
        }

        // If local incremental tree is up-to-date but doesn't match new
        // root, bubble up MismatchedRoots error
        if current_root != new_root {
            return Err(ProverSyncError::MismatchedRoots {
                local_root: current_root,
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
    pub fn spawn(mut self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("ProverSync", self = %self);
        tokio::spawn(async move {
            loop {
                let local_root = self.local_root();
                let signed_update_opt = self.db.update_by_previous_root(local_root)?;

                // This if block is somewhat ugly.
                // First we check if there is a signed update with the local root.
                //   If so we start ingesting messages under the new root.
                // Otherwise, if there is no update,
                //   We ignore the initial root
                //   We ensure that an update produced the local root.
                //      If no update produced the local root, we error.
                if let Some(signed_update) = signed_update_opt {
                    info!(
                        "Have signed update from {} to {}",
                        signed_update.update.previous_root, signed_update.update.new_root,
                    );
                    self.update_full(local_root, signed_update.update.new_root)
                        .await?;
                } else if !local_root.is_zero() && self.db.update_by_new_root(local_root)?.is_none()
                {
                    bail!(ProverSyncError::InvalidLocalRoot { local_root });
                }

                // kludge
                sleep(Duration::from_millis(100)).await;
            }
        })
        .instrument(span)
    }
}
