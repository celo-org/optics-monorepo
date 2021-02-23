use async_trait::async_trait;
use color_eyre::{
    eyre::{ensure, eyre},
    Result,
};
use ethers::core::types::H256;
use futures_util::future::{join_all, select_all};
use std::{collections::HashMap, sync::Arc};
use tokio::{
    sync::RwLock,
    time::{interval, Interval},
};

use optics_base::agent::OpticsAgent;
use optics_core::{
    traits::{DoubleUpdate, Home, Replica},
    SignedUpdate,
};

/// A watcher agent
#[derive(Debug)]
pub struct Watcher {
    interval_seconds: u64,
    history: RwLock<HashMap<H256, SignedUpdate>>,
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
    pub fn new(interval_seconds: u64) -> Self {
        Self {
            interval_seconds,
            history: RwLock::new(HashMap::new()),
        }
    }

    /// Check that signed update received by Home or Replica isn't a double
    /// update. If update is new, add to local history. If update already exists
    /// in history and has a different `new_root` than the current signed
    /// update, try to submit double update proof.
    async fn check_double_update(&self, signed_update: &SignedUpdate) -> Result<(), DoubleUpdate> {
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
    async fn check_fraudulent_update(
        &self,
        home: &Arc<Box<dyn Home>>,
        signed_update: &SignedUpdate,
    ) -> Result<()> {
        let old_root = signed_update.update.previous_root;
        if old_root == home.current_root().await? {
            // It is okay if tx reverts
            let _ = home.update(signed_update).await;
        }

        Ok(())
    }

    #[tracing::instrument(err)]
    /// Polls home for signed updates and checks for double update fraud.
    async fn watch_home(&self, home: Arc<Box<dyn Home>>) -> Result<()> {
        let mut interval = self.interval();

        loop {
            let update_opt = home.poll_signed_update().await?;
            reset_loop_if!(update_opt.is_none(), interval);
            let new_update = update_opt.unwrap();

            let double_update_res = self.check_double_update(&new_update).await;
            reset_loop_if!(double_update_res.is_ok(), interval);

            let double = double_update_res.unwrap_err();
            home.double_update(&double).await?;
            color_eyre::eyre::bail!("Detected double update");

            // TODO: bubble this up and submit to ALL replicas
            // // loop always resets early unless there's a double update.
            // return Ok(double_update_res.unwrap_err());
        }
    }

    /// Polls replica for signed updates and checks for both double update
    /// fraud and fraudulent updates.
    async fn watch_replica(
        &self,
        home: Arc<Box<dyn Home>>,
        replica: Arc<Box<dyn Replica>>,
    ) -> Result<()> {
        let mut interval = self.interval();

        loop {
            let update_opt = replica.poll_signed_update().await?;
            reset_loop_if!(update_opt.is_none(), interval);
            let new_update = update_opt.unwrap();

            self.check_fraudulent_update(&home, &new_update).await?;

            let double_update_res = self.check_double_update(&new_update).await;
            reset_loop_if!(double_update_res.is_ok(), interval);

            let double = double_update_res.unwrap_err();

            let results = join_all(vec![
                home.double_update(&double),
                replica.double_update(&double),
            ])
            .await;

            // Report each error. Temporary solution
            results
                .into_iter()
                .filter(Result::is_err)
                .map(Result::unwrap_err)
                .for_each(|err| {
                    tracing::error!("Error submitting double update: {}", err);
                });
            color_eyre::eyre::bail!("Detected double update");

            // TODO: bubble this up and submit to ALL replicas
            // // loop always resets early unless there's a double update.
            // return Ok(double_update_res.unwrap_err());
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Watcher {
    async fn run(&self, home: Arc<Box<dyn Home>>, replica: Option<Box<dyn Replica>>) -> Result<()> {
        ensure!(replica.is_some(), "Watcher must have replica.");
        let replica = Arc::new(replica.unwrap());

        // TODO: handle double update
        let _double = self.watch_replica(home, replica).await?;

        Ok(())
    }

    async fn run_many(&self, home: Box<dyn Home>, replicas: Vec<Box<dyn Replica>>) -> Result<()> {
        let home = Arc::new(home);

        let mut futs: Vec<_> = replicas
            .into_iter()
            .map(|replica| self.run_report_error(home.clone(), Some(replica)))
            .collect();

        let home_fut = self.watch_home(home.clone());
        futs.push(Box::pin(home_fut));

        loop {
            let (res, _, remaining) = select_all(futs).await;
            if res.is_err() {
                tracing::error!("Home or replica shut down: {:#}", res.unwrap_err());
            }
            futs = remaining;
            if futs.is_empty() {
                return Err(eyre!("Home and replicas have shut down"));
            }
        }
    }
}
