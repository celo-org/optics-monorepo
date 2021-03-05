use std::sync::Arc;

use async_trait::async_trait;
use color_eyre::{eyre::ensure, Result};
use ethers::{prelude::LocalWallet, signers::Signer, types::Address};
use tokio::{
    task::JoinHandle,
    time::{interval, Interval},
};

use optics_base::agent::{AgentCore, OpticsAgent};
use optics_core::traits::{Common, Home};

use crate::settings::Settings;

/// An updater agent
#[derive(Debug)]
pub struct Updater<S> {
    signer: Arc<S>,
    interval_seconds: u64,
    core: AgentCore,
}

impl<S> AsRef<AgentCore> for Updater<S> {
    fn as_ref(&self) -> &AgentCore {
        &self.core
    }
}

impl<S> Updater<S>
where
    S: Signer,
{
    /// Instantiate a new updater
    pub fn new(signer: S, interval_seconds: u64, core: AgentCore) -> Self {
        Self {
            signer: Arc::new(signer),
            interval_seconds,
            core,
        }
    }

    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
// This is a bit of a kludge to make from_settings work.
// Ideally this hould be generic across all signers.
// Right now we only have one
impl OpticsAgent for Updater<LocalWallet> {
    type Settings = Settings;

    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        Ok(Self::new(
            settings.updater.try_into_wallet()?,
            settings.polling_interval,
            settings.as_ref().try_into_core().await?,
        ))
    }

    fn run(&self, _replica: &str) -> JoinHandle<Result<()>> {
        // First we check that we have the correct key to sign with.
        let home = self.home();
        let address = self.signer.address();
        let mut interval = self.interval();
        let signer = self.signer.clone();

        tokio::spawn(async move {
            let expected: Address = home.updater().await?.into();
            ensure!(
                expected == address,
                "Contract updater does not match keys. On-chain: {}. Local: {}",
                expected,
                address
            );

            // Set up the polling loop.
            loop {
                // Check if there is an update
                let update_opt = home.produce_update().await?;

                // If there is, sign it and submit it
                if let Some(update) = update_opt {
                    let signed = update.sign_with(signer.as_ref()).await?;
                    home.update(&signed).await?;
                }

                // Wait for the next tick on the interval
                interval.tick().await;
            }
        })
    }
}
