/// Interface for home chain contract
pub mod home;

/// Interface for replica chain contract
pub mod replica;

use async_trait::async_trait;
use ethers::{
    contract::ContractError,
    core::types::{TransactionReceipt, H256},
    providers::{Middleware, ProviderError},
};
use std::error::Error as StdError;

use crate::{OpticsError, SignedUpdate};

pub use home::*;
pub use replica::*;

/// Contract states
#[derive(Debug)]
pub enum State {
    /// Contract is active
    Waiting,
    /// Contract has failed
    Failed,
}

/// The result of a transaction
#[derive(Debug)]
pub struct TxOutcome {
    /// The txid
    pub txid: H256,
    /// True if executed, false otherwise (reverted, etc.)
    pub executed: bool,
    // TODO: more? What can be abstracted across all chains?
}

impl From<TransactionReceipt> for TxOutcome {
    fn from(t: TransactionReceipt) -> Self {
        Self {
            txid: t.transaction_hash,
            executed: t.status.unwrap().low_u32() == 1,
        }
    }
}

/// ChainCommunicationError is a type-erased, thread safe, std error
#[derive(Debug, thiserror::Error)]
pub enum ChainCommunicationError {
    /// Optics Error
    #[error("{0}")]
    OpticsError(#[from] OpticsError),
    /// Contract Error
    #[error("{0}")]
    ContractError(Box<dyn StdError + Send + Sync>),
    /// Provider Error
    #[error("{0}")]
    ProviderError(#[from] ProviderError),
    /// Any other error
    #[error("{0}")]
    CustomError(#[from] Box<dyn StdError + Send + Sync>),
}

impl<M> From<ContractError<M>> for ChainCommunicationError
where
    M: Middleware + 'static,
{
    fn from(e: ContractError<M>) -> Self {
        Self::ContractError(Box::new(e))
    }
}

/// Interface for attributes shared by Home and Replica
#[async_trait]
pub trait Common: Sync + Send + std::fmt::Debug {
    /// Return an identifier (not necessarily unique) for the chain this
    /// contract is running on.
    fn name(&self) -> &str;

    /// Get the status of a transaction
    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError>;

    /// Fetch the current updater value
    async fn updater(&self) -> Result<H256, ChainCommunicationError>;

    /// Fetch the current state.
    async fn state(&self) -> Result<State, ChainCommunicationError>;

    /// Fetch the current root
    async fn current_root(&self) -> Result<H256, ChainCommunicationError>;

    /// Submit a signed update for inclusion
    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError>;

    /// Submit a double update for slashing
    async fn double_update(
        &self,
        left: &SignedUpdate,
        right: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError>;
}
