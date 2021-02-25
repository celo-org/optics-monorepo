use async_trait::async_trait;
use color_eyre::{
    eyre::{bail, eyre},
    Result,
};
use ethers::core::types::H256;
use futures_util::future::join_all;
use std::{collections::HashMap, sync::Arc};
use tokio::{
    sync::{
        mpsc::{self},
        RwLock,
    },
    task::JoinHandle,
    time::{interval, Interval},
};

use optics_base::agent::{AgentCore, OpticsAgent};
use optics_core::{
    traits::{ChainCommunicationError, Common, DoubleUpdate, Home, TxOutcome},
    SignedUpdate,
};

use crate::settings::Settings;

macro_rules! reset_loop {
    ($interval:ident) => {{
        $interval.tick().await;
        continue;
    }};
}

macro_rules! reset_loop_if {
    ($condition:expr, $interval:ident) => {
        if $condition {
            reset_loop!($interval);
        }
    };
    ($condition:expr, $interval:ident, $($arg:tt)*) => {
        if $condition {
            tracing::info!($($arg)*);
            reset_loop!($interval);
        }
    };
}

#[derive(Debug)]
pub struct ContractWatcher<C>
where
    C: Common + ?Sized + 'static,
{
    interval_seconds: u64,
    tx: mpsc::Sender<SignedUpdate>,
    contract: Arc<Box<C>>,
}

impl<C> ContractWatcher<C>
where
    C: Common + ?Sized + 'static,
{
    pub fn new(
        interval_seconds: u64,
        tx: mpsc::Sender<SignedUpdate>,
        contract: Arc<Box<C>>,
    ) -> Self {
        Self {
            interval_seconds,
            tx,
            contract,
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }

    #[tracing::instrument]
    fn spawn(self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            let mut interval = self.interval();

            loop {
                let update_opt = self.contract.poll_signed_update().await?;
                reset_loop_if!(update_opt.is_none(), interval);
                let new_update = update_opt.unwrap();
                self.tx.send(new_update).await?;
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
    tx: mpsc::Sender<SignedUpdate>,
    contract: Arc<Box<C>>,
}

impl<C> HistorySync<C>
where
    C: Common + ?Sized + 'static,
{
    pub fn new(
        interval_seconds: u64,
        tx: mpsc::Sender<SignedUpdate>,
        contract: Arc<Box<C>>,
    ) -> Self {
        Self {
            tx,
            contract,
            interval_seconds,
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }

    fn spawn(self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            let mut interval = self.interval();

            let mut current_root = self.contract.current_root().await?;
            loop {
                let previous_update = self
                    .contract
                    .signed_update_by_new_root(current_root)
                    .await?;
                if previous_update.is_none() {
                    // Task finished
                    break;
                }

                // Dispatch to the handler
                let previous_update = previous_update.unwrap();

                // set up for next loop iteration
                current_root = previous_update.update.previous_root;
                self.tx.send(previous_update).await?;
                if current_root.is_zero() {
                    // Task finished
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
    history: HashMap<H256, SignedUpdate>,
    home: Arc<Box<dyn Home>>,
}

impl UpdateHandler {
    pub fn new(
        rx: mpsc::Receiver<SignedUpdate>,
        history: HashMap<H256, SignedUpdate>,
        home: Arc<Box<dyn Home>>,
    ) -> Self {
        Self { rx, history, home }
    }

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
                let new_root = update.update.new_root;

                if old_root == self.home.current_root().await? {
                    // It is okay if tx reverts
                    let _ = self.home.update(&update).await;
                }

                if !self.history.contains_key(&old_root) {
                    self.history.insert(old_root, update.to_owned());
                    continue;
                }

                let existing = self.history.get(&old_root).expect("!contains");
                if existing.update.new_root != new_root {
                    return Ok(DoubleUpdate(existing.to_owned(), update.to_owned()));
                }
            }
        })
    }
}

/// A watcher agent
#[derive(Debug)]
pub struct Watcher {
    interval_seconds: u64,
    sync_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
    watch_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
    core: AgentCore,
}

impl AsRef<AgentCore> for Watcher {
    fn as_ref(&self) -> &AgentCore {
        &self.core
    }
}

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
        self.watch_tasks
            .write()
            .await
            .drain()
            .for_each(|(_, v)| v.abort());

        self.sync_tasks
            .write()
            .await
            .drain()
            .for_each(|(_, v)| v.abort());
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

    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        Ok(Self::new(
            settings.polling_interval,
            settings.as_ref().try_into_core().await?,
        ))
    }

    async fn run(&self, _name: &str) -> Result<()> {
        panic!("Watcher::run should not be called. Always call run_many");
    }

    async fn run_many(&self, replicas: &[&str]) -> Result<()> {
        let (tx, rx) = mpsc::channel(200);
        let handler = UpdateHandler::new(rx, Default::default(), self.home()).spawn();

        for name in replicas.into_iter() {
            let replica = self
                .replica_by_name(name)
                .ok_or_else(|| eyre!("No replica named {}", name))?;

            self.watch_tasks.write().await.insert(
                (*name).to_owned(),
                ContractWatcher::new(self.interval_seconds, tx.clone(), replica.clone()).spawn(),
            );
            self.sync_tasks.write().await.insert(
                (*name).to_owned(),
                HistorySync::new(self.interval_seconds, tx.clone(), replica).spawn(),
            );
        }

        let home_watcher =
            ContractWatcher::new(self.interval_seconds, tx.clone(), self.home()).spawn();
        let home_sync = HistorySync::new(self.interval_seconds, tx.clone(), self.home()).spawn();

        let join_result = handler.await;
        tracing::info!("Update handler has resolved. Cancelling all other tasks");
        home_watcher.abort();
        home_sync.abort();
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
