use async_trait::async_trait;
use color_eyre::{
    eyre::{bail, eyre, WrapErr},
    Result,
};
use ethers::prelude::H256;
use futures_util::future::select_all;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::Duration,
};
use tokio::{
    sync::{oneshot::channel, RwLock},
    task::JoinHandle,
    time::sleep,
};
use tracing::{error, info, instrument, instrument::Instrumented, Instrument};

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    cancel_task, decl_agent,
    home::Homes,
    replica::Replicas,
};
use optics_core::{
    accumulator::merkle::Proof,
    db::DB,
    traits::{CommittedMessage, Common, Home, MessageStatus},
};

use crate::{prover::Prover, prover_sync::ProverSync, settings::ProcessorSettings as Settings};

const LAST_INSPECTED: &str = "lastInspected";
const AGENT_NAME: &str = "processor";

/// The replica processor is responsible for polling messages and waiting until they validate
/// before proving/processing them.
#[derive(Debug)]
pub(crate) struct Replica {
    interval: u64,
    replica: Arc<Replicas>,
    home: Arc<Homes>,
    db: DB,
    allowed: Option<Arc<HashSet<H256>>>,
    denied: Option<Arc<HashSet<H256>>>,
    next_message_index: prometheus::IntGaugeVec,
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
                let mut next_message_index: u32 = self
                    .db
                    .retrieve_decodable("", LAST_INSPECTED)?
                    .map(|n: u32| n + 1)
                    .unwrap_or_default();

                self.next_message_index
                    .with_label_values(&[self.replica.name(), AGENT_NAME])
                    .set(next_message_index as i64);

                info!(
                    domain,
                    nonce = next_message_index,
                    replica = self.replica.name(),
                    "Starting processor for {} {} at nonce {}",
                    domain,
                    self.replica.name(),
                    next_message_index
                );

                loop {
                    use optics_core::traits::Replica;
                    let seq_span = tracing::trace_span!(
                        "ReplicaProcessor",
                        name = self.replica.name(),
                        nonce = next_message_index,
                        replica_domain = self.replica.local_domain(),
                        home_domain = self.home.local_domain(),
                    );

                    match self
                        .try_msg_by_domain_and_nonce(domain, next_message_index)
                        .instrument(seq_span)
                        .await
                    {
                        Ok(true) => {
                            self.db
                                .store_encodable("", LAST_INSPECTED, &next_message_index)?;
                            next_message_index += 1;
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
    #[instrument(err)]
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

        let proof = match self.db.proof_by_leaf_index(message.leaf_index) {
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

    #[instrument(err, level = "trace")]
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
                    leaf_hash = ?message.message.to_leaf(),
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
        prover: Arc<RwLock<Prover>>,
        replica_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
        allowed: Option<Arc<HashSet<H256>>>,
        denied: Option<Arc<HashSet<H256>>>,
        next_message_index: prometheus::IntGaugeVec,
    }
);

impl Processor {
    /// Instantiate a new processor
    pub fn new(
        interval: u64,
        core: AgentCore,
        allowed: Option<HashSet<H256>>,
        denied: Option<HashSet<H256>>,
    ) -> Self {
        let next_message_index = core
            .metrics
            .new_int_gauge(
                "next_message_index",
                "Index of the next message to inspect",
                &["replica", "agent"],
            )
            .expect("Processor metric already registered -- should have be a singleton");

        Self {
            interval,
            prover: Arc::new(RwLock::new(Prover::from_disk(&core.db))),
            core,
            replica_tasks: Default::default(),
            allowed: allowed.map(Arc::new),
            denied: denied.map(Arc::new),
            next_message_index,
        }
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Processor {
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
        ))
    }

    fn run(&self, name: &str) -> Instrumented<JoinHandle<Result<()>>> {
        let home = self.home();
        let interval = self.interval;

        let replica_opt = self.replica_by_name(name);
        let name = name.to_owned();
        let db = self.db();

        let allowed = self.allowed.clone();
        let denied = self.denied.clone();

        let next_message_index = self.next_message_index.clone();

        tokio::spawn(async move {
            let replica = replica_opt.ok_or_else(|| eyre!("No replica named {}", name))?;

            Replica {
                interval,
                replica,
                home,
                db,
                allowed,
                denied,
                next_message_index,
            }
            .main()
            .await?
        })
        .in_current_span()
    }

    #[tracing::instrument(err)]
    async fn run_many(&self, replicas: &[&str]) -> Result<()> {
        let (_tx, rx) = channel();

        info!("Starting ProverSync task");
        let sync = ProverSync::new(self.prover.clone(), self.home(), self.db(), rx);
        let sync_task =
            tokio::spawn(
                async move { sync.spawn().await.wrap_err("ProverSync task has shut down") },
            )
            .in_current_span();

        // for each specified replica, spawn a joinable task
        let mut handles: Vec<_> = replicas.iter().map(|name| self.run(name)).collect();

        handles.push(sync_task);

        // The first time a task fails we cancel all other tasks
        let (res, _, remaining) = select_all(handles).await;
        for task in remaining {
            cancel_task!(task);
        }

        res?
    }
}
