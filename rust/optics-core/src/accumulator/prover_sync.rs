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
    time::{interval, Interval},
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
    /// Local tree up-to-date but root does not match update"
    #[error("Local tree up-to-date but root does not match update. Local root: {local_root}. Update root: {update_root}.")]
    MismatchedRoots { local_root: H256, update_root: H256 },
}

impl ProverSync {
    /// Poll for signed updates at regular interval and update
    /// local merkle tree with all leaves between new root and 
    /// local root. Use short interval for bootup syncing and longer
    /// interval for regular polling.
    async fn poll_updates(&mut self, interval_seconds: u64) -> Result<()> {
        let mut interval = interval(Duration::from_secs(interval_seconds));

        loop {
            let mut local_root = self.prover.read().await.root();

            if let Some(signed_update) = self.home.signed_update_by_old_root(local_root).await? {
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
    async fn update_tree(&mut self, mut local_root: H256, new_root: H256) -> Result<()> {
        while local_root != new_root {
            let tree_size = self.prover.read().await.count();
            if let Some(leaf) = self.home.leaf_by_tree_size(tree_size).await? {
                // If new leaf exists, try to ingest
                let mut prover_write = self.prover.write().await;

                // If error ingesting leaf, local_root is same so will try again
                if let Err(e) = prover_write.ingest(leaf) {
                    tracing::error!("Error ingesting leaf: {}", e)
                }
                local_root = self.prover.read().await.root();
            } else {
                // If tree up to date but roots don't match, panic
                local_root = self.prover.read().await.root();
                if local_root != new_root {
                    panic!("Local tree up-to-date but root does not match update"); // TODO: replace with real error handling
                }
            }
        }

        Ok(())
    }
}
