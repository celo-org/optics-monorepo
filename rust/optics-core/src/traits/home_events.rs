use async_trait::async_trait;
use color_eyre::Result;

use crate::{traits::RawCommittedMessage, SignedUpdateWithMeta};

/// Interface for retrieving event data from a home contract
#[async_trait]
pub trait HomeEventProvider: Send + Sync + std::fmt::Debug {
    /// Return updates with metadata between blocks `to` to `from`
    async fn get_updates_with_meta(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>>;

    /// Return raw committed messages between blocks `to` to `from`
    async fn get_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>>;
}