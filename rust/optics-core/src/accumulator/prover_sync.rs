use crate::{accumulator::{prover::{Prover}}, traits::{Home}};
use std::{sync::Arc};
use tokio::{sync::{RwLock, oneshot::{Receiver, error::TryRecvError}}, time::{interval, Interval}};
use color_eyre::{Result};

pub struct ProverSync {
    prover: Arc<RwLock<Prover>>,
    home: Arc<Box<dyn Home>>,
    interval_seconds: u64,
    rx: Receiver<()>,
}

// If new signed_update available:
//  - get list of all messages that have occurred since update
//  - insert list of message leaves into merkle tree
impl ProverSync {
    async fn poll_updates(&mut self) -> Result<()> {
        let mut interval = self.interval();
        loop {
            if let Some(signed_update) = self.home.poll_signed_update().await? {
                let leaves = self.home.leaves_by_root(signed_update.update.previous_root).await?;

                let prover_write = self.prover.write().await;
                // insert leaves into merkle tree (need global counter in Home to ensure proper ordering?)
            }

            if let Err(TryRecvError::Closed) = self.rx.try_recv() {
                break;
            }
            interval.tick().await;
        }

        Ok(())
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}