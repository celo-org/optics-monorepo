use crate::{
    accumulator::{
        incremental::IncrementalMerkle,
        prover::{Prover, ProverError},
    },
    traits::{ChainCommunicationError, Home},
};
use ethers::core::types::H256;
use std::{sync::Arc, time::Duration};
use tokio::{
    sync::{
        oneshot::{error::TryRecvError, Receiver},
        RwLock,
    },
    time::interval,
};

/// Struct to sync prover.
#[derive(Debug)]
pub struct ProverSync {
    prover: Arc<RwLock<Prover>>,
    home: Arc<Box<dyn Home>>,
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
    /// ProverSync attempts Prover operation and receives ProverError
    #[error(transparent)]
    ProverError(#[from] ProverError),
    /// ProverSync receives ChainCommunicationError from chain API
    #[error(transparent)]
    ChainCommunicationError(#[from] ChainCommunicationError),
}

impl ProverSync {
    /// Poll for signed updates at regular interval and update
    /// local merkle tree with all leaves between local root and
    /// new root. Use short interval for bootup syncing and longer
    /// interval for regular polling.
    #[tracing::instrument(err)]
    async fn poll_updates(&mut self, interval_seconds: u64) -> Result<(), ProverSyncError> {
        let mut interval = interval(Duration::from_secs(interval_seconds));

        loop {
            let local_root = self.prover.read().await.root();

            let signed_update_opt = self.home.signed_update_by_old_root(local_root).await?;

            if let Some(signed_update) = signed_update_opt {
                self.update_prover_tree(local_root, signed_update.update.new_root)
                    .await?;
            }

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

        let mut prover_write = self.prover.write().await;
        prover_write.extend(leaves.into_iter());
        assert_eq!(new_root, prover_write.root());

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

        // Create clone of ProverSync's incremental so we can easily discard
        // changes in case of bad update
        let mut incremental = self.incremental.clone();
        let mut local_root = local_root;

        while local_root != new_root {
            let tree_size = incremental.count();
            let leaf_opt = self.home.leaf_by_tree_index(tree_size).await?;

            if let Some(leaf) = leaf_opt {
                incremental.ingest(leaf);
                leaves.push(leaf);
                local_root = incremental.root();
            } else {
                // If local incremental tree up-to-date but doesn't match new
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
