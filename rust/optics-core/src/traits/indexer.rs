use async_trait::async_trait;
use color_eyre::Result;

use crate::{RawCommittedMessage, SignedUpdateWithMeta};

#[async_trait]
/// Interface for Common contract indexer. Chain-specific homes and replicas
/// should implement this trait so that the generalized Home/Replica structs
/// can extract and store update event data.
pub trait CommonIndexer: Send + Sync + std::fmt::Debug {
    /// Get chain's latest block number
    async fn get_block_number(&self) -> Result<u32>;

    /// Fetch sequentially sorted list of updates between blocks `from` and `to`
    async fn fetch_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>>;
}

#[async_trait]
/// Interface for Home contract indexer. Chain-specific homes implement this
/// trait so that the generalized Home/Replica structs can extract and store
/// update and message event data.
pub trait HomeIndexer: CommonIndexer + Send + Sync + std::fmt::Debug {
    /// Fetch list of messages between blocks `from` and `to`.
    async fn fetch_messages(&self, _from: u32, _to: u32) -> Result<Vec<RawCommittedMessage>>;
}
