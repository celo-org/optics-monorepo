use async_trait::async_trait;
use color_eyre::Result;

use crate::{RawCommittedMessage, SignedUpdateWithMeta};

#[async_trait]
/// Interface for the a contract indexer. Chain-specific homes and replicas
/// should implement this trait so that the generalized Home/Replica structs
/// can extract and store event data.
pub trait Indexer: Send + Sync + std::fmt::Debug {
    /// Get chain's latest block number
    async fn get_block_number(&self) -> Result<u32>;

    /// Fetch sequentially sorted list of updates between blocks `from` and `to`
    async fn fetch_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>>;

    /// Fetch list of messages between blocks `from` and `to`. Return an empty
    /// vec by default (behavior for replica). Must override this method for a
    /// home indexer.
    async fn fetch_messages(&self, _from: u32, _to: u32) -> Result<Vec<RawCommittedMessage>> {
        Ok(Vec::new())
    }
}
