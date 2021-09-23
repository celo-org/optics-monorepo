use std::{sync::Arc, time::Duration};

use async_trait::async_trait;
use color_eyre::{
    eyre::{bail, ensure, Context},
    Result,
};
use ethers::{signers::Signer, types::Address};
use futures_util::future::select_all;
use prometheus::IntCounterVec;
use tokio::{
    sync::{
        mpsc::{self, error::TrySendError, Receiver, Sender},
        Mutex,
    },
    task::JoinHandle,
    time::sleep,
};
use tracing::{error, info, instrument::Instrumented, Instrument};

use crate::settings::UpdaterSettings as Settings;
use optics_base::{
    agent::{AgentCore, OpticsAgent},
    home::Homes,
};
use optics_core::{
    db::HomeDB,
    traits::{Common, Home},
    SignedUpdate, Signers, Update,
};

#[derive(Debug)]
struct UpdateHandler {
    home: Arc<Homes>,

    rx: Receiver<Update>,
    update_pause: u64,
    signer: Arc<Signers>,
    home_db: HomeDB,
    mutex: Arc<Mutex<()>>,
    signed_attestation_count: IntCounterVec,
}

impl std::fmt::Display for UpdateHandler {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "UpdateHandler: {{ home: {:?}, signer: {:?}, update_pause: {} }}",
            self.home, self.signer, self.update_pause
        )
    }
}

impl UpdateHandler {
    fn new(
        home: Arc<Homes>,
        rx: Receiver<Update>,
        update_pause: u64,
        signer: Arc<Signers>,
        home_db: HomeDB,
        mutex: Arc<Mutex<()>>,
        signed_attestation_count: IntCounterVec,
    ) -> Self {
        Self {
            home,
            rx,
            update_pause,
            signer,
            home_db,
            mutex,
            signed_attestation_count,
        }
    }

    fn check_conflict(&self, update: &Update) -> Option<SignedUpdate> {
        self.home_db
            .update_by_previous_root(update.previous_root)
            .expect("db failure")
    }

    #[tracing::instrument(err, skip(self), fields(self = %self))]
    async fn acceptable(&self, update: &Update) -> Result<bool> {
        // Poll chain API to see if queue still contains new root
        // and old root still equals home's current root
        let (in_queue, committed_root) = tokio::join!(
            self.home.queue_contains(update.new_root),
            self.home.committed_root()
        );

        if in_queue.is_err() {
            info!("Update no longer in queue");
        }
        if committed_root.is_err() {
            error!("Connection gone");
        }

        let in_queue = in_queue?;
        let committed_root = committed_root?;

        let old_root = update.previous_root;
        Ok(in_queue && committed_root == old_root)
    }

    #[tracing::instrument(err, skip(self), fields(self = %self))]
    async fn handle_update(&self, update: Update) -> Result<()> {
        info!("Have an update, awaiting the tick");

        // We poll acceptable immediately, to prevent waiting on
        // any unacceptable updates that got into the channel
        // We poll it AGAIN after sleeping to ensure that the update
        // is still acceptable.

        // TODO(james): later refactor this to only allow acceptable
        // updates into the channel?
        if !self.acceptable(&update).await? {
            info!("Declined to submit update. No longer current");
            return Ok(());
        }

        // Wait `update_pause` seconds
        sleep(Duration::from_secs(self.update_pause)).await;

        if !self.acceptable(&update).await? {
            info!("Declined to submit update. No longer current");
            return Ok(());
        }

        // acquire guard. If the guard can't be acquired, that
        // means a tx is in flight and we should try again later.
        let _guard = self
            .mutex
            .try_lock()
            .wrap_err("Declined to submit update.")?;

        // If update still valid and doesn't conflict with local
        // history of signed updates, sign and submit update. Note
        // that because we acquire a guard, only one task
        // can check and enter the below `if` block at a time,
        // protecting from races between threads.

        if self.check_conflict(&update).is_some() {
            bail!("Found conflicting update in DB");
        }

        // If we have a conflict, we grab that one instead
        let signed = update.sign_with(self.signer.as_ref()).await.unwrap();

        // If successfully submitted update, record in db
        info!(
            "Dispatching signed update to contract. Current root is {:?}, new root is {:?}",
            &signed.update.previous_root, &signed.update.new_root
        );

        self.signed_attestation_count
            .with_label_values(&[self.home.name(), Updater::AGENT_NAME])
            .inc();
        self.home.update(&signed).await?;

        info!("Storing signed update in db");
        self.home_db.store_latest_update(&signed)?;
        Ok(())
        // guard dropped here
    }

    fn spawn(mut self) -> Instrumented<JoinHandle<Result<()>>> {
        tokio::spawn(async move {
            while let Some(update) = self.rx.recv().await {
                self.handle_update(update).await?;
            }
            Ok(())
        })
        .in_current_span()
    }
}

struct UpdatePoller {
    home: Arc<Homes>,
    tx: Sender<Update>,
    interval_seconds: u64,
}

impl UpdatePoller {
    fn new(home: Arc<Homes>, tx: Sender<Update>, interval_seconds: u64) -> Self {
        Self {
            home,
            tx,
            interval_seconds,
        }
    }

    fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        tokio::spawn(async move {
            loop {
                if let Some(update) = self.home.produce_update().await? {
                    if let Err(TrySendError::Closed(_)) = self.tx.try_send(update) {
                        bail!("UpdatePoller died");
                    }
                }
                sleep(Duration::from_secs(self.interval_seconds)).await;
            }
        })
        .in_current_span()
    }
}

/// An updater agent
#[derive(Debug)]
pub struct Updater {
    signer: Arc<Signers>,
    interval_seconds: u64,
    update_pause: u64,
    pub(crate) core: AgentCore,
    signed_attestation_count: IntCounterVec,
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

        Self {
            signer: Arc::new(signer),
            interval_seconds,
            update_pause,
            core,
            signed_attestation_count,
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

        let (tx, rx) = mpsc::channel(1);
        let poller = UpdatePoller::new(self.home(), tx, self.interval_seconds);
        let handler = UpdateHandler::new(
            self.home(),
            rx,
            self.update_pause,
            self.signer.clone(),
            HomeDB::new(self.db(), self.home().name().to_owned()),
            Default::default(),
            self.signed_attestation_count.clone(),
        );

        tokio::spawn(async move {
            let expected: Address = home.updater().await?.into();
            ensure!(
                expected == address,
                "Contract updater does not match keys. On-chain: {}. Local: {}",
                expected,
                address
            );
            let poller_task = poller.spawn();
            let handler_task = handler.spawn();

            let (res, _, rem) = select_all(vec![poller_task, handler_task]).await;

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
