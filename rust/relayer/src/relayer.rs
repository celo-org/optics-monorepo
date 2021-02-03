use async_trait::async_trait;
use color_eyre::{eyre::ensure, Result};
use std::sync::Arc;
use tokio::time::{interval, Interval};

use optics_base::agent::OpticsAgent;
use optics_core::traits::{Home, Replica};

/// A relayer agent
#[derive(Debug)]
pub struct Relayer {
    interval_seconds: u64,
}

impl Relayer {
    /// Instantiate a new relayer
    pub fn new(interval_seconds: u64) -> Self {
        Self { interval_seconds }
    }

    async fn poll_updates(
        &self,
        home: Arc<Box<dyn Home>>,
        replica: Arc<Box<dyn Replica>>,
    ) -> Result<()> {
        // Get replica's current root
        let old_root = replica.current_root().await?;

        // Check for first signed update building off of the replica's current root
        let signed_update_opt = home.signed_update_by_old_root(old_root).await?;

        // If signed update exists, update replica's current root
        if let Some(signed_update) = signed_update_opt {
            replica.update(&signed_update).await?;
        }

        Ok(())
    }

    async fn poll_confirms(&self, replica: Arc<Box<dyn Replica>>) -> Result<()> {
        // Check for pending update that can be confirmed
        let can_confirm = replica.can_confirm().await?;

        // If valid pending update exists, confirm it
        if can_confirm {
            replica.confirm().await?;
        }

        Ok(())
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
impl OpticsAgent for Relayer {
    async fn run(&self, home: Arc<Box<dyn Home>>, replica: Option<Box<dyn Replica>>) -> Result<()> {
        ensure!(replica.is_some(), "Relayer must have replica.");
        let replica = Arc::new(replica.unwrap());
        let mut interval = self.interval();
        loop {
            let (updated, confirmed) = tokio::join!(
                self.poll_updates(home.clone(), replica.clone()),
                self.poll_confirms(replica.clone())
            );

            updated?;
            confirmed?;
            interval.tick().await;
        }
    }
}
