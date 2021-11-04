use async_trait::async_trait;
use color_eyre::Result;
use optics_core::{CommonIndexer, HomeIndexer, RawCommittedMessage, SignedUpdateWithMeta};
use optics_test::mocks::MockIndexer;

/// Home/Replica CommonIndexer type
#[derive(Debug)]
pub enum CommonIndexers {
    /// Ethereum contract indexer
    Ethereum(Box<dyn CommonIndexer>),
    /// Mock indexer
    Mock(Box<dyn CommonIndexer>),
    /// Other indexer variant
    Other(Box<dyn CommonIndexer>),
}

impl From<MockIndexer> for CommonIndexers {
    fn from(mock_indexer: MockIndexer) -> Self {
        CommonIndexers::Mock(Box::new(mock_indexer))
    }
}

#[async_trait]
impl CommonIndexer for CommonIndexers {
    async fn get_block_number(&self) -> Result<u32> {
        match self {
            CommonIndexers::Ethereum(indexer) => indexer.get_block_number().await,
            CommonIndexers::Mock(indexer) => indexer.get_block_number().await,
            CommonIndexers::Other(indexer) => indexer.get_block_number().await,
        }
    }

    async fn fetch_sorted_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        match self {
            CommonIndexers::Ethereum(indexer) => indexer.fetch_sorted_updates(from, to).await,
            CommonIndexers::Mock(indexer) => indexer.fetch_sorted_updates(from, to).await,
            CommonIndexers::Other(indexer) => indexer.fetch_sorted_updates(from, to).await,
        }
    }
}

/// HomeIndexer type
#[derive(Debug)]
pub enum HomeIndexers {
    /// Ethereum contract indexer
    Ethereum(Box<dyn HomeIndexer>),
    /// Mock indexer
    Mock(Box<dyn HomeIndexer>),
    /// Other indexer variant
    Other(Box<dyn HomeIndexer>),
}

impl From<MockIndexer> for HomeIndexers {
    fn from(mock_indexer: MockIndexer) -> Self {
        HomeIndexers::Mock(Box::new(mock_indexer))
    }
}

#[async_trait]
impl CommonIndexer for HomeIndexers {
    async fn get_block_number(&self) -> Result<u32> {
        match self {
            HomeIndexers::Ethereum(indexer) => indexer.get_block_number().await,
            HomeIndexers::Mock(indexer) => indexer.get_block_number().await,
            HomeIndexers::Other(indexer) => indexer.get_block_number().await,
        }
    }

    async fn fetch_sorted_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        match self {
            HomeIndexers::Ethereum(indexer) => indexer.fetch_sorted_updates(from, to).await,
            HomeIndexers::Mock(indexer) => indexer.fetch_sorted_updates(from, to).await,
            HomeIndexers::Other(indexer) => indexer.fetch_sorted_updates(from, to).await,
        }
    }
}

#[async_trait]
impl HomeIndexer for HomeIndexers {
    async fn fetch_sorted_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        match self {
            HomeIndexers::Ethereum(indexer) => indexer.fetch_sorted_messages(from, to).await,
            HomeIndexers::Mock(indexer) => indexer.fetch_sorted_messages(from, to).await,
            HomeIndexers::Other(indexer) => indexer.fetch_sorted_messages(from, to).await,
        }
    }
}
