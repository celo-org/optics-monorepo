use async_trait::async_trait;
use color_eyre::Result;
use optics_core::{Indexer, RawCommittedMessage, SignedUpdateWithMeta};
use optics_test::mocks::MockIndexer;

/// Home/Replica Indexer type
#[derive(Debug)]
pub enum Indexers {
    /// Ethereum contract indexer
    Ethereum(Box<dyn Indexer>),
    /// Mock indexer
    Mock(Box<dyn Indexer>),
    /// Other indexer variant
    Other(Box<dyn Indexer>),
}

impl From<MockIndexer> for Indexers {
    fn from(mock_indexer: MockIndexer) -> Self {
        Indexers::Mock(Box::new(mock_indexer))
    }
}

#[async_trait]
impl Indexer for Indexers {
    async fn get_block_number(&self) -> Result<u32> {
        match self {
            Indexers::Ethereum(indexer) => indexer.get_block_number().await,
            Indexers::Mock(indexer) => indexer.get_block_number().await,
            Indexers::Other(indexer) => indexer.get_block_number().await,
        }
    }

    async fn fetch_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        match self {
            Indexers::Ethereum(indexer) => indexer.fetch_updates(from, to).await,
            Indexers::Mock(indexer) => indexer.fetch_updates(from, to).await,
            Indexers::Other(indexer) => indexer.fetch_updates(from, to).await,
        }
    }

    async fn fetch_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        match self {
            Indexers::Ethereum(indexer) => indexer.fetch_messages(from, to).await,
            Indexers::Mock(indexer) => indexer.fetch_messages(from, to).await,
            Indexers::Other(indexer) => indexer.fetch_messages(from, to).await,
        }
    }
}
