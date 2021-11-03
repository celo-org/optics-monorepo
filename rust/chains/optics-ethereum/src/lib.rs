//! Interfaces to the ethereum contracts

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

use color_eyre::eyre::Result;
use ethers::prelude::*;
use num::Num;
use optics_core::*;
use std::convert::TryFrom;
use std::sync::Arc;

#[macro_use]
mod macros;

/// Home abi
#[cfg(not(doctest))]
mod home;

/// Replica abi
#[cfg(not(doctest))]
mod replica;

/// XAppConnectionManager abi
#[cfg(not(doctest))]
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

#[cfg(not(doctest))]
pub use crate::{home::*, replica::*, xapp::*};

#[allow(dead_code)]
/// A live connection to an ethereum-compatible chain.
pub struct Chain {
    creation_metadata: Connection,
    ethers: ethers::providers::Provider<ethers::providers::Http>,
}

boxed_trait!(
    make_home_indexer,
    EthereumHomeIndexer,
    HomeIndexer,
    from_height: u32,
    chunk_size: u32
);
boxed_trait!(
    make_replica_indexer,
    EthereumReplicaIndexer,
    CommonIndexer,
    from_height: u32,
    chunk_size: u32
);
boxed_trait!(make_replica, EthereumReplica, Replica,);
boxed_trait!(make_home, EthereumHome, Home,);
boxed_trait!(
    make_conn_manager,
    EthereumConnectionManager,
    ConnectionManager,
);

#[async_trait::async_trait]
impl optics_core::Chain for Chain {
    async fn query_balance(&self, addr: optics_core::Address) -> Result<optics_core::Balance> {
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
