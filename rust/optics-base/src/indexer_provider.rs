use async_trait::async_trait;
use color_eyre::Result;
use optics_core::traits::{IndexerProvider, RawCommittedMessage};
use optics_core::SignedUpdateWithMeta;

use optics_ethereum::EthereumIndexerProvider;

#[derive(Debug)]
pub enum IndexerProviders {
    Ethereum(Box<dyn IndexerProvider>),
}

impl<M> From<EthereumIndexerProvider<M>> for IndexerProviders
where
    M: ethers::providers::Middleware + 'static,
{
    fn from(indexer_provider: EthereumIndexerProvider<M>) -> Self {
        IndexerProviders::Ethereum(Box::new(indexer_provider))
    }
}

#[async_trait]
impl IndexerProvider for IndexerProviders {
    async fn get_block_number(&self) -> Result<u32> {
        match self {
            IndexerProviders::Ethereum(provider) => provider.get_block_number().await,
        }
    }

    async fn get_updates_with_meta(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        match self {
            IndexerProviders::Ethereum(provider) => provider.get_updates_with_meta(from, to).await,
        }
    }

    async fn get_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        match self {
            IndexerProviders::Ethereum(provider) => provider.get_messages(from, to).await,
        }
    }
}
