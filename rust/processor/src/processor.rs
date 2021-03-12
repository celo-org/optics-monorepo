use async_trait::async_trait;
use color_eyre::{
    eyre::{eyre, Context},
    Result,
};
use futures_util::future::select_all;
use std::{collections::HashMap, sync::Arc};
use tokio::{
    sync::{oneshot::channel, RwLock},
    task::JoinHandle,
    time::{interval, Interval},
};

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    cancel_task, decl_agent,
    home::Homes,
    prover::Provers,
    replica::Replicas,
    return_res_unit_if,
};
use optics_core::{
    accumulator::prover::ProverTrait,
    traits::{Home, Replica},
};

use crate::{prover_sync::ProverSync, settings::Settings};

pub(crate) struct ReplicaProcessor {
    interval_seconds: u64,
    replica: Arc<Replicas>,
    home: Arc<Homes>,
    prover: Arc<RwLock<Provers>>,
}

impl ReplicaProcessor {
    pub(crate) fn new(
        interval_seconds: u64,
        replica: Arc<Replicas>,
        home: Arc<Homes>,
        prover: Arc<RwLock<Provers>>,
    ) -> Self {
        Self {
            interval_seconds,
            replica,
            home,
            prover,
        }
    }

    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }

    async fn prove_and_process_message(&self, domain: u32) -> Result<()> {
        // Get the last processed index and sequence
        let last_processed = self.replica.last_processed().await?;
        let sequence = last_processed.as_u32() + 1;

        // Check if the Home knows of a message above that index. If not,
        // return early and poll again.
        let message = self.home.message_by_sequence(domain, sequence).await?;
        return_res_unit_if!(
            message.is_none(),
            "Remote does not contain message at {}:{}",
            domain,
            sequence
        );

        let message = message.unwrap();

        // Check if we have a proof for that message. If no proof, return early
        // and poll again
        let proof_res = self.prover.read().await.prove(message.leaf_index as usize);
        return_res_unit_if!(
            proof_res.is_err(),
            "Prover does not contain leaf at index {}",
            message.leaf_index
        );

        // If leaf in prover doesn't match retrieved message, bail
        let proof = proof_res.unwrap();
        if proof.leaf != message.message.to_leaf() {
            let err = format!("Leaf in prover does not match retrieved message. Index: {}. Retrieved: {}. Local: {}.", message.leaf_index, message.message.to_leaf(), proof.leaf);
            tracing::error!("{}", err);
            color_eyre::eyre::bail!(err);
        }

        // Submit the proof to the replica
        self.replica
            .prove_and_process(message.as_ref(), &proof)
            .await?;

        Ok(())
    }

    pub(crate) fn spawn(self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            let domain = self.replica.destination_domain();
            let mut interval = self.interval();

            loop {
                self.prove_and_process_message(domain).await?;
                interval.tick().await;
            }
        })
    }
}

decl_agent!(
    /// A processor agent
    Processor {
        interval_seconds: u64,
        prover: Arc<RwLock<Provers>>,
        replica_tasks: RwLock<HashMap<String, JoinHandle<Result<()>>>>,
    }
);

impl Processor {
    /// Instantiate a new processor
    pub fn new(interval_seconds: u64, core: AgentCore) -> Self {
        Self {
            interval_seconds,
            prover: Default::default(),
            core,
            replica_tasks: Default::default(),
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
            settings.polling_interval,
            settings.as_ref().try_into_core().await?,
        ))
    }

    fn run(&self, name: &str) -> JoinHandle<Result<()>> {
        let home = self.home();
        let prover = self.prover.clone();
        let interval_seconds = self.interval_seconds;

        let replica_opt = self.replica_by_name(name);
        let name = name.to_owned();

        tokio::spawn(async move {
            let replica = replica_opt.ok_or_else(|| eyre!("No replica named {}", name))?;
            ReplicaProcessor::new(interval_seconds, replica, home, prover)
                .spawn()
                .await?
        })
    }

    #[tracing::instrument(err)]
    async fn run_many(&self, replicas: &[&str]) -> Result<()> {
        let (_tx, rx) = channel();

        let interval_seconds = self.interval_seconds;
        let sync = ProverSync::new(self.prover.clone(), self.home(), rx);
        let sync_task = tokio::spawn(async move {
            sync.poll_updates(interval_seconds)
                .await
                .wrap_err("ProverSync task has shut down")
        });

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

#[cfg(test)]
mod test {
    use mockall::*;
    use std::sync::Arc;
    use tokio::sync::RwLock;

    use ethers::core::types::{H256, U256};

    use optics_core::{
        accumulator::TREE_DEPTH,
        accumulator::{prover::Proof, ProverError},
        traits::{CommittedMessage, TxOutcome},
        StampedMessage,
    };
    use optics_test::mocks::{MockHomeContract, MockProver, MockReplicaContract};

    use super::*;

    #[tokio::test]
    async fn returns_early_if_no_message() {
        let domain = 1;
        let sequence = 1;

        let mut mock_home = MockHomeContract::new();
        let mut mock_replica = MockReplicaContract::new();
        let mut mock_prover = MockProver::new();
        let mut test_sequence = Sequence::new();

        // Expect replica.last_processed to be called once and return mock
        // value `sequence`
        mock_replica
            .expect__last_processed()
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move || Ok(U256::from(sequence - 1)));

        // Expect home.message_by_sequence to be called once and return
        // mock value of Ok(None), which causes home.message_by_sequence to
        // also return Ok(None)
        mock_home
            .expect__message_by_sequence()
            .withf(move |d: &u32, s: &u32| *d == domain && *s == sequence)
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move |_, _| Ok(None));

        // Expect prover.prove() to NOT be called (called zero times)
        mock_prover
            .expect__prove()
            .times(0)
            .return_once(move |_| Ok(Default::default()));

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let mut replica: Arc<Replicas> = Arc::new(mock_replica.into());
        let mut prover: Arc<RwLock<Provers>> = Arc::new(RwLock::new(mock_prover.into()));

        {
            let replica_processor =
                ReplicaProcessor::new(3, replica.clone(), home.clone(), prover.clone());

            replica_processor
                .prove_and_process_message(domain)
                .await
                .expect("Should have returned Ok(())");
        }

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();

        let mock_replica = Arc::get_mut(&mut replica).unwrap();
        mock_replica.checkpoint();

        let mut mock_prover = Arc::get_mut(&mut prover).unwrap().write().await;
        mock_prover.checkpoint();
    }

    #[tokio::test]
    async fn returns_early_if_error_creating_proof() {
        let domain = 1;
        let sequence = 1;
        let message = CommittedMessage {
            leaf_index: sequence,
            message: StampedMessage {
                origin: 0,
                sender: H256::zero(),
                destination: domain,
                recipient: H256::from([1; 32]),
                sequence,
                body: String::from("message").into_bytes(),
            },
        };

        let mut mock_home = MockHomeContract::new();
        let mut mock_replica = MockReplicaContract::new();
        let mut mock_prover = MockProver::new();
        let mut test_sequence = Sequence::new();

        // Expect replica.last_processed to be called once and return mock
        // value `sequence`
        mock_replica
            .expect__last_processed()
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move || Ok(U256::from(sequence - 1)));

        // Expect home.message_by_sequence to be called once and return
        // mock value of Ok(Some(`message`))
        mock_home
            .expect__message_by_sequence()
            .withf(move |d: &u32, s: &u32| *d == domain && *s == sequence)
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move |_, _| Ok(Some(message)));

        // Expect prover.prove() to be called once and have it return mock
        // value of error to cause early return
        mock_prover
            .expect__prove()
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move |_| Err(ProverError::IndexTooHigh(10)));

        // Expect replica.prove_and_process() to NOT be called since error
        // creating proof (called zero times)
        mock_replica
            .expect__prove_and_process()
            .times(0)
            .return_once(move |_, _| {
                Ok(TxOutcome {
                    txid: H256::zero(),
                    executed: false,
                })
            });

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let mut replica: Arc<Replicas> = Arc::new(mock_replica.into());
        let mut prover: Arc<RwLock<Provers>> = Arc::new(RwLock::new(mock_prover.into()));

        {
            let replica_processor =
                ReplicaProcessor::new(3, replica.clone(), home.clone(), prover.clone());

            replica_processor
                .prove_and_process_message(domain)
                .await
                .expect("Should have returned Ok(())");
        }

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();

        let mock_replica = Arc::get_mut(&mut replica).unwrap();
        mock_replica.checkpoint();

        let mut mock_prover = Arc::get_mut(&mut prover).unwrap().write().await;
        mock_prover.checkpoint();
    }

    #[tokio::test]
    async fn bails_when_created_proof_does_not_match_tree() {
        let domain = 1;
        let sequence = 1;
        let message = CommittedMessage {
            leaf_index: sequence,
            message: StampedMessage {
                origin: 0,
                sender: H256::zero(),
                destination: domain,
                recipient: H256::from([1; 32]),
                sequence,
                body: String::from("message").into_bytes(),
            },
        };

        // Default proof does NOT match above message
        let proof = Proof::default();

        let mut mock_home = MockHomeContract::new();
        let mut mock_replica = MockReplicaContract::new();
        let mut mock_prover = MockProver::new();
        let mut test_sequence = Sequence::new();

        // Expect replica.last_processed to be called once and return mock
        // value `sequence`
        mock_replica
            .expect__last_processed()
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move || Ok(U256::from(sequence - 1)));

        // Expect home.message_by_sequence to be called once and return
        // mock value of Ok(Some(`message`))
        mock_home
            .expect__message_by_sequence()
            .withf(move |d: &u32, s: &u32| *d == domain && *s == sequence)
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move |_, _| Ok(Some(message)));

        // Expect prover.prove() to be called once and have it return mock
        // value of `proof`
        mock_prover
            .expect__prove()
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move |_| Ok(proof));

        // Expect replica.prove_and_process() to NOT be called since error
        // created proof doesn't match tree and causes bail
        mock_replica
            .expect__prove_and_process()
            .times(0)
            .return_once(move |_, _| {
                Ok(TxOutcome {
                    txid: H256::zero(),
                    executed: false,
                })
            });

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let mut replica: Arc<Replicas> = Arc::new(mock_replica.into());
        let mut prover: Arc<RwLock<Provers>> = Arc::new(RwLock::new(mock_prover.into()));

        {
            let replica_processor =
                ReplicaProcessor::new(3, replica.clone(), home.clone(), prover.clone());

            replica_processor
                .prove_and_process_message(domain)
                .await
                .expect_err("Should have returned error about proof not matching tree");
        }

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();

        let mock_replica = Arc::get_mut(&mut replica).unwrap();
        mock_replica.checkpoint();

        let mut mock_prover = Arc::get_mut(&mut prover).unwrap().write().await;
        mock_prover.checkpoint();
    }

    #[tokio::test]
    async fn proves_and_processes_valid_message() {
        let domain = 1;
        let sequence = 1;
        let message = CommittedMessage {
            leaf_index: sequence,
            message: StampedMessage {
                origin: 0,
                sender: H256::zero(),
                destination: domain,
                recipient: H256::from([1; 32]),
                sequence,
                body: String::from("message").into_bytes(),
            },
        };

        // proof.leaf == message.message.to_leaf()
        let proof = Proof {
            leaf: message.message.to_leaf(),
            index: sequence as usize,
            path: [H256::zero(); TREE_DEPTH],
        };

        let mut mock_home = MockHomeContract::new();
        let mut mock_replica = MockReplicaContract::new();
        let mut mock_prover = MockProver::new();
        let mut test_sequence = Sequence::new();

        // Expect replica.last_processed to be called once and return mock
        // value `sequence`
        mock_replica
            .expect__last_processed()
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move || Ok(U256::from(sequence - 1)));

        // Expect home.message_by_sequence to be called once and return
        // mock value of Ok(Some(`message`))
        mock_home
            .expect__message_by_sequence()
            .withf(move |d: &u32, s: &u32| *d == domain && *s == sequence)
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move |_, _| Ok(Some(message)));

        // Expect prover.prove() to be called once and have it return mock
        // value of `proof`
        mock_prover
            .expect__prove()
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move |_| Ok(proof));

        // Expect replica.prove_and_process() to be called once (reaches end of prove_and_process_message call)
        mock_replica
            .expect__prove_and_process()
            .times(1)
            .in_sequence(&mut test_sequence)
            .return_once(move |_, _| {
                Ok(TxOutcome {
                    txid: H256::zero(),
                    executed: false,
                })
            });

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let mut replica: Arc<Replicas> = Arc::new(mock_replica.into());
        let mut prover: Arc<RwLock<Provers>> = Arc::new(RwLock::new(mock_prover.into()));

        {
            let replica_processor =
                ReplicaProcessor::new(3, replica.clone(), home.clone(), prover.clone());

            replica_processor
                .prove_and_process_message(domain)
                .await
                .expect("Should have returned Ok(())");
        }

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();

        let mock_replica = Arc::get_mut(&mut replica).unwrap();
        mock_replica.checkpoint();

        let mut mock_prover = Arc::get_mut(&mut prover).unwrap().write().await;
        mock_prover.checkpoint();
    }
}
