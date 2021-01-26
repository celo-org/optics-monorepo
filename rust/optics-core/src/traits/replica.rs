use async_trait::async_trait;
use ethers::core::types::{H256, U256};

use crate::{
    traits::{ChainCommunicationError, Common, TxOutcome},
    Message,
};

/// Interface for on-chain replicas
#[async_trait]
pub trait Replica: Common + Send + Sync + std::fmt::Debug {
    /// Return the replica slip44 ID
    fn destination_slip44(&self) -> u32;

    /// Return the pending root and time, if any
    async fn next_pending(&self) -> Result<Option<(H256, U256)>, ChainCommunicationError>;

    /// Confirm the next pending root (after its timer has elapsed);
    async fn confirm(&self) -> Result<TxOutcome, ChainCommunicationError>;

    /// Fetch the previous root.
    async fn previous_root(&self) -> Result<H256, ChainCommunicationError>;

    /// Dispatch a transaction to prove inclusion of some leaf in the replica.
    async fn prove(
        &self,
        leaf: H256,
        index: u32,
        proof: [H256; 32],
    ) -> Result<TxOutcome, ChainCommunicationError>;

    /// Trigger processing of a message
    async fn process(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError>;
}
