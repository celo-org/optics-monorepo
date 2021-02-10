use async_trait::async_trait;
use color_eyre::{eyre::ensure, Result};
use ethers::{core::types::H256};
use std::{collections::HashMap, sync::Arc};
use tokio::{sync::RwLock, time::{interval, Interval}};

use optics_base::agent::OpticsAgent;
use optics_core::{SignedUpdate, traits::{ChainCommunicationError, Home, Replica}};

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

    async fn poll_home_update(
        &self,
        home: Arc<Box<dyn Home>>,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        let current_root = home.current_root().await?;
        home.signed_update_by_old_root(current_root).await
    }

    async fn poll_replica_update(
        &self,
        replica: Arc<Box<dyn Replica>>,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        let current_root = replica.current_root().await?;
        replica.signed_update_by_old_root(current_root).await
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
            let replica_update_res = self.poll_replica_update(replica.clone()).await;

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
}
