use async_trait::async_trait;
use color_eyre::{eyre::eyre, Result};
use std::sync::Arc;
use tokio::{
    task::JoinHandle,
    time::{interval, Interval},
};

use optics_base::agent::{AgentCore, OpticsAgent};
use optics_core::traits::{Home, Replica};

use crate::settings::Settings;

/// A relayer agent
#[derive(Debug)]
pub struct Relayer {
    interval_seconds: u64,
    core: AgentCore,
}

impl AsRef<AgentCore> for Relayer {
    fn as_ref(&self) -> &AgentCore {
        &self.core
    }
}

#[allow(clippy::unit_arg)]
impl Relayer {
    /// Instantiate a new relayer
    pub fn new(interval_seconds: u64, core: AgentCore) -> Self {
        Self {
            interval_seconds,
            core,
        }
    }

    #[tracing::instrument(err)]
    async fn poll_updates(home: Arc<Box<dyn Home>>, replica: Arc<Box<dyn Replica>>) -> Result<()> {
        // Get replica's current root
        let old_root = replica.current_root().await?;

        // Check for first signed update building off of the replica's current root
        let signed_update_opt = home.signed_update_by_old_root(old_root).await?;

        // If signed update exists, update replica's current root
        if let Some(signed_update) = signed_update_opt {
            replica.update(&signed_update).await?;
        }

        Ok(())
    }

    #[tracing::instrument(err)]
    async fn poll_confirms(replica: Arc<Box<dyn Replica>>) -> Result<()> {
        // Check for pending update that can be confirmed
        let can_confirm = replica.can_confirm().await?;

        // If valid pending update exists, confirm it
        if can_confirm {
            replica.confirm().await?;
        }

        Ok(())
    }

    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Relayer {
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

    #[tracing::instrument]
    fn run(&self, name: &str) -> JoinHandle<Result<()>> {
        let replica_opt = self.replica_by_name(name);
        let home = self.home();
        let mut interval = self.interval();
        let name = name.to_owned();

        tokio::spawn(async move {
            let replica = replica_opt.ok_or_else(|| eyre!("No replica named {}", name))?;

            loop {
                let (updated, confirmed) = tokio::join!(
                    Self::poll_updates(home.clone(), replica.clone()),
                    Self::poll_confirms(replica.clone())
                );

                if let Err(ref e) = updated {
                    tracing::error!("Error polling updates: {:?}", e)
                }
                if let Err(ref e) = confirmed {
                    tracing::error!("Error polling confirms: {:?}", e)
                }
                updated?;
                confirmed?;
                interval.tick().await;
            }
        })
    }
}
