use async_trait::async_trait;
use ethers::core::types::H256;

use crate::{
    accumulator::merkle::Proof,
    traits::{ChainCommunicationError, Common, TxOutcome},
    OpticsMessage,
};

/// The status of a message in the replica
#[repr(u8)]
pub enum MessageStatus {
    /// Message is unknown
    None = 0,
    /// Message has been proven but not processed
    Proven = 1,
    /// Message has been processed
    Processed = 2,
}

/// Interface for on-chain replicas
#[async_trait]
pub trait Replica: Common + Send + Sync + std::fmt::Debug {
    /// Return the replica domain ID
    fn local_domain(&self) -> u32;

    /// Return the domain of the replica's linked home
    async fn remote_domain(&self) -> Result<u32, ChainCommunicationError>;

    /// Dispatch a transaction to prove inclusion of some leaf in the replica.
    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError>;

    /// Trigger processing of a message
    async fn process(&self, message: &OpticsMessage) -> Result<TxOutcome, ChainCommunicationError>;

    /// Prove a leaf in the replica and then process its message
    async fn prove_and_process(
        &self,
        message: &OpticsMessage,
        proof: &Proof,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self.prove(proof).await?;

        Ok(self.process(message).await?)
    }

    /// Fetch the status of a message
    async fn message_status(&self, leaf: H256) -> Result<MessageStatus, ChainCommunicationError>;

    /// Fetch the confirmation time for a specific root
    async fn acceptable_root(&self, root: H256) -> Result<bool, ChainCommunicationError>;
}
