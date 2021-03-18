use std::{sync::Arc, time::Duration};

use async_trait::async_trait;
use color_eyre::{eyre::ensure, Result};
use ethers::{prelude::LocalWallet, signers::Signer, types::Address};
use tokio::{
    task::JoinHandle,
    time::{interval, Interval},
};

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    home::Homes,
};
use optics_core::traits::{Common, Home};

use crate::settings::Settings;

/// An updater agent
#[derive(Debug)]
pub struct Updater<S> {
    signer: Arc<S>,
    interval_seconds: u64,
    update_pause: u64,
    core: AgentCore,
}

impl<S> AsRef<AgentCore> for Updater<S> {
    fn as_ref(&self) -> &AgentCore {
        &self.core
    }
}

impl<S> Updater<S>
where
    S: Signer + 'static,
{
    /// Instantiate a new updater
    pub fn new(signer: S, interval_seconds: u64, update_pause: u64, core: AgentCore) -> Self {
        Self {
            signer: Arc::new(signer),
            interval_seconds,
            update_pause,
            core,
        }
    }

    async fn poll_and_handle_update(
        home: Arc<Homes>,
        signer: Arc<S>,
        update_pause: u64,
    ) -> Result<Option<JoinHandle<()>>> {
        // Check if there is an update
        let update_opt = home.produce_update().await?;

        // If update exists, spawn task to wait, recheck, and submit update
        if let Some(update) = update_opt {
            return Ok(Some(tokio::spawn(async move {
                interval(Duration::from_secs(update_pause)).tick().await;

                let res = tokio::join!(
                    home.queue_contains(update.new_root), 
                    home.current_root()
                );

                if let (Ok(in_queue), Ok(current_root)) = res {
                    if in_queue && current_root == update.previous_root {
                        let signed = update.sign_with(signer.as_ref()).await.unwrap();
        
                        if let Err(ref e) = home.update(&signed).await {
                            tracing::error!("Error submitting update to home: {:?}", e)
                        }
                    }
                }

            })));
        }

        Ok(None)
    }

    fn interval(&self) -> Interval {
        interval(Duration::from_secs(self.interval_seconds))
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
            settings.update_pause,
            settings.as_ref().try_into_core().await?,
        ))
    }

    fn run(&self, _replica: &str) -> JoinHandle<Result<()>> {
        // First we check that we have the correct key to sign with.
        let home = self.home();
        let address = self.signer.address();
        let mut interval = self.interval();
        let update_pause = self.update_pause;
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
                let res =
                    Self::poll_and_handle_update(home.clone(), signer.clone(), update_pause).await;

                if let Err(ref e) = res {
                    tracing::error!("Error polling and handling update: {:?}", e)
                }

                // Wait for the next tick on the interval
                interval.tick().await;
            }
        })
    }
}

#[cfg(test)]
mod test {
    use std::sync::Arc;

    use ethers::core::types::H256;
    use optics_base::home::Homes;

    use super::*;
    use optics_core::{traits::TxOutcome, SignedUpdate, Update};
    use optics_test::mocks::MockHomeContract;

    #[tokio::test]
    async fn ignores_empty_update() {
        let signer: LocalWallet =
            "1111111111111111111111111111111111111111111111111111111111111111"
                .parse()
                .unwrap();

        let mut mock_home = MockHomeContract::new();
        // home.produce_update returns Ok(None)
        mock_home
            .expect__produce_update()
            .return_once(move || Ok(None));

        // Expect home.update to NOT be called
        mock_home.expect__update().times(0).returning(|_| {
            Ok(TxOutcome {
                txid: H256::default(),
                executed: true,
            })
        });

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        Updater::poll_and_handle_update(home.clone(), Arc::new(signer), 1)
            .await
            .expect("Should have returned Ok(())");

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();
    }

    #[tokio::test]
    async fn polls_and_submits_update() {
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
        let signed_update = update.sign_with(&signer).await.expect("!sign");

        let mut mock_home = MockHomeContract::new();

        // home.produce_update called once and returns created update value
        mock_home
            .expect__produce_update()
            .times(1)
            .return_once(move || Ok(Some(update)));

        // home.queue_contains called once and returns Ok(true)
        mock_home
            .expect__queue_contains()
            .withf(move |r: &H256| *r == new_root)
            .times(1)
            .return_once(move |_| Ok(true));

        // home.current_root called once and returns Ok(previous_root)
        mock_home
            .expect__current_root()
            .times(1)
            .return_once(move || Ok(previous_root));

        // Expect home.update to be called once
        mock_home
            .expect__update()
            .withf(move |s: &SignedUpdate| *s == signed_update)
            .times(1)
            .returning(|_| {
                Ok(TxOutcome {
                    txid: H256::default(),
                    executed: true,
                })
            });

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let handle = Updater::poll_and_handle_update(home.clone(), Arc::new(signer), 1)
            .await
            .expect("poll_and_handle_update returned error")
            .expect("poll_and_handle_update should have returned Some(JoinHandle)");
            
        handle.await.expect("poll_and_handle_update join handle errored on await");

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();
    }

    #[tokio::test]
    async fn does_not_submit_update_after_bad_reorg() {
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

        let mut mock_home = MockHomeContract::new();

        // home.produce_update called once and returns created update value
        mock_home
            .expect__produce_update()
            .times(1)
            .return_once(move || Ok(Some(update)));

        // home.queue_contains called once but returns false (reorg removed new
        // root from history)
        mock_home
            .expect__queue_contains()
            .withf(move |r: &H256| *r == new_root)
            .times(1)
            .return_once(move |_| Ok(false));

        // home.current_root called once and returns Ok(previous_root)
        mock_home
            .expect__current_root()
            .times(1)
            .return_once(move || Ok(previous_root));

        // Expect home.update NOT to be called
        mock_home.expect__update().times(0).returning(|_| {
            Ok(TxOutcome {
                txid: H256::default(),
                executed: true,
            })
        });

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let handle = Updater::poll_and_handle_update(home.clone(), Arc::new(signer), 1)
            .await
            .expect("poll_and_handle_update returned error")
            .expect("poll_and_handle_update should have returned Some(JoinHandle)");
            
        handle.await.expect("poll_and_handle_update join handle errored on await");

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();
    }
}
