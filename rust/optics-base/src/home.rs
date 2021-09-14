use async_trait::async_trait;
use color_eyre::Result;
use ethers::core::types::H256;
use optics_core::{
    traits::{
        ChainCommunicationError, Common, DoubleUpdate, Home, RawCommittedMessage, State, TxOutcome,
    },
    Message, SignedUpdate, Update,
};
use optics_ethereum::EthereumHome;
use optics_test::mocks::MockHomeContract;
use tracing::{instrument, instrument::Instrumented};

/// Home type
#[derive(Debug)]
pub enum Homes {
    /// Ethereum home contract
    Ethereum(Box<dyn Home>),
    /// Mock home contract
    Mock(Box<MockHomeContract>),
    /// Other home variant
    Other(Box<dyn Home>),
}

impl Homes {
    /// Calls checkpoint on mock variant. Should
    /// only be used during tests.
    #[doc(hidden)]
    pub fn checkpoint(&mut self) {
        if let Homes::Mock(home) = self {
            home.checkpoint();
        } else {
            panic!("Home should be mock variant!");
        }
    }
}

impl<M> From<EthereumHome<M>> for Homes
where
    M: ethers::providers::Middleware + 'static,
{
    fn from(home: EthereumHome<M>) -> Self {
        Homes::Ethereum(Box::new(home))
    }
}

impl From<MockHomeContract> for Homes {
    fn from(mock_home: MockHomeContract) -> Self {
        Homes::Mock(Box::new(mock_home))
    }
}

impl From<Box<dyn Home>> for Homes {
    fn from(home: Box<dyn Home>) -> Self {
        Homes::Other(home)
    }
}

#[async_trait]
impl Home for Homes {
    fn local_domain(&self) -> u32 {
        match self {
            Homes::Ethereum(home) => home.local_domain(),
            Homes::Mock(mock_home) => mock_home.local_domain(),
            Homes::Other(home) => home.local_domain(),
        }
    }

    fn index(
        &self,
        from_height: u32,
        chunk_size: u32,
        metric: prometheus::IntGauge,
    ) -> Instrumented<tokio::task::JoinHandle<color_eyre::Result<()>>> {
        match self {
            Homes::Ethereum(home) => home.index(from_height, chunk_size, metric),
            Homes::Mock(mock_home) => mock_home.index(from_height, chunk_size, metric),
            Homes::Other(home) => home.index(from_height, chunk_size, metric),
        }
    }

    fn home_domain_hash(&self) -> H256 {
        match self {
            Homes::Ethereum(home) => home.home_domain_hash(),
            Homes::Mock(mock_home) => mock_home.home_domain_hash(),
            Homes::Other(home) => home.home_domain_hash(),
        }
    }

    #[instrument(level = "trace", err)]
    async fn raw_message_by_nonce(
        &self,
        destination: u32,
        nonce: u32,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.raw_message_by_nonce(destination, nonce).await,
            Homes::Mock(mock_home) => mock_home.raw_message_by_nonce(destination, nonce).await,
            Homes::Other(home) => home.raw_message_by_nonce(destination, nonce).await,
        }
    }

    #[instrument(level = "trace", err)]
    async fn raw_message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.raw_message_by_leaf(leaf).await,
            Homes::Mock(mock_home) => mock_home.raw_message_by_leaf(leaf).await,
            Homes::Other(home) => home.raw_message_by_leaf(leaf).await,
        }
    }

    #[instrument(level = "trace", err)]
    async fn leaf_by_tree_index(
        &self,
        tree_index: usize,
    ) -> Result<Option<H256>, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.leaf_by_tree_index(tree_index).await,
            Homes::Mock(mock_home) => mock_home.leaf_by_tree_index(tree_index).await,
            Homes::Other(home) => home.leaf_by_tree_index(tree_index).await,
        }
    }

    #[instrument(level = "trace", err)]
    async fn nonces(&self, destination: u32) -> Result<u32, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.nonces(destination).await,
            Homes::Mock(mock_home) => mock_home.nonces(destination).await,
            Homes::Other(home) => home.nonces(destination).await,
        }
    }

    #[instrument(level = "trace", err)]
    async fn dispatch(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.dispatch(message).await,
            Homes::Mock(mock_home) => mock_home.dispatch(message).await,
            Homes::Other(home) => home.dispatch(message).await,
        }
    }

    async fn queue_contains(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.queue_contains(root).await,
            Homes::Mock(mock_home) => mock_home.queue_contains(root).await,
            Homes::Other(home) => home.queue_contains(root).await,
        }
    }

    async fn improper_update(
        &self,
        update: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.improper_update(update).await,
            Homes::Mock(mock_home) => mock_home.improper_update(update).await,
            Homes::Other(home) => home.improper_update(update).await,
        }
    }

    #[instrument(err)]
    async fn produce_update(&self) -> Result<Option<Update>, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.produce_update().await,
            Homes::Mock(mock_home) => mock_home.produce_update().await,
            Homes::Other(home) => home.produce_update().await,
        }
    }
}

#[async_trait]
impl Common for Homes {
    fn name(&self) -> &str {
        match self {
            Homes::Ethereum(home) => home.name(),
            Homes::Mock(mock_home) => mock_home.name(),
            Homes::Other(home) => home.name(),
        }
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.status(txid).await,
            Homes::Mock(mock_home) => mock_home.status(txid).await,
            Homes::Other(home) => home.status(txid).await,
        }
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.updater().await,
            Homes::Mock(mock_home) => mock_home.updater().await,
            Homes::Other(home) => home.updater().await,
        }
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.state().await,
            Homes::Mock(mock_home) => mock_home.state().await,
            Homes::Other(home) => home.state().await,
        }
    }

    async fn committed_root(&self) -> Result<H256, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.committed_root().await,
            Homes::Mock(mock_home) => mock_home.committed_root().await,
            Homes::Other(home) => home.committed_root().await,
        }
    }

    async fn signed_update_by_old_root(
        &self,
        old_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.signed_update_by_old_root(old_root).await,
            Homes::Mock(mock_home) => mock_home.signed_update_by_old_root(old_root).await,
            Homes::Other(home) => home.signed_update_by_old_root(old_root).await,
        }
    }

    async fn signed_update_by_new_root(
        &self,
        new_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.signed_update_by_new_root(new_root).await,
            Homes::Mock(mock_home) => mock_home.signed_update_by_new_root(new_root).await,
            Homes::Other(home) => home.signed_update_by_new_root(new_root).await,
        }
    }

    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.update(update).await,
            Homes::Mock(mock_home) => mock_home.update(update).await,
            Homes::Other(home) => home.update(update).await,
        }
    }

    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            Homes::Ethereum(home) => home.double_update(double).await,
            Homes::Mock(mock_home) => mock_home.double_update(double).await,
            Homes::Other(home) => home.double_update(double).await,
        }
    }
}
