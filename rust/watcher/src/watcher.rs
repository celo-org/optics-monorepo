use async_trait::async_trait;
use color_eyre::{eyre::{eyre, ensure}, Result};
use ethers::{core::types::H256};
use std::{collections::HashMap, sync::Arc};
use tokio::{sync::RwLock, time::{interval, Interval}};
use futures_util::future::{select_all};

use optics_base::agent::OpticsAgent;
use optics_core::{SignedUpdate, traits::{ChainCommunicationError, Home, Replica, Common}};

/// A watcher agent
#[derive(Debug)]
pub struct Watcher {
    interval_seconds: u64,
    history: RwLock<HashMap<H256, SignedUpdate>>,
}

#[allow(clippy::unit_arg)]
impl Watcher {
    /// Instantiates a new watcher
    pub fn new(interval_seconds: u64) -> Self {
        Self {
            interval_seconds,
            history: RwLock::new(HashMap::new()),
        }
    }

    async fn replica_check_double_update(
        &self,
        replica: Arc<Box<dyn Replica>>,
        signed_update: SignedUpdate, 
    ) -> Result<()> {
        let old_root = signed_update.update.previous_root;
        let new_root = signed_update.update.new_root;

        let history_read = self.history.read().await;
        if let Some(signed_update) = history_read.get(&old_root) {
            if signed_update.update.new_root != new_root {
                replica.double_update(signed_update, &history_read[&old_root]).await?;
            }
        } else {
            let mut history_write = self.history.write().await;
            history_write.insert(old_root, signed_update.to_owned());
        };

        Ok(())
    }

    async fn home_check_double_update(
        &self,
        home: Arc<Box<dyn Home>>,
        signed_update: SignedUpdate, 
    ) -> Result<()> {
        let old_root = signed_update.update.previous_root;
        let new_root = signed_update.update.new_root;

        let history_read = self.history.read().await;
        if let Some(signed_update) = history_read.get(&old_root) {
            if signed_update.update.new_root != new_root {
                home.double_update(signed_update, &history_read[&old_root]).await?;
            }
        } else {
            let mut history_write = self.history.write().await;
            history_write.insert(old_root, signed_update.to_owned());
        };

        Ok(())
    }

    async fn watch_home(
        &self,
        home: Arc<Box<dyn Home>>,
    ) -> Result<()> {
        let mut interval = self.interval();
        loop {
            let home_update_res = home.poll_signed_update().await;

            if let Err(ref e) = home_update_res {
                tracing::error!("Error polling home update: {:?}", e)
            }

            let home_update_opt = home_update_res?;
            if let Some(home_update) = home_update_opt {
                let checked = self.home_check_double_update(home.clone(), home_update).await;

                if let Err(ref e) = checked {
                    tracing::error!("Error checking for double update: {:?}", e)
                }
                checked?;
            }

            interval.tick().await;
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
    async fn run(&self, _home: Arc<Box<dyn Home>>, replica: Option<Box<dyn Replica>>) -> Result<()> {
        ensure!(replica.is_some(), "Relayer must have replica.");
        let replica = Arc::new(replica.unwrap());
        
        let mut interval = self.interval();
        loop {
            let replica_update_res = replica.poll_signed_update().await;

            if let Err(ref e) = replica_update_res {
                tracing::error!("Error polling replica update: {:?}", e)
            }

            let replica_update_opt = replica_update_res?;
            if let Some(replica_update) = replica_update_opt {
                let checked = self.replica_check_double_update(replica.clone(), replica_update).await;

                if let Err(ref e) = checked {
                    tracing::error!("Error checking for double update: {:?}", e)
                }
                checked?;
            }

            interval.tick().await;
        }
    }
    
    async fn run_many(&self, home: Box<dyn Home>, replicas: Vec<Box<dyn Replica>>) -> Result<()> {
        let home = Arc::new(home);

        let home_fut = self.watch_home(home.clone());

        let mut futs: Vec<_> = replicas
            .into_iter()
            .map(|replica| self.run_report_error(home.clone(), Some(replica)))
            .collect();

        loop {
            let (res, _, remaining) = select_all(futs).await;
            if res.is_err() {
                tracing::error!("Replica shut down: {:#}", res.unwrap_err());
            }
            futs = remaining;
            if futs.is_empty() {
                home_fut.await?; // does this ever finish???
                return Err(eyre!("All replicas have shut down"));
            }
        }
    }
}
