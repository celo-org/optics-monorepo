use std::convert::TryFrom;

use crate::{
    traits::{ChainCommunicationError, Common, TxOutcome},
    utils::home_domain_hash,
    Decode, Encode, Message, OpticsError, OpticsMessage, SignedUpdate, Update,
};
use async_trait::async_trait;
use color_eyre::Result;
use ethers::{core::types::H256, utils::keccak256};
use tokio::task::JoinHandle;
use tracing::instrument::Instrumented;

/// A Stamped message that has been committed at some leaf index
#[derive(Debug, Default, Clone)]
pub struct RawCommittedMessage {
    /// The index at which the message is committed
    pub leaf_index: u32,
    /// The home's current root when the message was committed.
    pub committed_root: H256,
    /// The fully detailed message that was committed
    pub message: Vec<u8>,
}

impl RawCommittedMessage {
    /// Return the `leaf_hash` for this raw message
    ///
    /// The leaf hash is the keccak256 digest of the message, which is committed
    /// in the message tree
    pub fn leaf_hash(&self) -> H256 {
        keccak256(&self.message).into()
    }
}

impl Encode for RawCommittedMessage {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        writer.write_all(&self.leaf_index.to_be_bytes())?;
        writer.write_all(self.committed_root.as_ref())?;
        writer.write_all(&self.message)?;
        Ok(4 + 32 + self.message.len())
    }
}

impl Decode for RawCommittedMessage {
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
        Self: Sized,
    {
        let mut idx = [0u8; 4];
        reader.read_exact(&mut idx)?;

        let mut hash = [0u8; 32];
        reader.read_exact(&mut hash)?;

        let mut message = vec![];
        reader.read_to_end(&mut message)?;

        Ok(Self {
            leaf_index: u32::from_be_bytes(idx),
            committed_root: hash.into(),
            message,
        })
    }
}

// ember: tracingify these across usage points
/// A Stamped message that has been committed at some leaf index
#[derive(Debug, Default, Clone)]
pub struct CommittedMessage {
    /// The index at which the message is committed
    pub leaf_index: u32,
    /// The home's current root when the message was committed.
    pub committed_root: H256,
    /// The fully detailed message that was committed
    pub message: OpticsMessage,
}

impl CommittedMessage {
    /// Return the leaf associated with the message
    pub fn to_leaf(&self) -> H256 {
        self.message.to_leaf()
    }
}

impl AsRef<OpticsMessage> for CommittedMessage {
    fn as_ref(&self) -> &OpticsMessage {
        &self.message
    }
}

impl TryFrom<RawCommittedMessage> for CommittedMessage {
    type Error = OpticsError;

    fn try_from(raw: RawCommittedMessage) -> Result<Self, Self::Error> {
        Ok(Self {
            leaf_index: raw.leaf_index,
            committed_root: raw.committed_root,
            message: OpticsMessage::read_from(&mut &raw.message[..])?,
        })
    }
}

/// Interface for the Home chain contract. Allows abstraction over different
/// chains
#[async_trait]
pub trait Home: Common + Send + Sync + std::fmt::Debug {
    /// Return the domain ID
    fn local_domain(&self) -> u32;

    /// Run a task indexing the chain (if necessary)
    fn index(&self, from_height: u32, chunk_size: u32) -> Instrumented<JoinHandle<Result<()>>>;

    /// Return the domain hash
    fn home_domain_hash(&self) -> H256 {
        home_domain_hash(self.local_domain())
    }

    /// Fetch the message to destination at the nonce (or error).
    /// This should fetch events from the chain API.
    ///
    /// Used by processors to get messages in order
    async fn raw_message_by_nonce(
        &self,
        destination: u32,
        nonce: u32,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError>;

    /// Fetch the message to destination at the nonce (or error).
    /// This should fetch events from the chain API
    async fn message_by_nonce(
        &self,
        destination: u32,
        nonce: u32,
    ) -> Result<Option<CommittedMessage>, ChainCommunicationError> {
        self.raw_message_by_nonce(destination, nonce)
            .await?
            .map(CommittedMessage::try_from)
            .transpose()
            .map_err(Into::into)
    }

    /// Look up a message by its hash.
    /// This should fetch events from the chain API
    async fn raw_message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError>;

    /// Look up a message by its hash.
    /// This should fetch events from the chain API
    async fn message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<CommittedMessage>, ChainCommunicationError> {
        self.raw_message_by_leaf(leaf)
            .await?
            .map(CommittedMessage::try_from)
            .transpose()
            .map_err(Into::into)
    }

    /// Fetch the tree_index-th leaf inserted into the merkle tree.
    /// Returns `Ok(None)` if no leaf exists for given `tree_size` (`Ok(None)`
    /// serves as the return value for an index error). If tree_index == 0,
    /// this will return the first inserted leaf.  This is because the Home
    /// emits the index at which the leaf was inserted in (`tree.count() - 1`),
    /// thus the first inserted leaf has an index of 0.
    async fn leaf_by_tree_index(
        &self,
        tree_index: usize,
    ) -> Result<Option<H256>, ChainCommunicationError>;

    /// Fetch the nonce
    async fn nonces(&self, destination: u32) -> Result<u32, ChainCommunicationError>;

    /// Dispatch a message.
    async fn dispatch(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError>;

    /// Check if queue contains root.
    async fn queue_contains(&self, root: H256) -> Result<bool, ChainCommunicationError>;

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
