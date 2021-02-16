use crate::{accumulator::prover::Prover, traits::Home};
use color_eyre::Result;
use core::panic;
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
                self.update_tree(local_root, signed_update.update.new_root)
                    .await?;
            }

            if let Err(TryRecvError::Closed) = self.rx.try_recv() {
                break;
            }
            interval.tick().await;
        }

        Ok(())
    }

    /// Given new root from signed update, ingest leaves one-by-one
    /// until local root matches new root.
    async fn update_tree(&mut self, mut local_root: H256, new_root: H256) -> Result<(), ProverSyncError> {
        while local_root != new_root {
            let tree_size = self.prover.read().await.count();
            let leaf_res = self.home.leaf_by_tree_size(tree_size).await;

            // If error retrieving leaf, log error and try again
            if let Err(e) = leaf_res {
                tracing::error!("Error retrieving leaf at tree_size {}: {}", tree_size, e);
                continue;
            }

            if let Some(leaf) = leaf_res.unwrap() {
                // If new leaf exists, try to ingest
                let mut prover_write = self.prover.write().await;

                // If error ingesting leaf, log error and try again
                if let Err(e) = prover_write.ingest(leaf) {
                    tracing::error!("Error ingesting leaf: {}", e);
                    continue;
                }
                local_root = self.prover.read().await.root();
            } else {
                //If local tree up-to-date but doesn't match new root, bubble up MismatchedRoots error
                local_root = self.prover.read().await.root();
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
