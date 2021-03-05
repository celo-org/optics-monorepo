use async_trait::async_trait;
use ethers::core::types::H256;
use optics_core::{
    traits::{
        ChainCommunicationError, Common, DoubleUpdate, Home, RawCommittedMessage, State, TxOutcome,
    },
    Message, SignedUpdate, Update,
};

use optics_test::mocks::MockHomeContract;

/// Home type
#[derive(Debug)]
pub enum Homes {
    /// Ethereum home contract
    EthereumHome(Box<dyn Home>),
    /// Mock home contract
    MockHome(MockHomeContract),
}

impl From<Box<dyn Home>> for Homes {
    fn from(home: Box<dyn Home>) -> Self {
        Homes::EthereumHome(home)
    }
}

impl From<MockHomeContract> for Homes {
    fn from(mock_home: MockHomeContract) -> Self {
        Homes::MockHome(mock_home)
    }
}

#[async_trait]
impl Home for Homes {
    fn origin_domain(&self) -> u32 {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.origin_domain(),
            Homes::MockHome(mock_home) => mock_home.origin_domain(),
        }
    }

    fn domain_hash(&self) -> H256 {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.domain_hash(),
            Homes::MockHome(mock_home) => mock_home.domain_hash(),
        }
    }

    async fn raw_message_by_sequence(
        &self,
        destination: u32,
        sequence: u32,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => {
                home_contract
                    .raw_message_by_sequence(destination, sequence)
                    .await
            }
            Homes::MockHome(mock_home) => {
                mock_home
                    .raw_message_by_sequence(destination, sequence)
                    .await
            }
        }
    }

    async fn raw_message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.raw_message_by_leaf(leaf).await,
            Homes::MockHome(mock_home) => mock_home.raw_message_by_leaf(leaf).await,
        }
    }

    async fn leaf_by_tree_index(
        &self,
        tree_index: usize,
    ) -> Result<Option<H256>, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => {
                home_contract.leaf_by_tree_index(tree_index).await
            }
            Homes::MockHome(mock_home) => mock_home.leaf_by_tree_index(tree_index).await,
        }
    }

    async fn sequences(&self, destination: u32) -> Result<u32, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.sequences(destination).await,
            Homes::MockHome(mock_home) => mock_home.sequences(destination).await,
        }
    }

    async fn enqueue(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.enqueue(message).await,
            Homes::MockHome(mock_home) => mock_home.enqueue(message).await,
        }
    }

    async fn improper_update(
        &self,
        update: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.improper_update(update).await,
            Homes::MockHome(mock_home) => mock_home.improper_update(update).await,
        }
    }

    async fn produce_update(&self) -> Result<Option<Update>, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.produce_update().await,
            Homes::MockHome(mock_home) => mock_home.produce_update().await,
        }
    }
}

#[async_trait]
impl Common for Homes {
    fn name(&self) -> &str {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.name(),
            Homes::MockHome(mock_home) => mock_home.name(),
        }
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.status(txid).await,
            Homes::MockHome(mock_home) => mock_home.status(txid).await,
        }
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.updater().await,
            Homes::MockHome(mock_home) => mock_home.updater().await,
        }
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.state().await,
            Homes::MockHome(mock_home) => mock_home.state().await,
        }
    }

    async fn current_root(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.current_root().await,
            Homes::MockHome(mock_home) => mock_home.current_root().await,
        }
    }

    async fn signed_update_by_old_root(
        &self,
        old_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => {
                home_contract.signed_update_by_old_root(old_root).await
            }
            Homes::MockHome(mock_home) => mock_home.signed_update_by_old_root(old_root).await,
        }
    }

    async fn signed_update_by_new_root(
        &self,
        new_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => {
                home_contract.signed_update_by_new_root(new_root).await
            }
            Homes::MockHome(mock_home) => mock_home.signed_update_by_new_root(new_root).await,
        }
    }

    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.update(update).await,
            Homes::MockHome(mock_home) => mock_home.update(update).await,
        }
    }

    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Homes::EthereumHome(home_contract) => home_contract.double_update(double).await,
            Homes::MockHome(mock_home) => mock_home.double_update(double).await,
        }
    }
}
