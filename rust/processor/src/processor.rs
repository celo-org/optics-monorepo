use async_trait::async_trait;
use color_eyre::{
    eyre::{ensure, eyre, Context},
    Result,
};
use futures_util::future::select_all;
use std::sync::Arc;
use tokio::{
    sync::{oneshot::channel, RwLock},
    time::{interval, Interval},
};

use optics_base::agent::OpticsAgent;
use optics_core::{
    accumulator::{prover_sync::ProverSync, Prover},
    traits::{Home, Replica},
};

/// A processor agent
#[derive(Debug)]
pub struct Processor {
    interval_seconds: u64,
    prover: Arc<RwLock<Prover>>,
}

#[allow(clippy::unit_arg)]
impl Processor {
    /// Instantiate a new processor
    pub fn new(interval_seconds: u64) -> Self {
        Self {
            interval_seconds,
            prover: Default::default(),
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

macro_rules! reset_loop {
    ($interval:ident) => {{
        $interval.tick().await;
        continue;
    }};
}

macro_rules! reset_loop_if {
    ($condition:expr, $interval:ident) => {
        if $condition {
            reset_loop!($interval);
        }
    };
    ($condition:expr, $interval:ident, $($arg:tt)*) => {
        if $condition {
            tracing::info!($($arg)*);
            reset_loop!($interval);
        }
    };
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Processor {
    #[tracing::instrument(err)]
    async fn run(&self, home: Arc<Box<dyn Home>>, replica: Option<Box<dyn Replica>>) -> Result<()> {
        ensure!(replica.is_some(), "Processor must have replica.");
        let replica = Arc::new(replica.unwrap());

        let domain = replica.destination_domain();

        let mut interval = self.interval();

        // The basic structure of this loop is as follows:
        // 1. Get the last processed index
        // 2. Check if the Home knows of a message above that index
        //      - If not, wait and poll again
        // 3. Check if we have a proof for that message
        //      - If not, wait and poll again
        // 4. Submit the proof to the replica
        loop {
            let last_processed = replica.last_processed().await?;
            let sequence = last_processed.as_u32() + 1;

            let message = home.message_by_sequence(domain, sequence).await?;
            reset_loop_if!(
                message.is_none(),
                interval,
                "Remote does not contain message at {}:{}",
                domain,
                sequence
            );

            let message = message.unwrap();

            // Lock is dropped immediately
            let proof_res = self.prover.read().await.prove(message.leaf_index as usize);
            reset_loop_if!(
                proof_res.is_err(),
                interval,
                "Prover does not contain leaf at index {}",
                message.leaf_index
            );

            let proof = proof_res.unwrap();
            if proof.leaf != message.message.to_leaf() {
                let err = format!("Leaf in prover does not match retrieved message. Index: {}. Retrieved: {}. Local: {}.", message.leaf_index, message.message.to_leaf(), proof.leaf);
                tracing::error!("{}", err);
                color_eyre::eyre::bail!(err);
            }

            replica.prove_and_process(message.as_ref(), &proof).await?;

            interval.tick().await;
        }
    }

    #[tracing::instrument(err)]
    async fn run_many(&self, home: Box<dyn Home>, replicas: Vec<Box<dyn Replica>>) -> Result<()> {
        let home = Arc::new(home);
        let (tx, rx) = channel();

        let sync = ProverSync::new(self.prover.clone(), home.clone(), rx);
        let sync_task = tokio::spawn(sync.poll_updates(self.interval_seconds));

        let mut futs: Vec<_> = replicas
            .into_iter()
            .map(|replica| self.run_report_error(home.clone(), Some(replica)))
            .collect();

        loop {
            // This gets the first future to resolve.
            let (res, _, remaining) = select_all(futs).await;
            if res.is_err() {
                tracing::error!("Replica shut down: {:#}", res.unwrap_err());
            }
            futs = remaining;

            // TODO: this is only checked when one of the replicas fails. We should fix that.
            if tx.is_closed() {
                return sync_task.await?.wrap_err("ProverSync task has shut down");
            }
            if futs.is_empty() {
                // We don't care if the remote is dropped, as we are shutting down anyway
                let _ = tx.send(());
                return Err(eyre!("All replicas have shut down"));
            }
        }
    }
}
