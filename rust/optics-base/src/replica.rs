use async_trait::async_trait;
use ethers::core::types::{H256, U256};
use optics_core::{
    StampedMessage,
    accumulator::prover::Proof,
    traits::{
        ChainCommunicationError, Common, DoubleUpdate, Replica, State,
        TxOutcome,
    },
    SignedUpdate,
};

use optics_test::mocks::MockReplicaContract;

/// Replica type
#[derive(Debug)]
pub enum Replicas {
    /// Ethereum replica contract
    EthereumReplica(Box<dyn Replica>),
    /// Mock replica contract
    MockReplica(MockReplicaContract),
}

#[async_trait]
impl Replica for Replicas {
    fn destination_domain(&self) -> u32 {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.destination_domain(),
            Replicas::MockReplica(mock_contract) => mock_contract.destination_domain(),
        }
    }

    async fn next_pending(&self) -> Result<Option<(H256, U256)>, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.next_pending().await,
            Replicas::MockReplica(mock_contract) => mock_contract.next_pending().await,
        }
    }

    async fn can_confirm(&self) -> Result<bool, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.can_confirm().await,
            Replicas::MockReplica(mock_contract) => mock_contract.can_confirm().await,
        }
    }

    async fn confirm(&self) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.confirm().await,
            Replicas::MockReplica(mock_contract) => mock_contract.confirm().await,
        }
    }

    async fn previous_root(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.previous_root().await,
            Replicas::MockReplica(mock_contract) => mock_contract.previous_root().await,
        }
    }

    async fn last_processed(&self) -> Result<U256, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.last_processed().await,
            Replicas::MockReplica(mock_contract) => mock_contract.last_processed().await,
        }
    }

    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.prove(proof).await,
            Replicas::MockReplica(mock_contract) => mock_contract.prove(proof).await,
        }
    }

    async fn process(&self, message: &StampedMessage)
        -> Result<TxOutcome, ChainCommunicationError> {
            match self {
                Replicas::EthereumReplica(replica_contract) => replica_contract.process(message).await,
                Replicas::MockReplica(mock_contract) => mock_contract.process(message).await,
            }
        }

}

#[async_trait]
impl Common for Replicas {
    fn name(&self) -> &str {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.name(),
            Replicas::MockReplica(mock_contract) => mock_contract.name(),
        }
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.status(txid).await,
            Replicas::MockReplica(mock_contract) => mock_contract.status(txid).await,
        }
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.updater().await,
            Replicas::MockReplica(mock_contract) => mock_contract.updater().await,
        }
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.state().await,
            Replicas::MockReplica(mock_contract) => mock_contract.state().await,
        }
    }

    async fn current_root(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.current_root().await,
            Replicas::MockReplica(mock_contract) => mock_contract.current_root().await,
        }
    }

    async fn signed_update_by_old_root(
        &self,
        old_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => {
                replica_contract.signed_update_by_old_root(old_root).await
            },
            Replicas::MockReplica(mock_contract) => mock_contract.signed_update_by_old_root(old_root).await,
        }
    }

    async fn signed_update_by_new_root(
        &self,
        new_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => {
                replica_contract.signed_update_by_new_root(new_root).await
            },
            Replicas::MockReplica(mock_contract) => mock_contract.signed_update_by_new_root(new_root).await,
        }
    }

    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.update(update).await,
            Replicas::MockReplica(mock_contract) => mock_contract.update(update).await,
        }
    }

    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Replicas::EthereumReplica(replica_contract) => replica_contract.double_update(double).await,
            Replicas::MockReplica(mock_contract) => mock_contract.double_update(double).await,
        }
    }
}