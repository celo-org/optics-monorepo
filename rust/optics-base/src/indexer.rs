use async_trait::async_trait;
use color_eyre::Result;
use optics_core::{Indexer, RawCommittedMessage, SignedUpdateWithMeta};

/// Home/Replica Indexer type
#[derive(Debug)]
pub enum Indexers {
    /// Ethereum contract indexer
    Ethereum(Box<dyn Indexer>),
    /// Other indexer variant
    Other(Box<dyn Indexer>),
}

#[async_trait]
impl Indexer for Indexers {
    fn contract_name(&self) -> &str {
        match self {
            Indexers::Ethereum(indexer) => indexer.contract_name(),
            Indexers::Other(indexer) => indexer.contract_name(),
        }
    }

    async fn get_block_number(&self) -> Result<u32> {
        match self {
            Indexers::Ethereum(indexer) => indexer.get_block_number().await,
            Indexers::Other(indexer) => indexer.get_block_number().await,
        }
    }

    async fn fetch_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        match self {
            Indexers::Ethereum(indexer) => indexer.fetch_updates(from, to).await,
            Indexers::Other(indexer) => indexer.fetch_updates(from, to).await,
        }
    }

    async fn fetch_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        match self {
            Indexers::Ethereum(indexer) => indexer.fetch_messages(from, to).await,
            Indexers::Other(indexer) => indexer.fetch_messages(from, to).await,
        }
    }
}
