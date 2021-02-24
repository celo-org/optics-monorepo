use async_trait::async_trait;
use color_eyre::{
    eyre::{bail, eyre},
    Result,
};
use ethers::core::types::H256;
use futures_util::future::{join_all, select_all};
use std::{collections::HashMap, sync::Arc};
use tokio::{
    sync::RwLock,
    time::{interval, Interval},
};

use optics_base::agent::{AgentCore, OpticsAgent};
use optics_core::{
    traits::{ChainCommunicationError, Common, DoubleUpdate, Home, Replica, TxOutcome},
    SignedUpdate,
};

use crate::settings::Settings;

/// A watcher agent
#[derive(Debug)]
pub struct Watcher {
    interval_seconds: u64,
    history: RwLock<HashMap<H256, SignedUpdate>>,
    core: AgentCore,
}

impl AsRef<AgentCore> for Watcher {
    fn as_ref(&self) -> &AgentCore {
        &self.core
    }
}

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

#[allow(clippy::unit_arg)]
impl Watcher {
    /// Instantiate a new watcher.
    pub fn new(interval_seconds: u64, core: AgentCore) -> Self {
        Self {
            interval_seconds,
            history: RwLock::new(HashMap::new()),
            core,
        }
    }

    /// Sync the history of the current root by querying it from the Home
    async fn crawl_history<C>(&self, contract: Arc<Box<C>>) -> Result<DoubleUpdate>
    where
        C: Common + ?Sized,
    {
        let mut interval = self.interval();

        let mut current_root = contract.current_root().await?;
        loop {
            let previous_update = contract.signed_update_by_new_root(current_root).await?;
            if previous_update.is_none() {
                break;
            }

            let previous_update = previous_update.unwrap();
            let double = self.handle_update(&previous_update).await;
            if double.is_err() {
                return Ok(double.unwrap_err());
            }

            current_root = previous_update.update.previous_root;
            if current_root.is_zero() {
                break;
            }
            interval.tick().await;
        }
        loop {
            // halt in place without ever returning
            interval.tick().await;
        }
    }

    /// Check that signed update received by Home or Replica isn't a double
    /// update. If update is new, add to local history. If update already exists
    /// in history and has a different `new_root` than the current signed
    /// update, try to submit double update proof.
    async fn handle_update(&self, signed_update: &SignedUpdate) -> Result<(), DoubleUpdate> {
        let old_root = signed_update.update.previous_root;
        let new_root = signed_update.update.new_root;

        let mut history = self.history.write().await;

        if !history.contains_key(&old_root) {
            history.insert(old_root, signed_update.to_owned());
            return Ok(());
        }

        let existing = history.get(&old_root).expect("!contains");
        if existing.update.new_root == new_root {
            Ok(())
        } else {
            Err(DoubleUpdate(existing.to_owned(), signed_update.to_owned()))
        }
    }

    /// Ensures that Replica's update is not fraudulent by submitting
    /// update to Home. `home.update` interally calls `improperUpdate` and
    /// will slash the updater if the replica's update is indeed fraudulent.
    /// If the replica is running behind the Home and receives a "fraudulent
    /// update," this will be flagged as a double update.
    async fn check_fraudulent_update(&self, update: &SignedUpdate) -> Result<()> {
        let old_root = update.update.previous_root;
        if old_root == self.home().current_root().await? {
            // It is okay if tx reverts
            self.handle_missing_update(update).await?;
        }

        Ok(())
    }

    #[tracing::instrument(err)]
    /// Polls home for signed updates and checks for double update fraud.
    async fn watch_home(&self, home: Arc<Box<dyn Home>>) -> Result<DoubleUpdate> {
        let mut interval = self.interval();

        loop {
            let update_opt = home.poll_signed_update().await?;
            reset_loop_if!(update_opt.is_none(), interval);
            let new_update = update_opt.unwrap();

            let double_update_res = self.handle_update(&new_update).await;
            reset_loop_if!(double_update_res.is_ok(), interval);

            let double = double_update_res.unwrap_err();
            // home.double_update(&double).await?;
            // color_eyre::eyre::bail!("Detected double update");

            // TODO: bubble this up and submit to ALL replicas
            // loop always resets early unless there's a double update.
            return Ok(double);
        }
    }

    /// Polls replica for signed updates and checks for both double update
    /// fraud and fraudulent updates.
    async fn watch_replica(&self, replica: Arc<Box<dyn Replica>>) -> Result<DoubleUpdate> {
        let mut interval = self.interval();

        loop {
            let update_opt = replica.poll_signed_update().await?;
            reset_loop_if!(update_opt.is_none(), interval);
            let new_update = update_opt.unwrap();

            self.check_fraudulent_update(&new_update).await?;

            let double_update_res = self.handle_update(&new_update).await;
            reset_loop_if!(double_update_res.is_ok(), interval);

            let double = double_update_res.unwrap_err();

            // TODO: bubble this up and submit to ALL replicas
            // loop always resets early unless there's a double update.
            return Ok(double);
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
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

    // Handle an update that is missing on the Home contract
    async fn handle_missing_update(
        &self,
        update: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self.core.home.update(update).await
    }

    async fn crawl_replica_history(&self, replica: &str) -> Result<DoubleUpdate> {
        let replica = self
            .replica_by_name(replica)
            .ok_or_else(|| eyre!("No replica named {}", replica))?;

        self.crawl_history(replica).await
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Watcher {
    type Settings = Settings;
    type Output = DoubleUpdate;

    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        Ok(Self::new(
            settings.polling_interval,
            settings.as_ref().try_into_core().await?,
        ))
    }

    async fn run(&self, replica: &str) -> Result<DoubleUpdate> {
        let replica = self
            .replica_by_name(replica)
            .ok_or_else(|| eyre!("No replica named {}", replica))?;

        self.watch_replica(replica).await
    }

    async fn run_many(&self, replicas: &[&str]) -> Result<()> {
        // this is a bit ugly. It is spinning up a watch and a history crawler
        // for each replica
        let mut futs: Vec<_> = replicas
            .into_iter()
            .map(|replica| {
                vec![
                    self.run_report_error(replica),
                    Box::pin(self.crawl_replica_history(replica)),
                ]
            })
            .flatten()
            .collect();

        futs.push(Box::pin(self.watch_home(self.home())));
        futs.push(Box::pin(self.crawl_history(self.home())));

        loop {
            // We get the first future to resolve
            let (res, _, remaining) = select_all(futs).await;

            match res {
                // if it's an error, just report the error and restart the loop
                Err(e) => {
                    tracing::error!("Home or replica shut down: {:#}", e);
                    futs = remaining;
                    if futs.is_empty() {
                        return Err(eyre!("Home and replicas have shut down"));
                    }
                }
                // if it's a double update, we kick off notification of
                // all replicas and homes, and break the loop
                Ok(double) => {
                    self.handle_double_update(&double)
                        .await
                        .iter()
                        .for_each(|res| tracing::info!("{:#?}", res));
                    break;
                }
            }
        }
        bail!(
            r#"
            Double update detected!
            All contracts notified!
            Watcher has been shut down!
        "#
        );
    }
}
