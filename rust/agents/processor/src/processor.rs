use async_trait::async_trait;
use color_eyre::{
    eyre::{bail, eyre},
    Result,
};
use ethers::prelude::H256;
use futures_util::future::select_all;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::Duration,
};
use tokio::{sync::RwLock, task::JoinHandle, time::sleep};
use tracing::{error, info, info_span, instrument, instrument::Instrumented, Instrument};

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    cancel_task, decl_agent,
    home::Homes,
    replica::Replicas,
};
use optics_core::{
    accumulator::merkle::Proof,
    db::HomeDB,
    traits::{CommittedMessage, Common, Home, MessageStatus},
};

use crate::{prover_sync::ProverSync, settings::ProcessorSettings as Settings};

const AGENT_NAME: &str = "processor";

/// The replica processor is responsible for polling messages and waiting until they validate
/// before proving/processing them.
#[derive(Debug)]
pub(crate) struct Replica {
    interval: u64,
    replica: Arc<Replicas>,
    home: Arc<Homes>,
    home_db: HomeDB,
    allowed: Option<Arc<HashSet<H256>>>,
    denied: Option<Arc<HashSet<H256>>>,
    next_nonce: Arc<prometheus::IntGaugeVec>,
}

impl std::fmt::Display for Replica {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "ReplicaProcessor: {{ home: {:?}, replica: {:?}, allowed: {:?}, denied: {:?} }}",
            self.home, self.replica, self.allowed, self.denied
        )
    }
}

impl Replica {
    #[instrument(skip(self), fields(self = %self))]
    fn main(self) -> JoinHandle<Result<()>> {
        tokio::spawn(
            async move {
                use optics_core::traits::Replica;

                let domain = self.replica.local_domain();

                // The basic structure of this loop is as follows:
                // 1. Get the last processed index
                // 2. Check if the Home knows of a message above that index
                //      - If not, wait and poll again
                // 3. Check if we have a proof for that message
                //      - If not, wait and poll again
                // 4. Check if the proof is valid under the replica
                // 5. Submit the proof to the replica
                let mut next_nonce: u32 = self
                    .home_db
                    .retrieve_latest_nonce(domain)?
                    .map(|n: u32| n + 1)
                    .unwrap_or_default();

                self.next_nonce
                    .with_label_values(&[self.home.name(), self.replica.name(), AGENT_NAME])
                    .set(next_nonce as i64);

                info!(
                    domain,
                    nonce = next_nonce,
                    replica = self.replica.name(),
                    "Starting processor for {} {} at nonce {}",
                    domain,
                    self.replica.name(),
                    next_nonce
                );

                loop {
                    use optics_core::traits::Replica;
                    let seq_span = tracing::trace_span!(
                        "ReplicaProcessor",
                        name = self.replica.name(),
                        nonce = next_nonce,
                        replica_domain = self.replica.local_domain(),
                        home_domain = self.home.local_domain(),
                    );

                    match self
                        .try_msg_by_domain_and_nonce(domain, next_nonce)
                        .instrument(seq_span)
                        .await
                    {
                        Ok(true) => {
                            self.home_db.store_latest_nonce(domain, next_nonce)?;
                            next_nonce += 1;
                        }
                        Ok(false) => {
                            // there was some fault, let's wait and then try again later when state may have moved
                            sleep(Duration::from_secs(self.interval)).await
                        }
                        Err(e) => {
                            error!("fatal error in processor::Replica: {}", e);
                            bail!(e)
                        }
                    }
                }
            }
            .in_current_span(),
        )
    }

    /// Attempt to process a message.
    ///
    /// Postcondition: ```match retval? {
    ///   true => message skipped ⊻ message was processed
    ///   false => try again later
    /// }```
    ///
    /// In case of error: send help?
    #[instrument(err, skip(self), fields(self = %self))]
    async fn try_msg_by_domain_and_nonce(&self, domain: u32, nonce: u32) -> Result<bool> {
        use optics_core::traits::Replica;

        let message = match self.home.message_by_nonce(domain, nonce).await {
            Ok(Some(m)) => m,
            Ok(None) => {
                info!(
                    domain = domain,
                    sequence = nonce,
                    "Message not yet found {}:{}",
                    domain,
                    nonce
                );
                return Ok(false);
            }
            Err(e) => bail!(e),
        };

        info!(target: "seen_committed_messages", leaf_index = message.leaf_index);

        // if we have an allow list, filter senders not on it
        if let Some(false) = self
            .allowed
            .as_ref()
            .map(|set| set.contains(&message.message.sender))
        {
            return Ok(true);
        }

        // if we have a deny list, filter senders on it
        if let Some(true) = self
            .denied
            .as_ref()
            .map(|set| set.contains(&message.message.sender))
        {
            return Ok(true);
        }

        let proof = match self.home_db.proof_by_leaf_index(message.leaf_index) {
            Ok(Some(p)) => p,
            Ok(None) => {
                info!(leaf_index = message.leaf_index, "Proof not yet found");
                return Ok(false);
            }
            Err(e) => bail!(e),
        };

        if proof.leaf != message.to_leaf() {
            let msg =
                eyre!("Leaf in prover does not match retrieved message. Index: {}. Calculated: {}. Prover: {}.", message.leaf_index, message.to_leaf(), proof.leaf);
            error!("{}", msg);
            bail!(msg);
        }

        while !self.replica.acceptable_root(proof.root()).await? {
            info!(
                "Proof under {root} not yet valid here, waiting until Replica confirms",
                root = proof.root(),
            );
            sleep(Duration::from_secs(self.interval)).await;
        }

        info!(
            domain,
            nonce, "Dispatching a message for processing {}:{}", domain, nonce
        );

        self.process(message, proof).await?;

        Ok(true)
    }

    #[instrument(err, level = "trace", skip(self), fields(self = %self))]
    /// Dispatch a message for processing. If the message is already proven, process only.
    async fn process(&self, message: CommittedMessage, proof: Proof) -> Result<()> {
        use optics_core::traits::Replica;
        let status = self.replica.message_status(message.to_leaf()).await?;

        match status {
            MessageStatus::None => {
                self.replica
                    .prove_and_process(message.as_ref(), &proof)
                    .await?;
            }
            MessageStatus::Proven => {
                self.replica.process(message.as_ref()).await?;
            }
            MessageStatus::Processed => {
                info!(
                    domain = message.message.destination,
                    nonce = message.message.nonce,
                    leaf_index = message.leaf_index,
                    leaf = ?message.message.to_leaf(),
                    "Message {}:{} already processed",
                    message.message.destination,
                    message.message.nonce
                );
            }
        }

        Ok(())
    }
}

decl_agent!(
    /// A processor agent
    Processor {
        interval: u64,
        replica_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
        allowed: Option<Arc<HashSet<H256>>>,
        denied: Option<Arc<HashSet<H256>>>,
        next_nonce: Arc<prometheus::IntGaugeVec>,
        index_only: bool,
    }
);

impl Processor {
    /// Instantiate a new processor
    pub fn new(
        interval: u64,
        core: AgentCore,
        allowed: Option<HashSet<H256>>,
        denied: Option<HashSet<H256>>,
        index_only: bool,
    ) -> Self {
        let next_nonce = core
            .metrics
            .new_int_gauge(
                "next_nonce",
                "Next nonce of a replica processor to inspect",
                &["home", "replica", "agent"],
            )
            .expect("processor metric already registered -- should have be a singleton");

        Self {
            interval,
            core,
            replica_tasks: Default::default(),
            allowed: allowed.map(Arc::new),
            denied: denied.map(Arc::new),
            next_nonce: Arc::new(next_nonce),
            index_only,
        }
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Processor {
    const AGENT_NAME: &'static str = AGENT_NAME;

    type Settings = Settings;

    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        Ok(Self::new(
            settings.interval.parse().expect("invalid integer"),
            settings.as_ref().try_into_core(AGENT_NAME).await?,
            settings.allowed,
            settings.denied,
            settings.indexon.is_some(),
        ))
    }

    fn run(&self, name: &str) -> Instrumented<JoinHandle<Result<()>>> {
        let home = self.home();
        let next_nonce = self.next_nonce.clone();
        let interval = self.interval;

        let replica_opt = self.replica_by_name(name);
        let name = name.to_owned();
        let db = self.db();

        let allowed = self.allowed.clone();
        let denied = self.denied.clone();

        tokio::spawn(async move {
            let replica = replica_opt.ok_or_else(|| eyre!("No replica named {}", name))?;
            let home_name = home.name().to_owned();

            Replica {
                interval,
                replica,
                home,
                home_db: HomeDB::new(db, home_name),
                allowed,
                denied,
                next_nonce,
            }
            .main()
            .await?
        })
        .in_current_span()
    }

    fn run_all(self) -> Instrumented<JoinHandle<Result<()>>>
    where
        Self: Sized + 'static,
    {
        tokio::spawn(async move {
            info!("Starting Processor tasks");
            // tree sync
            let sync = ProverSync::from_disk(HomeDB::new(
                self.core.db.clone(),
                self.home().name().to_owned(),
            ));
            let sync_task = sync.spawn();

            // indexer setup
            let block_height = self
                .as_ref()
                .metrics
                .new_int_gauge(
                    "block_height",
                    "Height of a recently observed block",
                    &["network", "agent"],
                )
                .expect("failed to register block_height metric")
                .with_label_values(&[self.home().name(), Self::AGENT_NAME]);
            let indexer = &self.as_ref().indexer;
            let index_task = self
                .home()
                .index(indexer.from(), indexer.chunk_size(), block_height);

            info!("started indexer and sync");

            // instantiate task array here so we can optionally push run_task
            let mut tasks = vec![index_task, sync_task];

            if !self.index_only {
                // this is the unused must use
                let names: Vec<&str> = self.replicas().keys().map(|k| k.as_str()).collect();
                tasks.push(self.run_many(&names));
            }

            info!("selecting");
            let (res, _, remaining) = select_all(tasks).await;

            for task in remaining.into_iter() {
                cancel_task!(task);
            }

            res?
        })
        .instrument(info_span!("Processor::run_all"))
    }
}
