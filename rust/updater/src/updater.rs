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

/// An updater agent
#[derive(Debug)]
pub struct Updater<S> {
    signer: S,
    interval_seconds: u64,
}

impl<S> Updater<S>
where
    S: Signer,
{
    /// Instantiate a new updater
    pub fn new(signer: S, interval_seconds: u64) -> Self {
        Self {
            signer,
            interval_seconds,
        }
    }

    /// Sign an update
    pub async fn sign_update(&self, update: &Update) -> Result<SignedUpdate, S::Error> {
        update.sign_with(&self.signer).await
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
impl<S, E> OpticsAgent for Updater<S>
where
    S: Signer<Error = E>,
    // Bit of a kludge. but should be fine. All current error types are static
    E: std::error::Error + Send + Sync + 'static,
{
    async fn run(
        &self,
        home: Arc<Box<dyn Home>>,
        _replica: Option<Box<dyn Replica>>,
    ) -> Result<()> {
        let expected: Address = home.updater().await.map_err(|e| eyre!(e))?.into();
        ensure!(
            expected == self.signer.address(),
            "Contract updater does not match keys. On-chain: {}. Local: {}",
            expected,
            self.signer.address()
        );

        let mut interval = self.interval();

        loop {
            let update_opt = home.produce_update().await.map_err(|e| eyre!(e))?;

            if let Some(update) = update_opt {
                let signed = self.sign_update(&update).await?;
                home.update(&signed).await.map_err(|e| eyre!(e))?;
            }

            interval.tick().await;
        }
    }
}
