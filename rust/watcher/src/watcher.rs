use async_trait::async_trait;
use color_eyre::{
    eyre::{bail, eyre},
    Result,
};

use ethers::core::types::H256;
use futures_util::future::join_all;
use std::{collections::HashMap, sync::Arc};
use tokio::{
    sync::{mpsc, RwLock},
    task::JoinHandle,
    time::{interval, Interval},
};

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    cancel_task, decl_agent,
    history::{HistorySync, UpdateHandler},
};
use optics_core::{
    traits::{ChainCommunicationError, Common, DoubleUpdate, TxOutcome},
    SignedUpdate,
};

use crate::settings::Settings;

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

decl_agent!(
    /// A watcher agent
    Watcher {
        interval_seconds: u64,
        sync_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
        watch_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
    }
);

#[allow(clippy::unit_arg)]
impl Watcher {
    /// Instantiate a new watcher.
    pub fn new(interval_seconds: u64, core: AgentCore) -> Self {
        Self {
            interval_seconds,
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
        let handler = UpdateHandler::new(rx, Default::default(), self.home()).spawn();

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

    use optics_base::Homes;
    use optics_core::Update;
    use optics_test::mocks::MockHomeContract;

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
}
