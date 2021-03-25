use async_trait::async_trait;
use color_eyre::{
    eyre::{bail, eyre},
    Report, Result,
};
use thiserror::Error;

use ethers::core::types::H256;
use futures_util::future::join_all;
use rocksdb::DB;
use std::{collections::HashMap, sync::Arc};
use tokio::{
    sync::{mpsc, RwLock},
    task::JoinHandle,
    time::{interval, Interval},
};

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    cancel_task, decl_agent,
    home::Homes,
    utils,
};
use optics_core::{
    traits::{ChainCommunicationError, Common, DoubleUpdate, TxOutcome},
    SignedUpdate,
};

use crate::settings::Settings;

#[derive(Debug, Error)]
enum WatcherError {
    #[error("Syncing finished")]
    SyncingFinished,
}

#[derive(Debug)]
pub struct ContractWatcher<C>
where
    C: Common + ?Sized + 'static,
{
    interval_seconds: u64,
    current_root: H256,
    tx: mpsc::Sender<SignedUpdate>,
    contract: Arc<C>,
}

impl<C> ContractWatcher<C>
where
    C: Common + ?Sized + 'static,
{
    pub fn new(
        interval_seconds: u64,
        from: H256,
        tx: mpsc::Sender<SignedUpdate>,
        contract: Arc<C>,
    ) -> Self {
        Self {
            interval_seconds,
            current_root: from,
            tx,
            contract,
        }
    }

    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }

    async fn poll_and_send_update(&mut self) -> Result<()> {
        let update_opt = self
            .contract
            .signed_update_by_old_root(self.current_root)
            .await?;

        if update_opt.is_none() {
            return Ok(());
        }

        let new_update = update_opt.unwrap();
        self.current_root = new_update.update.new_root;

        self.tx.send(new_update).await?;
        Ok(())
    }

    #[tracing::instrument]
    fn spawn(mut self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            let mut interval = self.interval();

            loop {
                self.poll_and_send_update().await?;
                interval.tick().await;
            }
        })
    }
}

#[derive(Debug)]
pub struct HistorySync<C>
where
    C: Common + ?Sized + 'static,
{
    interval_seconds: u64,
    current_root: H256,
    tx: mpsc::Sender<SignedUpdate>,
    contract: Arc<C>,
}

impl<C> HistorySync<C>
where
    C: Common + ?Sized + 'static,
{
    pub fn new(
        interval_seconds: u64,
        from: H256,
        tx: mpsc::Sender<SignedUpdate>,
        contract: Arc<C>,
    ) -> Self {
        Self {
            current_root: from,
            tx,
            contract,
            interval_seconds,
        }
    }

    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }

    async fn update_history(&mut self) -> Result<()> {
        let previous_update = self
            .contract
            .signed_update_by_new_root(self.current_root)
            .await?;

        if previous_update.is_none() {
            // Task finished
            return Err(Report::new(WatcherError::SyncingFinished));
        }

        // Dispatch to the handler
        let previous_update = previous_update.unwrap();

        // set up for next loop iteration
        self.current_root = previous_update.update.previous_root;
        self.tx.send(previous_update).await?;
        if self.current_root.is_zero() {
            // Task finished
            return Err(Report::new(WatcherError::SyncingFinished));
        }

        Ok(())
    }

    #[tracing::instrument]
    fn spawn(mut self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            let mut interval = self.interval();

            loop {
                let res = self.update_history().await;
                if res.is_err() {
                    // Syncing done
                    break;
                }

                interval.tick().await;
            }

            Ok(())
        })
    }
}

#[derive(Debug)]
pub struct UpdateHandler {
    rx: mpsc::Receiver<SignedUpdate>,
    db: Arc<DB>,
    home: Arc<Homes>,
}

impl UpdateHandler {
    pub fn new(rx: mpsc::Receiver<SignedUpdate>, db: Arc<DB>, home: Arc<Homes>) -> Self {
        Self { rx, db, home }
    }

    fn check_double_update(&mut self, update: &SignedUpdate) -> Result<(), DoubleUpdate> {
        let old_root = update.update.previous_root;
        let new_root = update.update.new_root;

        let existing = self
            .db
            .get(old_root)
            .expect("Error fetching update from db");

        match existing {
            Some(existing_bytes) => {
                let existing: SignedUpdate = bincode::deserialize(existing_bytes.as_ref())
                    .expect("Failed to deserialize existing update");

                if existing.update.new_root != new_root {
                    return Err(DoubleUpdate(existing, update.to_owned()));
                }
            }
            None => {
                self.db
                    .put(old_root, bincode::serialize(update).unwrap())
                    .expect("Failed to insert new update into db");
                return Ok(());
            }
        }

        Ok(())
    }

    #[tracing::instrument]
    fn spawn(mut self) -> JoinHandle<Result<DoubleUpdate>> {
        tokio::spawn(async move {
            loop {
                let update = self.rx.recv().await;
                // channel is closed
                if update.is_none() {
                    bail!("Channel closed.")
                }

                let update = update.unwrap();
                let old_root = update.update.previous_root;

                if old_root == self.home.current_root().await? {
                    // It is okay if tx reverts
                    let _ = self.home.update(&update).await;
                }

                if let Err(double_update) = self.check_double_update(&update) {
                    return Ok(double_update);
                }
            }
        })
    }
}

decl_agent!(
    /// A watcher agent
    Watcher {
        interval_seconds: u64,
        db: Arc<DB>,
        sync_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
        watch_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
    }
);

#[allow(clippy::unit_arg)]
impl Watcher {
    /// Instantiate a new watcher.
    pub fn new(interval_seconds: u64, db_path: String, core: AgentCore) -> Self {
        Self {
            interval_seconds,
            db: Arc::new(utils::open_db(db_path)),
            core,
            sync_tasks: Default::default(),
            watch_tasks: Default::default(),
        }
    }

    async fn shutdown(&self) {
        for (_, v) in self.watch_tasks.write().await.drain() {
            cancel_task!(v);
        }
        for (_, v) in self.sync_tasks.write().await.drain() {
            cancel_task!(v);
        }
    }

    // Handle a double-update once it has been detected.
    #[tracing::instrument]
    async fn handle_double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Vec<Result<TxOutcome, ChainCommunicationError>> {
        tracing::info!(
            "Dispatching double-update notifications to home and {} replicas",
            self.replicas().len()
        );

        let mut futs: Vec<_> = self
            .replicas()
            .values()
            .map(|replica| replica.double_update(&double))
            .collect();
        futs.push(self.core.home.double_update(double));
        join_all(futs).await
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Watcher {
    type Settings = Settings;

    #[tracing::instrument(err)]
    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        Ok(Self::new(
            settings.polling_interval,
            settings.db_path.clone(),
            settings.as_ref().try_into_core().await?,
        ))
    }

    #[tracing::instrument]
    fn run(&self, _name: &str) -> JoinHandle<Result<()>> {
        tokio::spawn(
            async move { bail!("Watcher::run should not be called. Always call run_many") },
        )
    }

    #[tracing::instrument(err)]
    async fn run_many(&self, replicas: &[&str]) -> Result<()> {
        let (tx, rx) = mpsc::channel(200);
        let handler = UpdateHandler::new(rx, self.db.clone(), self.home()).spawn();

        for name in replicas.iter() {
            let replica = self
                .replica_by_name(name)
                .ok_or_else(|| eyre!("No replica named {}", name))?;
            let from = replica.current_root().await?;

            self.watch_tasks.write().await.insert(
                (*name).to_owned(),
                ContractWatcher::new(self.interval_seconds, from, tx.clone(), replica.clone())
                    .spawn(),
            );
            self.sync_tasks.write().await.insert(
                (*name).to_owned(),
                HistorySync::new(self.interval_seconds, from, tx.clone(), replica).spawn(),
            );
        }

        let home = self.home();
        let from = home.current_root().await?;

        let home_watcher =
            ContractWatcher::new(self.interval_seconds, from, tx.clone(), home.clone()).spawn();
        let home_sync = HistorySync::new(self.interval_seconds, from, tx.clone(), home).spawn();

        let join_result = handler.await;

        tracing::info!("Update handler has resolved. Cancelling all other tasks");
        cancel_task!(home_watcher);
        cancel_task!(home_sync);
        self.shutdown().await;

        let res = join_result??;

        tracing::error!("Double update detected! Notifying all contracts!");
        self.handle_double_update(&res)
            .await
            .iter()
            .for_each(|res| tracing::info!("{:#?}", res));
        bail!(
            r#"
            Double update detected!
            All contracts notified!
            Watcher has been shut down!
        "#
        )
    }
}

#[cfg(test)]
mod test {
    use std::sync::Arc;
    use tokio::sync::mpsc;

    use ethers::core::types::H256;
    use ethers::signers::LocalWallet;
    use rocksdb::{Options, DB};

    use optics_base::utils;
    use optics_core::{traits::DoubleUpdate, Update};
    use optics_test::{mocks::MockHomeContract, test_utils};

    use super::*;

    #[tokio::test]
    async fn contract_watcher_polls_and_sends_update() {
        let signer: LocalWallet =
            "1111111111111111111111111111111111111111111111111111111111111111"
                .parse()
                .unwrap();

        let first_root = H256::from([1; 32]);
        let second_root = H256::from([2; 32]);

        let signed_update = Update {
            origin_domain: 1,
            previous_root: first_root,
            new_root: second_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        let mut mock_home = MockHomeContract::new();
        {
            let signed_update = signed_update.clone();
            // home.signed_update_by_old_root called once and
            // returns mock value signed_update when called with first_root
            mock_home
                .expect__signed_update_by_old_root()
                .withf(move |r: &H256| *r == first_root)
                .times(1)
                .return_once(move |_| Ok(Some(signed_update)));
        }

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let (tx, mut rx) = mpsc::channel(200);
        {
            let mut contract_watcher =
                ContractWatcher::new(3, first_root, tx.clone(), home.clone());

            contract_watcher
                .poll_and_send_update()
                .await
                .expect("Should have received Ok(())");

            assert_eq!(contract_watcher.current_root, second_root);
            assert_eq!(rx.recv().await.unwrap(), signed_update);
        }

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();
    }

    #[tokio::test]
    async fn history_sync_updates_history() {
        let signer: LocalWallet =
            "1111111111111111111111111111111111111111111111111111111111111111"
                .parse()
                .unwrap();

        let zero_root = H256::zero(); // Original zero root
        let first_root = H256::from([1; 32]);
        let second_root = H256::from([2; 32]);

        // Zero root to first root
        let first_signed_update = Update {
            origin_domain: 1,
            previous_root: zero_root,
            new_root: first_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        // First root to second root
        let second_signed_update = Update {
            origin_domain: 1,
            previous_root: first_root,
            new_root: second_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        let mut mock_home = MockHomeContract::new();
        {
            let first_signed_update = first_signed_update.clone();
            let second_signed_update = second_signed_update.clone();
            // home.signed_update_by_new_root called once with second_root
            // and returns mock value second_signed_update
            mock_home
                .expect__signed_update_by_new_root()
                .withf(move |r: &H256| *r == second_root)
                .times(1)
                .return_once(move |_| Ok(Some(second_signed_update)));
            // home.signed_update_by_new_root called once with first_root
            // and returns mock value first_signed_update
            mock_home
                .expect__signed_update_by_new_root()
                .withf(move |r: &H256| *r == first_root)
                .times(1)
                .return_once(move |_| Ok(Some(first_signed_update)));
        }

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let (tx, mut rx) = mpsc::channel(200);
        {
            let mut history_sync = HistorySync::new(3, second_root, tx.clone(), home.clone());

            // First update_history call returns first -> second update
            history_sync
                .update_history()
                .await
                .expect("Should have received Ok(())");

            assert_eq!(history_sync.current_root, first_root);
            assert_eq!(rx.recv().await.unwrap(), second_signed_update);

            // Second update_history call returns zero -> first update
            // and should return WatcherError::SyncingFinished
            history_sync
                .update_history()
                .await
                .expect_err("Should have received WatcherError::SyncingFinished");

            assert_eq!(history_sync.current_root, zero_root);
            assert_eq!(rx.recv().await.unwrap(), first_signed_update)
        }

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();
    }

    #[tokio::test]
    async fn update_handler_detects_double_update() {
        test_utils::run_test_db(|db| async move {
            let signer: LocalWallet =
                "1111111111111111111111111111111111111111111111111111111111111111"
                    .parse()
                    .unwrap();

            let first_root = H256::from([1; 32]);
            let second_root = H256::from([2; 32]);
            let third_root = H256::from([3; 32]);
            let bad_third_root = H256::from([4; 32]);

            let first_update = Update {
                origin_domain: 1,
                previous_root: first_root,
                new_root: second_root,
            }
            .sign_with(&signer)
            .await
            .expect("!sign");

            let second_update = Update {
                origin_domain: 1,
                previous_root: second_root,
                new_root: third_root,
            }
            .sign_with(&signer)
            .await
            .expect("!sign");

            let bad_second_update = Update {
                origin_domain: 1,
                previous_root: second_root,
                new_root: bad_third_root,
            }
            .sign_with(&signer)
            .await
            .expect("!sign");

            {
                let (_tx, rx) = mpsc::channel(200);
                let mut handler = UpdateHandler {
                    rx,
                    db: Arc::new(db),
                    home: Arc::new(MockHomeContract::new().into()),
                };

                let _first_update_ret = handler
                    .check_double_update(&first_update)
                    .expect("Update should have been valid");

                let _second_update_ret = handler
                    .check_double_update(&second_update)
                    .expect("Update should have been valid");

                let bad_second_update_ret = handler
                    .check_double_update(&bad_second_update)
                    .expect_err("Update should have been invalid");
                assert_eq!(
                    bad_second_update_ret,
                    DoubleUpdate(second_update, bad_second_update)
                );
            }
        })
        .await
    }
}
