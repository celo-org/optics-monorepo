use async_trait::async_trait;
use color_eyre::Result;

use crate::{RawCommittedMessage, SignedUpdateWithMeta};

#[async_trait]
/// Interface for the a contract indexer. Chain-specific homes and replicas
/// should implement this trait so that the generalized Home/Replica structs
/// can extract and store event data.
pub trait Indexer: Send + Sync + std::fmt::Debug {
    /// Get contract name (home or replica name)
    fn contract_name(&self) -> &str;

    /// Get chain's latest block number
    async fn get_block_number(&self) -> Result<u32>;

    /// Fetch sequentially sorted list of updates between blocks `from` and `to`
    async fn fetch_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>>;

    /// Fetch list of messages between blocks `from` and `to`
    async fn fetch_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>>;
}
