use async_trait::async_trait;
use color_eyre::{Result};
use std::sync::Arc;
use tokio::time::{interval, Interval};

use optics_base::agent::OpticsAgent;
use optics_core::{
    traits::{Home, Replica},
};

/// A relayer agent
#[derive(Debug)]
pub struct Relayer {
    interval_seconds: u64,
}

impl Relayer {
    /// Instantiate a new relayer
    pub fn new(interval_seconds: u64) -> Self {
        Self {
            interval_seconds,
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
impl OpticsAgent for Relayer {
    async fn run(
        &self,
        home: Arc<Box<dyn Home>>,
        _replica: Option<Box<dyn Replica>>,
    ) -> Result<()> {
        let replica = _replica.expect("relayer must have replica");
        
        let mut interval = self.interval();
        loop {
            // Get replica's current root
            let old_root = replica.current_root().await?;

            // Check for first signed update building off of the replica's current root
            let signed_update_opt = home.signed_update_by_old_root(old_root).await?;

            // If signed update exists, update replica's current root
            if let Some(signed_update) = signed_update_opt {
                replica.update(&signed_update).await?;
            }

            // Check for pending update that can be confirmed
            let can_confirm = replica.can_confirm().await?;

            // If valid pending update exists, confirm it
            if can_confirm {
                replica.confirm().await?;
            }

            interval.tick().await;
        }
    }
}