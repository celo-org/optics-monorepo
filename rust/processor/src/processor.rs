use async_trait::async_trait;
use color_eyre::{eyre::ensure, Result};
use std::sync::Arc;
use tokio::time::{interval, Interval};

use optics_base::agent::OpticsAgent;
use optics_core::traits::{Home, Replica};

//TODO: remove unused packages (above) and add any needed ones

/// A processor agent
#[derive(Debug)]
pub struct Processor {
    interval_seconds: u64,
}

#[allow(clippy::unit_arg)]
impl Processor {
    /// Instantiate a new processor
    pub fn new(interval_seconds: u64) -> Self {
        Self { interval_seconds }
    }

    //TODO: add: poll Replica for confirmed updates
    //TODO: add: construct a proof for confirmed updates
    //TODO: add: call proveAndProcess on the Replica

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Processor {
    #[tracing::instrument(err)]
    async fn run(&self, home: Arc<Box<dyn Home>>, replica: Option<Box<dyn Replica>>) -> Result<()> {
        ensure!(replica.is_some(), "Processor must have replica.");
        let replica = Arc::new(replica.unwrap());

        let mut interval = self.interval();
        loop {
            // TODO: poll the Replica for confirmed updates; if there are confirmed updates, construct a proof; call proveAndProcess on the replica

            interval.tick().await;
        }
    }
}
