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
use tracing::{info_span, Instrument};
use tracing::{instrument, instrument::Instrumented};

use crate::{CommonIndexers, ContractSync};

/// Caching replica type
#[derive(Debug)]
pub struct CachingReplica {
    replica: Replicas,
    db: OpticsDB,
    indexer: Arc<CommonIndexers>,
}

impl std::fmt::Display for CachingReplica {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl CachingReplica {
    /// Instantiate new CachingReplica
    pub fn new(replica: Replicas, db: OpticsDB, indexer: Arc<CommonIndexers>) -> Self {
        Self {
            replica,
            db,
            indexer,
        }
    }

    /// Return handle on home object
    pub fn replica(&self) -> Replicas {
        self.replica.clone()
    }

    /// Return handle on OpticsDB
    pub fn db(&self) -> OpticsDB {
        self.db.clone()
    }

    /// Spawn a task that syncs the CachingReplica's db with the on-chain event
    /// data
    pub fn sync(
        &self,
        from_height: u32,
        chunk_size: u32,
        indexed_height: prometheus::IntGauge,
    ) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("ReplicaContractSync", self = %self);

        let sync = ContractSync::new(
            self.db.clone(),
            String::from_str(self.replica.name()).expect("!string"),
            self.indexer.clone(),
            from_height,
            chunk_size,
            indexed_height,
        );

        tokio::spawn(async move {
            let _ = sync.sync_updates().await?;
            Ok(())
        })
        .instrument(span)
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
            if let Some(update) = self.db.update_by_previous_root(old_root)? {
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
            if let Some(update) = self.db.update_by_new_root(new_root)? {
                return Ok(Some(update));
            }
            sleep(Duration::from_millis(500)).await;
        }
    }
}

#[derive(Debug, Clone)]
/// Arc wrapper for ReplicaVariants enum
pub struct Replicas(Arc<ReplicaVariants>);

impl From<ReplicaVariants> for Replicas {
    fn from(homes: ReplicaVariants) -> Self {
        Self(Arc::new(homes))
    }
}

impl std::ops::Deref for Replicas {
    type Target = Arc<ReplicaVariants>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl std::ops::DerefMut for Replicas {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

/// Replica type
#[derive(Debug)]
pub enum ReplicaVariants {
    /// Ethereum replica contract
    Ethereum(Box<dyn Replica>),
    /// Mock replica contract
    Mock(Box<MockReplicaContract>),
    /// Other replica variant
    Other(Box<dyn Replica>),
}

impl ReplicaVariants {
    /// Calls checkpoint on mock variant. Should
    /// only be used during tests.
    #[doc(hidden)]
    pub fn checkpoint(&mut self) {
        if let ReplicaVariants::Mock(replica) = self {
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
        ReplicaVariants::Ethereum(Box::new(replica)).into()
    }
}

impl From<MockReplicaContract> for Replicas {
    fn from(mock_replica: MockReplicaContract) -> Self {
        ReplicaVariants::Mock(Box::new(mock_replica)).into()
    }
}

impl From<Box<dyn Replica>> for Replicas {
    fn from(replica: Box<dyn Replica>) -> Self {
        ReplicaVariants::Other(replica).into()
    }
}

#[async_trait]
impl Replica for ReplicaVariants {
    fn local_domain(&self) -> u32 {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.local_domain(),
            ReplicaVariants::Mock(mock_replica) => mock_replica.local_domain(),
            ReplicaVariants::Other(replica) => replica.local_domain(),
        }
    }

    async fn remote_domain(&self) -> Result<u32, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.remote_domain().await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.remote_domain().await,
            ReplicaVariants::Other(replica) => replica.remote_domain().await,
        }
    }

    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.prove(proof).await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.prove(proof).await,
            ReplicaVariants::Other(replica) => replica.prove(proof).await,
        }
    }

    async fn process(&self, message: &OpticsMessage) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.process(message).await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.process(message).await,
            ReplicaVariants::Other(replica) => replica.process(message).await,
        }
    }

    async fn message_status(&self, leaf: H256) -> Result<MessageStatus, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.message_status(leaf).await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.message_status(leaf).await,
            ReplicaVariants::Other(replica) => replica.message_status(leaf).await,
        }
    }

    async fn prove_and_process(
        &self,
        message: &OpticsMessage,
        proof: &Proof,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.prove_and_process(message, proof).await,
            ReplicaVariants::Mock(mock_replica) => {
                mock_replica.prove_and_process(message, proof).await
            }
            ReplicaVariants::Other(replica) => replica.prove_and_process(message, proof).await,
        }
    }

    async fn acceptable_root(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.acceptable_root(root).await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.acceptable_root(root).await,
            ReplicaVariants::Other(replica) => replica.acceptable_root(root).await,
        }
    }
}

#[async_trait]
impl Common for ReplicaVariants {
    fn name(&self) -> &str {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.name(),
            ReplicaVariants::Mock(mock_replica) => mock_replica.name(),
            ReplicaVariants::Other(replica) => replica.name(),
        }
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.status(txid).await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.status(txid).await,
            ReplicaVariants::Other(replica) => replica.status(txid).await,
        }
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.updater().await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.updater().await,
            ReplicaVariants::Other(replica) => replica.updater().await,
        }
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.state().await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.state().await,
            ReplicaVariants::Other(replica) => replica.state().await,
        }
    }

    async fn committed_root(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.committed_root().await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.committed_root().await,
            ReplicaVariants::Other(replica) => replica.committed_root().await,
        }
    }

    #[instrument(fields(update = %update.update))]
    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.update(update).await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.update(update).await,
            ReplicaVariants::Other(replica) => replica.update(update).await,
        }
    }

    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ReplicaVariants::Ethereum(replica) => replica.double_update(double).await,
            ReplicaVariants::Mock(mock_replica) => mock_replica.double_update(double).await,
            ReplicaVariants::Other(replica) => replica.double_update(double).await,
        }
    }
}
