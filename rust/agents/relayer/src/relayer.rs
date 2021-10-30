use async_trait::async_trait;
use color_eyre::{eyre::bail, Result};
use std::{sync::Arc, time::Duration};
use tokio::{sync::Mutex, task::JoinHandle, time::sleep};
use tracing::{info, instrument::Instrumented, Instrument};

use optics_base::{AgentCore, Homes, OpticsAgent, Replicas};
use optics_core::Common;

use crate::settings::RelayerSettings as Settings;

const AGENT_NAME: &str = "relayer";

#[derive(Debug)]
struct UpdatePoller {
    duration: Duration,
    home: Arc<Homes>,
    replica: Arc<Replicas>,
    semaphore: Mutex<()>,
    updates_relayed_count: Arc<prometheus::IntCounterVec>,
}

impl std::fmt::Display for UpdatePoller {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "UpdatePoller: {{ home: {:?}, replica: {:?} }}",
            self.home, self.replica
        )
    }
}

impl UpdatePoller {
    fn new(
        home: Arc<Homes>,
        replica: Arc<Replicas>,
        duration: u64,
        updates_relayed_count: Arc<prometheus::IntCounterVec>,
    ) -> Self {
        Self {
            home,
            replica,
            duration: Duration::from_secs(duration),
            semaphore: Mutex::new(()),
            updates_relayed_count,
        }
    }

    #[tracing::instrument(err, skip(self), fields(self = %self))]
    async fn poll_and_relay_update(&self) -> Result<()> {
        // Get replica's current root.
        let old_root = self.replica.committed_root().await?;
        info!(
            "Replica {} latest root is: {}",
            self.replica.name(),
            old_root
        );

        // Check for first signed update building off of the replica's current root
        let signed_update_opt = self.home.signed_update_by_old_root(old_root).await?;

        // If signed update exists for replica's committed root, try to
        // relay
        if let Some(signed_update) = signed_update_opt {
            info!(
                "Update for replica {}. Root {} to {}",
                self.replica.name(),
                &signed_update.update.previous_root,
                &signed_update.update.new_root,
            );

            // Attempt to acquire lock for submitting tx
            let lock = self.semaphore.try_lock();
            if lock.is_err() {
                return Ok(()); // tx in flight. just do nothing
            }

            // Relay update and increment counters if tx successful
            if self.replica.update(&signed_update).await.is_ok() {
                self.updates_relayed_count
                    .with_label_values(&[self.home.name(), self.replica.name(), AGENT_NAME])
                    .inc();
            }

            // lock dropped here
        } else {
            info!(
                "No update. Current root for replica {} is {}",
                self.replica.name(),
                old_root
            );
        }

        Ok(())
    }

    fn spawn(self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            loop {
                self.poll_and_relay_update().await?;
                sleep(self.duration).await;
            }
        })
    }
}

/// A relayer agent
#[derive(Debug)]
pub struct Relayer {
    duration: u64,
    core: AgentCore,
    updates_relayed_count: Arc<prometheus::IntCounterVec>,
}

impl AsRef<AgentCore> for Relayer {
    fn as_ref(&self) -> &AgentCore {
        &self.core
    }
}

#[allow(clippy::unit_arg)]
impl Relayer {
    /// Instantiate a new relayer
    pub fn new(duration: u64, core: AgentCore) -> Self {
        let updates_relayed_count = Arc::new(
            core.metrics
                .new_int_counter(
                    "updates_relayed_count",
                    "Number of updates relayed from given home to replica",
                    &["home", "replica", "agent"],
                )
                .expect("processor metric already registered -- should have be a singleton"),
        );

        Self {
            duration,
            core,
            updates_relayed_count,
        }
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Relayer {
    const AGENT_NAME: &'static str = "relayer";

    type Settings = Settings;

    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        Ok(Self::new(
            settings.interval.parse().expect("invalid uint"),
            settings.as_ref().try_into_core("relayer").await?,
        ))
    }

    #[tracing::instrument]
    fn run(&self, name: &str) -> Instrumented<JoinHandle<Result<()>>> {
        let replica_opt = self.replica_by_name(name);
        let home = self.home();
        let updates_relayed_count = self.updates_relayed_count.clone();

        let name = name.to_owned();
        let duration = self.duration;

        tokio::spawn(async move {
            if replica_opt.is_none() {
                bail!("No replica named {}", name);
            }
            let replica = replica_opt.unwrap();

            let update_poller =
                UpdatePoller::new(home, replica.clone(), duration, updates_relayed_count);
            update_poller.spawn().await?
        })
        .in_current_span()
    }
}

#[cfg(test)]
mod test {}
