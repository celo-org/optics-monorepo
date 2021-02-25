use async_trait::async_trait;
use color_eyre::{
    eyre::{eyre, Context},
    Result,
};
use futures_util::future::select_all;
use std::sync::Arc;
use tokio::{
    sync::{oneshot::channel, RwLock},
    time::{interval, Interval},
};

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    decl_agent, reset_loop_if,
};
use optics_core::accumulator::{prover_sync::ProverSync, Prover};

use crate::settings::Settings;

decl_agent!(
    /// A processor agent
    Processor {
        interval_seconds: u64,
        prover: Arc<RwLock<Prover>>,
    }
);

impl Processor {
    /// Instantiate a new processor
    pub fn new(interval_seconds: u64, core: AgentCore) -> Self {
        Self {
            interval_seconds,
            prover: Default::default(),
            core,
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Processor {
    type Settings = Settings;

    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        Ok(Self::new(
            settings.polling_interval,
            settings.as_ref().try_into_core().await?,
        ))
    }

    #[tracing::instrument(err)]
    async fn run(&self, replica: &str) -> Result<()> {
        let replica = self
            .replica_by_name(replica)
            .ok_or_else(|| eyre!("No replica named {}", replica))?;
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

            let message = self.home().message_by_sequence(domain, sequence).await?;
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
    async fn run_many(&self, replicas: &[&str]) -> Result<()> {
        // let replicas: Vec<_> = replicas
        //     .iter()
        //     .filter_map(|name| self.replica_by_name(name))
        //     .collect();

        let (tx, rx) = channel();

        let sync = ProverSync::new(self.prover.clone(), self.home(), rx);
        let sync_task = tokio::spawn(sync.poll_updates(self.interval_seconds));

        let mut futs: Vec<_> = replicas
            .into_iter()
            .map(|replica| self.run_report_error(replica))
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
