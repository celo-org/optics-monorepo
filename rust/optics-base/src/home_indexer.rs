use async_trait::async_trait;
use color_eyre::Result;
use optics_core::traits::{HomeIndexer, RawCommittedMessage};
use optics_core::SignedUpdateWithMeta;

use optics_ethereum::EthereumHomeIndexer;

/// Provides event data from a chain
#[derive(Debug)]
pub enum HomeIndexers {
    /// Ethereum home indexer
    Ethereum(Box<dyn HomeIndexer>),
}

impl<M> From<EthereumHomeIndexer<M>> for HomeIndexers
where
    M: ethers::providers::Middleware + 'static,
{
    fn from(home_indexer: EthereumHomeIndexer<M>) -> Self {
        HomeIndexers::Ethereum(Box::new(home_indexer))
    }
}

#[async_trait]
impl HomeIndexer for HomeIndexers {
    async fn get_block_number(&self) -> Result<u32> {
        match self {
            HomeIndexers::Ethereum(provider) => provider.get_block_number().await,
        }
    }

    async fn get_updates_with_meta(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        match self {
            HomeIndexers::Ethereum(provider) => provider.get_updates_with_meta(from, to).await,
        }
    }

    async fn get_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        match self {
            HomeIndexers::Ethereum(provider) => provider.get_messages(from, to).await,
        }
    }
}
