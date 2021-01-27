use async_trait::async_trait;
use color_eyre::{
    eyre::{ensure, eyre},
    Result,
};
use ethers::{signers::Signer, types::Address};
use std::sync::Arc;
use tokio::time::{interval, Interval};

use optics_base::agent::OpticsAgent;
use optics_core::{
    traits::{Home, Replica},
    SignedUpdate, Update,
};

/// A Relayer agent
#[derive(Debug)]
pub struct Relayer {
    interval_seconds: u64,
}

impl Relayer {
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
impl<E> OpticsAgent for Relayer 
where
    E: std::error::Error + Send + Sync + 'static,
{
    async fn run (
        &self,
        home: Arc<Box<dyn Home>>,
        _replica: Option<Box<dyn Replica>>,
    ) -> Result<()> {
        
    }
}