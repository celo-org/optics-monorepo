use std::sync::Arc;

use async_trait::async_trait;
use color_eyre::{eyre::ensure, Result};
use ethers::{signers::Signer, types::Address};
use futures_util::future::select_all;
use prometheus::IntCounterVec;
use tokio::task::JoinHandle;
use tracing::{instrument::Instrumented, Instrument};

use crate::{
    produce::UpdateProducer, settings::UpdaterSettings as Settings, submit::UpdateSubmitter,
};
use optics_base::{AgentCore, OpticsAgent};
use optics_core::{db::OpticsDB, Common, Signers};

/// An updater agent
#[derive(Debug)]
pub struct Updater {
    signer: Arc<Signers>,
    interval_seconds: u64,
    update_pause: u64,
    pub(crate) core: AgentCore,
    signed_attestation_count: IntCounterVec,
    submitted_update_count: IntCounterVec,
}

impl AsRef<AgentCore> for Updater {
    fn as_ref(&self) -> &AgentCore {
        &self.core
    }
}

impl Updater {
    /// Instantiate a new updater
    pub fn new(signer: Signers, interval_seconds: u64, update_pause: u64, core: AgentCore) -> Self {
        let signed_attestation_count = core
            .metrics
            .new_int_counter(
                "signed_attestation_count",
                "Number of attestations signed",
                &["network", "agent"],
            )
            .expect("must be able to register agent metrics");

        let submitted_update_count = core
            .metrics
            .new_int_counter(
                "submitted_update_count",
                "Number of updates successfully submitted to home",
                &["network", "agent"],
            )
            .expect("must be able to register agent metrics");

        Self {
            signer: Arc::new(signer),
            interval_seconds,
            update_pause,
            core,
            signed_attestation_count,
            submitted_update_count,
        }
    }
}

#[async_trait]
// This is a bit of a kludge to make from_settings work.
// Ideally this hould be generic across all signers.
// Right now we only have one
impl OpticsAgent for Updater {
    const AGENT_NAME: &'static str = "updater";

    type Settings = Settings;

    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        let signer = settings.updater.try_into_signer().await?;
        let interval_seconds = settings.interval.parse().expect("invalid uint");
        let update_pause = settings.pause.parse().expect("invalid uint");
        let core = settings.as_ref().try_into_core(Self::AGENT_NAME).await?;
        Ok(Self::new(signer, interval_seconds, update_pause, core))
    }

    fn run(&self, _replica: &str) -> Instrumented<JoinHandle<Result<()>>> {
        // First we check that we have the correct key to sign with.
        let home = self.home();
        let address = self.signer.address();
        let db = OpticsDB::new(self.home().name(), self.db());

        let produce = UpdateProducer::new(
            self.home(),
            db.clone(),
            self.signer.clone(),
            self.interval_seconds,
            self.update_pause,
            self.signed_attestation_count.clone(),
        );

        let submit = UpdateSubmitter::new(
            self.home(),
            db,
            self.interval_seconds,
            self.submitted_update_count.clone(),
        );

        tokio::spawn(async move {
            let expected: Address = home.updater().await?.into();
            ensure!(
                expected == address,
                "Contract updater does not match keys. On-chain: {}. Local: {}",
                expected,
                address
            );
            let produce_task = produce.spawn();
            let submit_task = submit.spawn();

            let (res, _, rem) = select_all(vec![produce_task, submit_task]).await;

            for task in rem.into_iter() {
                task.into_inner().abort();
            }
            res?
        })
        .in_current_span()
    }
}

#[cfg(test)]
mod test {}
