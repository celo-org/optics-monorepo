use async_trait::async_trait;
use ethers::contract::abigen;
use ethers::core::types::{Address, Signature, H256, U256};
use optics_core::{
    traits::{
        ChainCommunicationError, Common, DoubleUpdate, Home, RawCommittedMessage, State, TxOutcome,
    },
    Message, SignedUpdate, Update,
};

use crate::utils::*;

use std::{convert::TryFrom, error::Error as StdError, sync::Arc};

#[allow(missing_docs)]
abigen!(EthereumXappConnectionManagerInternal, "../abis/XappConnectionManager.abi.json");

/// A reference to a XappConnectionManager contract on some Ethereum chain
#[derive(Debug)]
pub struct EthereumXappConnectionManager<M>
where
    M: ethers::providers::Middleware,
{
    contract: EthereumXappConnectionManagerInternal<M>,
    domain: u32,
    name: String,
}

impl<M> EthereumXappConnectionManager<M>
where
    M: ethers::providers::Middleware,
{
    /// Create a reference to a XappConnectionManager at a specific Ethereum 
    /// address on some chain
    pub fn new(name: &str, domain: u32, address: Address, provider: Arc<M>) -> Self {
        Self {
            contract: EthereumXappConnectionManagerInternal::new(address, provider),
            domain,
            name: name.to_owned(),
        }
    }

    
}