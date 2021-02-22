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

//TODO: remove unused packages (above) and add any needed ones

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

macro_rules! reset_loop_if {
    ($condition:expr, $interval:ident) => {
        if $condition {
            $interval.tick().await;
            continue;
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
        loop {
            let last_processed = replica.last_processed().await?;
            let index = last_processed.as_usize() + 1;

            let message = home
                .message_by_sequence(domain, last_processed.as_u32())
                .await?;
            reset_loop_if!(message.is_none(), interval);

            let message = message.unwrap();
            let proof_res = self.prover.read().await.prove(index);
            reset_loop_if!(proof_res.is_err(), interval);

            let proof = proof_res.unwrap();
            replica.prove_and_process(&message, &proof).await?;

            // TODO: poll the Replica for confirmed updates; if there are confirmed updates, construct a proof; call proveAndProcess on the replica

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

            // TODO:
            if tx.is_closed() {
                return sync_task.await?.wrap_err("ProverSync task has shut down");
            }
            if futs.is_empty() {
                // TODO: is this a race condition?
                tx.send(()).expect("!closed");
                return Err(eyre!("All replicas have shut down"));
            }
        }
    }
}
