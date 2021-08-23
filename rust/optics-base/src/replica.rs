use async_trait::async_trait;
use ethers::core::types::{H256, U256};
use optics_core::{
    accumulator::merkle::Proof,
    traits::{
        ChainCommunicationError, Common, DoubleUpdate, MessageStatus, Replica, State, TxOutcome,
    },
    OpticsMessage, SignedUpdate,
};

use optics_ethereum::EthereumReplica;
use optics_test::mocks::MockReplicaContract;

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

    async fn next_pending(&self) -> Result<Option<(H256, U256)>, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.next_pending().await,
            Replicas::Mock(mock_replica) => mock_replica.next_pending().await,
            Replicas::Other(replica) => replica.next_pending().await,
        }
    }

    async fn can_confirm(&self) -> Result<bool, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.can_confirm().await,
            Replicas::Mock(mock_replica) => mock_replica.can_confirm().await,
            Replicas::Other(replica) => replica.can_confirm().await,
        }
    }

    async fn confirm(&self) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.confirm().await,
            Replicas::Mock(mock_replica) => mock_replica.confirm().await,
            Replicas::Other(replica) => replica.confirm().await,
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

    async fn queue_end(&self) -> Result<Option<H256>, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.queue_end().await,
            Replicas::Mock(mock_replica) => mock_replica.queue_end().await,
            Replicas::Other(replica) => replica.queue_end().await,
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

    async fn current_root(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.current_root().await,
            Replicas::Mock(mock_replica) => mock_replica.current_root().await,
            Replicas::Other(replica) => replica.current_root().await,
        }
    }

    async fn signed_update_by_old_root(
        &self,
        old_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.signed_update_by_old_root(old_root).await,
            Replicas::Mock(mock_replica) => mock_replica.signed_update_by_old_root(old_root).await,
            Replicas::Other(replica) => replica.signed_update_by_old_root(old_root).await,
        }
    }

    async fn signed_update_by_new_root(
        &self,
        new_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        match self {
            Replicas::Ethereum(replica) => replica.signed_update_by_new_root(new_root).await,
            Replicas::Mock(mock_replica) => mock_replica.signed_update_by_new_root(new_root).await,
            Replicas::Other(replica) => replica.signed_update_by_new_root(new_root).await,
        }
    }

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
