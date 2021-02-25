use async_trait::async_trait;
use color_eyre::{eyre::ensure, Result};
use ethers::{prelude::LocalWallet, signers::Signer, types::Address};
use tokio::time::{interval, Interval};

use optics_base::agent::{AgentCore, OpticsAgent};
use optics_core::{SignedUpdate, Update};

use crate::settings::Settings;

/// An updater agent
#[derive(Debug)]
pub struct Updater<S> {
    signer: S,
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
            signer,
            interval_seconds,
            core,
        }
    }

    /// Sign an update
    pub async fn sign_update(&self, update: &Update) -> Result<SignedUpdate, S::Error> {
        update.sign_with(&self.signer).await
    }

    #[doc(hidden)]
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

    async fn run(&self, _replica: &str) -> Result<()> {
        // First we check that we have the correct key to sign with.
        let home = self.home();
        let expected: Address = home.updater().await?.into();
        ensure!(
            expected == self.signer.address(),
            "Contract updater does not match keys. On-chain: {}. Local: {}",
            expected,
            self.signer.address()
        );

        // Set up the polling loop.
        let mut interval = self.interval();
        loop {
            // Check if there is an update
            let update_opt = home.produce_update().await?;

            // If there is, sign it and submit it
            if let Some(update) = update_opt {
                let signed = self.sign_update(&update).await?;
                home.update(&signed).await?;
            }

            // Wait for the next tick on the interval
            interval.tick().await;
        }
    }
}
