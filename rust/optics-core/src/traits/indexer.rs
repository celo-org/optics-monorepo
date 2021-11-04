//! An Indexer provides a common interface for bubbling up chain-specific
//! event-data to another entity (e.g. a `ContractSync`). For example, the only
//! way to retrieve data such as the chain's latest block number or a list of
//! updates/messages emitted within a certain block range by calling out to a
//! chain-specific library and provider (e.g. ethers::provider). A
//! chain-specific home or replica should implement one or both of the Indexer
//! traits (CommonIndexer or HomeIndexer) to provide an common interface which
//! other entities can retrieve this chain-specific info.

use async_trait::async_trait;
use color_eyre::Result;

use crate::{RawCommittedMessage, SignedUpdateWithMeta};

/// Interface for Common contract indexer. Interface that allows for other
/// entities to retrieve chain-specific data from a home or replica.
#[async_trait]
pub trait CommonIndexer: Send + Sync + std::fmt::Debug {
    /// Get chain's latest block number
    async fn get_block_number(&self) -> Result<u32>;

    /// Fetch sequentially sorted list of updates between blocks `from` and `to`
    async fn fetch_sorted_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>>;
}

/// Interface for Home contract indexer. Interface for allowing other
/// entities to retrieve chain-specific data from a home.
#[async_trait]
pub trait HomeIndexer: CommonIndexer + Send + Sync + std::fmt::Debug {
    /// Fetch list of messages between blocks `from` and `to`.
    async fn fetch_sorted_messages(&self, _from: u32, _to: u32)
        -> Result<Vec<RawCommittedMessage>>;
}
