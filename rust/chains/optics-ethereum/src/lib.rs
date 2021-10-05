//! Interfaces to the ethereum contracts
#![cfg(not(doctest))]
#![forbid(unsafe_code)]
// #![warn(missing_docs)]
#![warn(unused_extern_crates)]

use color_eyre::Report;
use ethers::prelude::*;
use num::Num;
use optics_core::*;
use std::convert::TryFrom;
use std::sync::Arc;

#[macro_use]
mod macros;

/// Home abi
pub(crate) mod home;
mod home_indexer;

/// Replica abi
mod replica;

/// XAppConnectionManager abi
mod xapp;

/// Ethereum connection configuration
#[derive(Debug, serde::Deserialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Connection {
    /// HTTP connection details
    Http {
        /// Fully qualified string to connect to
        url: String,
    },
    /// Websocket connection details
    Ws {
        /// Fully qualified string to connect to
        url: String,
    },
}

impl Default for Connection {
    fn default() -> Self {
        Self::Http {
            url: Default::default(),
        }
    }
}

impl Connection {
    /// Try to convert this into an HomeIndexer
    pub async fn try_into_home_indexer(
        &self,
        address: ethers::types::Address,
    ) -> Result<Box<dyn HomeIndexer>, Report> {
        let b: Box<dyn HomeIndexer> = match &self {
            Connection::Http { url } => {
                let provider = Arc::new(
                    ethers::providers::Provider::<ethers::providers::Http>::try_from(url.as_ref())?,
                );
                Box::new(EthereumHomeIndexer::new(address, provider))
            }
            Connection::Ws { url } => {
                let ws = ethers::providers::Ws::connect(url).await?;
                let provider = Arc::new(ethers::providers::Provider::new(ws));
                Box::new(EthereumHomeIndexer::new(address, provider))
            }
        };

        Ok(b)
    }
}

#[cfg(not(doctest))]
pub use crate::{
    home::EthereumHome, home_indexer::*, replica::EthereumReplica, xapp::EthereumConnectionManager,
};

#[allow(dead_code)]
/// A live connection to an ethereum-compatible chain.
pub struct Chain {
    creation_metadata: Connection,
    ethers: ethers::providers::Provider<ethers::providers::Http>,
}

contract!(make_replica, EthereumReplica, Replica,);
contract!(make_home, EthereumHome, Home,);
contract!(
    make_conn_manager,
    EthereumConnectionManager,
    ConnectionManager,
);

#[async_trait::async_trait]
impl optics_core::Chain for Chain {
    async fn query_balance(
        &self,
        addr: optics_core::Address,
    ) -> anyhow::Result<optics_core::Balance> {
        let balance = format!(
            "{:x}",
            self.ethers
                .get_balance(
                    NameOrAddress::Address(H160::from_slice(&addr.0[..])),
                    Some(BlockId::Number(BlockNumber::Latest))
                )
                .await?
        );

        Ok(optics_core::Balance(num::BigInt::from_str_radix(
            &balance, 16,
        )?))
    }
}
