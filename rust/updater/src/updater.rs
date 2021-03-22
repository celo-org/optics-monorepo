use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
    time::Duration,
};

use async_trait::async_trait;
use color_eyre::{
    eyre::{bail, ensure},
    Result,
};
use ethers::{prelude::LocalWallet, signers::Signer, types::Address};
use tokio::{
    sync::{mpsc, RwLock as TokioRwLock},
    task::{JoinError, JoinHandle},
    time::{interval, Interval},
};

use ethers::core::types::H256;
use optics_base::{
    agent::{AgentCore, OpticsAgent},
    history::{HistorySync, UpdateHandler},
    Homes,
};
use optics_core::{
    traits::{ChainCommunicationError, Common, DoubleUpdate, Home},
    SignedUpdate,
};

use crate::settings::Settings;

/// An updater agent
#[derive(Debug)]
pub struct Updater<S> {
    signer: Arc<S>,
    history: HashMap<H256, SignedUpdate>,
    interval_seconds: u64,
    update_pause: u64,
    core: AgentCore,
}

#[derive(Debug, thiserror::Error)]
pub enum UpdaterError {
    /// Updater sees double update during sync
    #[error("Double update found during sync!")]
    DoubleUpdateSync { double_update: DoubleUpdate },
    /// Updater receives ChainCommunicationError from chain API
    #[error(transparent)]
    ChainCommunicationError(#[from] ChainCommunicationError),
    #[error(transparent)]
    JoinError(#[from] JoinError),
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
            history: Default::default(),
            interval_seconds,
            update_pause,
            core,
        }
    }

    pub async fn build_history(
        home: Arc<Homes>,
    ) -> Result<HashMap<H256, SignedUpdate>, UpdaterError> {
        let (tx, rx) = mpsc::channel(200);
        let history = Arc::new(RwLock::new(HashMap::new()));
        let from = home.current_root().await?;

        let handler = UpdateHandler::new(rx, history.clone(), home.clone()).spawn();
        let home_sync = HistorySync::new(0, from, tx.clone(), home.clone()).spawn(); // TODO: can we use interval of 0 seconds?

        // Wait for sync to finish
        let _ = home_sync.await;
        drop(tx);

        // If double update was found during sync, return error and bail
        let handler_res = handler.await?;
        if let Ok(double_update) = handler_res {
            return Err(UpdaterError::DoubleUpdateSync { double_update });
        }

        Ok(Arc::try_unwrap(history).unwrap().into_inner().unwrap())
    }

    async fn poll_and_handle_update(
        home: Arc<Homes>,
        signer: Arc<S>,
        history: Arc<TokioRwLock<HashMap<H256, SignedUpdate>>>,
        update_pause: u64,
    ) -> Result<Option<JoinHandle<()>>> {
        // Check if there is an update
        let update_opt = home.produce_update().await?;

        // If update exists, spawn task to wait, recheck, and submit update
        if let Some(update) = update_opt {
            return Ok(Some(tokio::spawn(async move {
                interval(Duration::from_secs(update_pause)).tick().await;

                let (in_queue, current_root) =
                    tokio::join!(home.queue_contains(update.new_root), home.current_root());

                let in_queue = in_queue.unwrap();
                let current_root = current_root.unwrap();

                #[allow(clippy::map_entry)]
                let old_root = update.previous_root;
                if !history.read().await.contains_key(&old_root)
                    && in_queue
                    && current_root == old_root
                {
                    let signed = update.sign_with(signer.as_ref()).await.unwrap();

                    if let Err(ref e) = home.update(&signed).await {
                        tracing::error!("Error submitting update to home: {:?}", e)
                    }
                    history.write().await.insert(old_root, signed);
                }

                // let existing = history_write.get(&old_root).expect("!contains");
                // if existing.update.new_root != new_root {
                //     return Err(DoubleUpdate(existing.to_owned(), update.to_owned()));
                // }
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

    #[tracing::instrument]
    fn run(&self, _name: &str) -> JoinHandle<Result<()>> {
        tokio::spawn(
            async move { bail!("Updater::run should not be called. Always call run_many") },
        )
    }

    async fn run_many(&self, _replica: &[&str]) -> Result<()> {
        let home = self.home();
        let history = Arc::new(TokioRwLock::new(Self::build_history(home).await?));

        let home = self.home().clone();
        let address = self.signer.address();
        let mut interval = self.interval();
        let update_pause = self.update_pause;
        let signer = self.signer.clone();

        // tokio::spawn(async move {
        let expected: Address = home.updater().await?.into();
        ensure!(
            expected == address,
            "Contract updater does not match keys. On-chain: {}. Local: {}",
            expected,
            address
        );

        // Set up the polling loop.
        loop {
            let res = Self::poll_and_handle_update(
                home.clone(),
                signer.clone(),
                history.clone(),
                update_pause,
            )
            .await;

            if let Err(ref e) = res {
                tracing::error!("Error polling and handling update: {:?}", e)
            }

            // Wait for the next tick on the interval
            interval.tick().await;
        }
        // })
    }
}

#[cfg(test)]
mod test {
    use std::sync::Arc;

    use ethers::core::types::H256;
    use optics_base::Homes;

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
        Updater::poll_and_handle_update(home.clone(), Arc::new(signer), Default::default(), 1)
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
        let handle =
            Updater::poll_and_handle_update(home.clone(), Arc::new(signer), Default::default(), 1)
                .await
                .expect("poll_and_handle_update returned error")
                .expect("poll_and_handle_update should have returned Some(JoinHandle)");

        handle
            .await
            .expect("poll_and_handle_update join handle errored on await");

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
        let handle =
            Updater::poll_and_handle_update(home.clone(), Arc::new(signer), Default::default(), 1)
                .await
                .expect("poll_and_handle_update returned error")
                .expect("poll_and_handle_update should have returned Some(JoinHandle)");

        handle
            .await
            .expect("poll_and_handle_update join handle errored on await");

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();
    }
}
