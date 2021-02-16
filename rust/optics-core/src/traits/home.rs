use async_trait::async_trait;

use color_eyre::eyre::Chain;
use ethers::core::types::{H256, U256};

use crate::{
    traits::{ChainCommunicationError, Common, TxOutcome},
    utils::domain_hash,
    Decode, Message, SignedUpdate, StampedMessage, Update,
};

/// Interface for the Home chain contract. Allows abstraction over different
/// chains
#[async_trait]
pub trait Home: Common + Send + Sync + std::fmt::Debug {
    /// Return the domain ID
    fn origin_domain(&self) -> u32;

    /// Return the domain hash
    fn domain_hash(&self) -> H256 {
        domain_hash(self.origin_domain())
    }

    /// Fetch the message to destination at the sequence number (or error).
    /// This should fetch events from the chain API.
    ///
    /// Used by processors to get messages in order
    async fn raw_message_by_sequence(
        &self,
        destination: u32,
        sequence: u32,
    ) -> Result<Option<Vec<u8>>, ChainCommunicationError>;

    /// Fetch the message to destination at the sequence number (or error).
    /// This should fetch events from the chain API
    async fn message_by_sequence(
        &self,
        destination: u32,
        sequence: u32,
    ) -> Result<Option<StampedMessage>, ChainCommunicationError> {
        self.raw_message_by_sequence(destination, sequence)
            .await?
            .map(|buf| StampedMessage::read_from(&mut &buf[..]))
            .transpose()
            .map_err(Into::into)
    }

    /// Look up a message by its hash.
    /// This should fetch events from the chain API
    async fn raw_message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<Vec<u8>>, ChainCommunicationError>;

    /// Look up a message by its hash.
    /// This should fetch events from the chain API
    async fn message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<StampedMessage>, ChainCommunicationError> {
        self.raw_message_by_leaf(leaf)
            .await?
            .map(|buf| StampedMessage::read_from(&mut &buf[..]))
            .transpose()
            .map_err(Into::into)
    }

    /// Fetch all message leaves dispatched under currentRoot `root`.
    async fn leaves_by_root(&self, root: H256) -> Result<Vec<H256>, ChainCommunicationError>;

    /// Fetch the tree_size-th leaf inserted into the merkle tree.
    async fn leaf_by_tree_size(
        &self,
        tree_size: usize,
    ) -> Result<Option<H256>, ChainCommunicationError>;

    /// Fetch the sequence
    async fn sequences(&self, destination: u32) -> Result<u32, ChainCommunicationError>;

    /// Queue a message.
    async fn enqueue(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError>;

    /// Submit an improper update for slashing
    async fn improper_update(
        &self,
        update: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError>;

    /// Create a valid update based on the chain's current state.
    /// This merely suggests an update. It does NOT ensure that no other valid
    /// update has been produced. The updater MUST take measures to prevent
    /// double-updating. If no messages are queued, this must produce Ok(None).
    async fn produce_update(&self) -> Result<Option<Update>, ChainCommunicationError>;
}
