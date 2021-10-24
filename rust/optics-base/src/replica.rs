use async_trait::async_trait;
use color_eyre::eyre::Result;
use ethers::core::types::H256;
use optics_core::{
    accumulator::merkle::Proof, db::OpticsDB, ChainCommunicationError, Common, CommonEvents,
    DoubleUpdate, MessageStatus, OpticsMessage, Replica, SignedUpdate, State, TxOutcome,
};

use optics_ethereum::EthereumReplica;
use optics_test::mocks::MockReplicaContract;
use std::str::FromStr;
use std::sync::Arc;
use tokio::task::JoinHandle;
use tokio::time::{sleep, Duration};
use tracing::{instrument, instrument::Instrumented};

use crate::{ContractSync, Indexers};

/// Caching replica type
#[derive(Debug)]
pub struct CachingReplica {
    replica: Arc<Replicas>,
    db: OpticsDB,
    indexer: Arc<Indexers>,
}

impl CachingReplica {
    /// Instantiate new CachingReplica
    pub fn new(replica: Arc<Replicas>, db: OpticsDB, indexer: Arc<Indexers>) -> Self {
        Self {
            replica,
            db,
            indexer,
        }
    }

    /// Return handle on home object
    pub fn replica(&self) -> Arc<Replicas> {
        self.replica.clone()
    }

    /// Return handle on OpticsDB
    pub fn db(&self) -> OpticsDB {
        self.db.clone()
    }

    /// Spawn a task that syncs the CachingReplica's db with the on-chain event
    /// data
    pub fn spawn_sync(
        &self,
        from_height: u32,
        chunk_size: u32,
        indexed_height: prometheus::IntGauge,
    ) -> Instrumented<JoinHandle<Result<()>>> {
        ContractSync::new(
            self.db.clone(),
            String::from_str(self.replica.name()).expect("!string"),
            self.indexer.clone(),
            from_height,
            chunk_size,
            indexed_height,
        )
        .spawn()
    }
}

#[async_trait]
impl Replica for CachingReplica {
    fn local_domain(&self) -> u32 {
        self.replica.local_domain()
    }

    async fn remote_domain(&self) -> Result<u32, ChainCommunicationError> {
        self.replica.remote_domain().await
    }

    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {
        self.replica.prove(proof).await
    }

    async fn process(&self, message: &OpticsMessage) -> Result<TxOutcome, ChainCommunicationError> {
        self.replica.process(message).await
    }

    async fn message_status(&self, leaf: H256) -> Result<MessageStatus, ChainCommunicationError> {
        self.replica.message_status(leaf).await
    }

    async fn acceptable_root(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        self.replica.acceptable_root(root).await
    }
}

#[async_trait]
impl Common for CachingReplica {
    fn name(&self) -> &str {
        self.replica.name()
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        self.replica.status(txid).await
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        self.replica.updater().await
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        self.replica.state().await
    }

    async fn committed_root(&self) -> Result<H256, ChainCommunicationError> {
        self.replica.committed_root().await
    }

    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        self.replica.update(update).await
    }

    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self.replica.double_update(double).await
    }
}

#[async_trait]
impl CommonEvents for CachingReplica {
    #[tracing::instrument(err)]
    async fn signed_update_by_old_root(
        &self,
        old_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        loop {
            if let Some(update) = self
                .db
                .update_by_previous_root(self.replica.name(), old_root)?
            {
                return Ok(Some(update));
            }
            sleep(Duration::from_millis(500)).await;
        }
    }

    #[tracing::instrument(err)]
    async fn signed_update_by_new_root(
        &self,
        new_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        loop {
            if let Some(update) = self.db.update_by_new_root(self.replica.name(), new_root)? {
                return Ok(Some(update));
            }
            sleep(Duration::from_millis(500)).await;
        }
    }
}

/// Replica type
#[derive(Debug)]
pub enum Replicas {
    /// Ethereum replica contract
    Ethereum(Box<dyn Replica>),
    /// Mock replica contract
    Mock(Box<MockReplicaContract>),
    /// Other replica variant
    Other(Box<dyn Replica>),
}

impl Replicas {
    /// Calls checkpoint on mock variant. Should
    /// only be used during tests.
    #[doc(hidden)]
    pub fn checkpoint(&mut self) {
        if let Replicas::Mock(replica) = self {
            replica.checkpoint();
        } else {
            panic!("Replica should be mock variant!");
        }
    }
}

impl<M> From<EthereumReplica<M>> for Replicas
where
    M: ethers::providers::Middleware + 'static,
{
    fn from(replica: EthereumReplica<M>) -> Self {
        Replicas::Ethereum(Box::new(replica))
    }
}

impl From<MockReplicaContract> for Replicas {
    fn from(mock_replica: MockReplicaContract) -> Self {
        Replicas::Mock(Box::new(mock_replica))
    }
}

impl From<Box<dyn Replica>> for Replicas {
    fn from(replica: Box<dyn Replica>) -> Self {
        Replicas::Other(replica)
    }
}

#[async_trait]
impl Replica for Replicas {
    fn local_domain(&self) -> u32 {
        match self {
            Replicas::Ethereum(replica) => replica.local_domain(),
            Replicas::Mock(mock_replica) => mock_replica.local_domain(),
            Replicas::Other(replica) => replica.local_domain(),
        }
    }

    async fn remote_domain(&self) -> Result<u32, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.remote_domain().await,
            Replicas::Mock(mock_replica) => mock_replica.remote_domain().await,
            Replicas::Other(replica) => replica.remote_domain().await,
        }
    }

    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.prove(proof).await,
            Replicas::Mock(mock_replica) => mock_replica.prove(proof).await,
            Replicas::Other(replica) => replica.prove(proof).await,
        }
    }

    async fn process(&self, message: &OpticsMessage) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.process(message).await,
            Replicas::Mock(mock_replica) => mock_replica.process(message).await,
            Replicas::Other(replica) => replica.process(message).await,
        }
    }

    async fn message_status(&self, leaf: H256) -> Result<MessageStatus, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.message_status(leaf).await,
            Replicas::Mock(mock_replica) => mock_replica.message_status(leaf).await,
            Replicas::Other(replica) => replica.message_status(leaf).await,
        }
    }

    async fn prove_and_process(
        &self,
        message: &OpticsMessage,
        proof: &Proof,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.prove_and_process(message, proof).await,
            Replicas::Mock(mock_replica) => mock_replica.prove_and_process(message, proof).await,
            Replicas::Other(replica) => replica.prove_and_process(message, proof).await,
        }
    }

    async fn acceptable_root(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.acceptable_root(root).await,
            Replicas::Mock(mock_replica) => mock_replica.acceptable_root(root).await,
            Replicas::Other(replica) => replica.acceptable_root(root).await,
        }
    }
}

#[async_trait]
impl Common for Replicas {
    fn name(&self) -> &str {
        match self {
            Replicas::Ethereum(replica) => replica.name(),
            Replicas::Mock(mock_replica) => mock_replica.name(),
            Replicas::Other(replica) => replica.name(),
        }
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.status(txid).await,
            Replicas::Mock(mock_replica) => mock_replica.status(txid).await,
            Replicas::Other(replica) => replica.status(txid).await,
        }
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.updater().await,
            Replicas::Mock(mock_replica) => mock_replica.updater().await,
            Replicas::Other(replica) => replica.updater().await,
        }
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.state().await,
            Replicas::Mock(mock_replica) => mock_replica.state().await,
            Replicas::Other(replica) => replica.state().await,
        }
    }

    async fn committed_root(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.committed_root().await,
            Replicas::Mock(mock_replica) => mock_replica.committed_root().await,
            Replicas::Other(replica) => replica.committed_root().await,
        }
    }

    #[instrument(fields(update = %update.update))]
    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.update(update).await,
            Replicas::Mock(mock_replica) => mock_replica.update(update).await,
            Replicas::Other(replica) => replica.update(update).await,
        }
    }

    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.double_update(double).await,
            Replicas::Mock(mock_replica) => mock_replica.double_update(double).await,
            Replicas::Other(replica) => replica.double_update(double).await,
        }
    }
}
