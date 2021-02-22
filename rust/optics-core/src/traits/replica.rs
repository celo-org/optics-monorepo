use async_trait::async_trait;
use ethers::core::types::{H256, U256};

use crate::{
    accumulator::prover::Proof,
    traits::{ChainCommunicationError, Common, TxOutcome},
    StampedMessage,
};

/// Interface for on-chain replicas
#[async_trait]
pub trait Replica: Common + Send + Sync + std::fmt::Debug {
    /// Return the replica domain ID
    fn destination_domain(&self) -> u32;

    /// Return the pending root and time, if any
    async fn next_pending(&self) -> Result<Option<(H256, U256)>, ChainCommunicationError>;

    /// Returns true/false based on whether or not pending root's time has elapsed
    async fn can_confirm(&self) -> Result<bool, ChainCommunicationError>;

    /// Confirm the next pending root (after its timer has elapsed);
    async fn confirm(&self) -> Result<TxOutcome, ChainCommunicationError>;

    /// Fetch the previous root.
    async fn previous_root(&self) -> Result<H256, ChainCommunicationError>;

    /// Fetch the last processed sequence number
    async fn last_processed(&self) -> Result<U256, ChainCommunicationError>;

    /// Dispatch a transaction to prove inclusion of some leaf in the replica.
    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError>;

    /// Trigger processing of a message
    async fn process(&self, message: &StampedMessage)
        -> Result<TxOutcome, ChainCommunicationError>;

    /// Prove a leaf in the replica and then process its message
    async fn prove_and_process(
        &self,
        message: &StampedMessage,
        proof: &Proof,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self.prove(proof).await?;

        Ok(self.process(message).await?)
    }
}
