use crate::{accumulator::{prover::{Prover, ProverError}, incremental::IncrementalMerkle}, traits::Home};
use color_eyre::Result;
use ethers::core::types::H256;
use std::{time::Duration, sync::Arc};
use tokio::{
    sync::{
        oneshot::{error::TryRecvError, Receiver},
        RwLock,
    },
    time::interval,
};

/// Struct to sync prover.
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
    #[error("Local tree up-to-date but root does not match update. Local root: {local_root}. Update root: {new_root}.")]
    MismatchedRoots {
        /// Root of prover's local merkle tree
        local_root: H256, 
        /// New root contained in signed update
        new_root: H256 
    },
    /// ProverSync attempts Prover operation and receives ProverError
    #[error("Prover error occurred: {error}.")]
    ProverError {
        /// Error returned by Prover operation
        error: ProverError
    }
}

impl ProverSync {
    /// Poll for signed updates at regular interval and update
    /// local merkle tree with all leaves between local root and 
    /// new root. Use short interval for bootup syncing and longer
    /// interval for regular polling.
    async fn poll_updates(&mut self, interval_seconds: u64) -> Result<(), ProverSyncError> {
        let mut interval = interval(Duration::from_secs(interval_seconds));

        loop {
            let local_root = self.prover.read().await.root();

            let signed_update_res = self.home.signed_update_by_old_root(local_root).await;

            // If error polling signed update, log error and try again
            if let Err(e) = signed_update_res {
                tracing::error!("Error retrieving signed_update: {}", e);
                continue;
            }

            if let Some(signed_update) = signed_update_res.unwrap() {
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
    async fn update_prover_tree(&mut self, local_root: H256, new_root: H256) -> Result<(), ProverSyncError> {
        let mut leaves: Vec<H256> = Vec::new();

        // If roots don't match by end of incremental update, will return 
        // MismatchedRoots error
        self.update_incremental(local_root, new_root, &mut leaves).await?;

        let mut prover_write = self.prover.write().await;
        for leaf in leaves.into_iter() {
            if let Err(e) = prover_write.ingest(leaf) {
                return Err(ProverSyncError::ProverError {error: e});
            }
        }

        Ok(())
    }

    /// Given `local_root` and `new_root` from signed update, ingest leaves
    /// into incremental merkle one-by-one until local root matches new root.
    /// If incremental merkle is up-to-date with update but roots still don't 
    /// match, return `MismatchedRoots` error.
    async fn update_incremental(&mut self, mut local_root: H256, new_root: H256, leaves: &mut Vec<H256>) -> Result<(), ProverSyncError> {
        while local_root != new_root {
            let tree_size = self.incremental.count();
            let leaf_res = self.home.leaf_by_tree_size(tree_size).await;

            // If error retrieving leaf, log error and try again
            if let Err(e) = leaf_res {
                tracing::error!("Error retrieving leaf at tree_size {}: {}", tree_size, e);
                continue;
            }

            // If new leaf exists, try to ingest into incremental
            if let Some(leaf) = leaf_res.unwrap() {
                self.incremental.ingest(leaf);
                leaves.push(leaf);
                local_root = self.incremental.root();
            } else {
                // If local incremental tree up-to-date but doesn't match new 
                // root, bubble up MismatchedRoots error
                local_root = self.incremental.root();
                if local_root != new_root {
                    return Err(ProverSyncError::MismatchedRoots {
                        local_root,
                        new_root,
                    });
                }
            }
        }

        Ok(())
    }
}
