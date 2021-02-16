use crate::{accumulator::prover::Prover, traits::Home};
use color_eyre::Result;
use core::panic;
use ethers::core::types::H256;
use std::sync::Arc;
use tokio::{
    sync::{
        oneshot::{error::TryRecvError, Receiver},
        RwLock,
    },
    time::{interval, Interval},
};

pub struct ProverSync {
    prover: Arc<RwLock<Prover>>,
    home: Arc<Box<dyn Home>>,
    interval_seconds: u64,
    rx: Receiver<()>,
}

/// ProverSync errors
#[derive(Debug, thiserror::Error)]
pub enum ProverSyncError {
    /// Local tree up-to-date but root does not match update"
    #[error("Local tree up-to-date but root does not match update. Local root: {local_root}. Update root: {update_root}.")]
    MismatchedRoots { local_root: H256, update_root: H256 },
}

// If new signed_update available:
//  - get list of all messages that have occurred since update
//  - insert list of message leaves into merkle tree
impl ProverSync {
    async fn poll_updates(&mut self) -> Result<()> {
        let mut interval = self.interval();
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

    async fn update_tree(&mut self, mut local_root: H256, new_root: H256) -> Result<()> {
        while local_root != new_root {
            let tree_size = self.prover.read().await.count();
            if let Some(leaf) = self.home.leaf_by_tree_size(tree_size).await? {
                // If new leaf exists, try to ingest
                let mut prover_write = self.prover.write().await;
                if let Err(e) = prover_write.ingest(leaf) {
                    tracing::error!("Error ingesting leaf: {}", e)
                }
                local_root = self.prover.read().await.root();
            } else {
                // If tree up to date but roots don't match, panic
                local_root = self.prover.read().await.root();
                if local_root != new_root {
                    panic!("Local tree up-to-date but root does not match update");
                }
            }
        }

        Ok(())
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}
