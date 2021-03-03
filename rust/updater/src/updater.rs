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

impl Updater<LocalWallet> {
    async fn poll_and_handle_update(&self) -> Result<()> {
        // Check if there is an update
        let update_opt = self.as_ref().home.produce_update().await?;

        // If there is, sign it and submit it
        if let Some(update) = update_opt {
            let signed = self.sign_update(&update).await?;
            self.as_ref().home.update(&signed).await?;
        }

        Ok(())
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
            self.poll_and_handle_update().await?;
            interval.tick().await;
        }
    }
}

#[cfg(test)]
mod test {
    use std::{collections::HashMap, sync::Arc};

    use ethers::core::types::H256;

    use super::*;
    use optics_core::{traits::Home, Update};
    use optics_test::mocks::MockHomeContract;

    #[tokio::test]
    async fn polls_and_signs_update() {
        let signer: LocalWallet =
            "1111111111111111111111111111111111111111111111111111111111111111"
                .parse()
                .unwrap();

        let previous_root = H256::from([1; 32]);
        let new_root = H256::from([2; 32]);

        let update = Update {
            origin_domain: 0,
            previous_root,
            new_root,
        };

        let signed_update = update.sign_with(&signer).await;

        // *** NEED Arc<Box<MockHomeContract>> ***
        let mut mock_home = MockHomeContract::new();

        // home.update returns created update value
        mock_home
            .expect__produce_update()
            .return_once(move || Ok(Some(update)));
        // Expect home.update to be called once
        mock_home.expect__update().times(1);

        let mut home: Arc<Box<dyn Home>> = Arc::new(Box::new(mock_home));
        {
            let agent_core = AgentCore {
                home: home.clone(),
                replicas: HashMap::new(),
            };
            let updater = Updater::new(signer, 3, agent_core);

            updater
                .poll_and_handle_update()
                .await
                .expect("Should have returned Ok(())");
        }

        let boxed = Arc::get_mut(&mut home).unwrap();
        let mock_home: &mut MockHomeContract = boxed.as_mut().as_mut_any().downcast_mut().unwrap();
        // *** NEED Arc<Box<MockHomeContract>> ***
        mock_home.checkpoint();
    }
}
