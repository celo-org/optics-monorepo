//! Interfaces to the ethereum contracts

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

use ethers::prelude::Middleware;
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

#[cfg(not(doctest))]
pub use crate::{home::EthereumHome, replica::EthereumReplica, xapp::EthereumConnectionManager};

#[allow(dead_code)]
/// A live connection to an ethereum-compatible chain.
pub struct Chain<P> {
    creation_metadata: Connection,
    ethers: ethers::providers::Provider<P>,
}

contract!(make_replica, EthereumReplica, Replica,);
contract!(make_home, EthereumHome, Home, db: optics_core::db::DB);
contract!(
    make_conn_manager,
    EthereumConnectionManager,
    ConnectionManager,
);

/*
impl Chain<ethers::providers::Ws> {
    pub async fn connect(c: Connection) -> Self {
        Chain {
            creation_metadata: c.clone(),
            ethers: match c {
                Connection::Http { url } => Provider::connect(url),
                Connection::Ws { url } => Provider::<connect(url),
            },
        }
    }
}
impl Chain<ethers::providers::Http> {
    pub async fn connect(c: Connection) -> Self {
        Chain {
            creation_metadata: c.clone(),
            ethers: match c {
                Connection::Http { url } => Provider::connect(url),
                Connection::Ws { url } => Provider::<connect(url),
            },
        }
    }
}


#[async_trait::async_trait]
impl<P> optics_core::Chain for Chain<P> {
    async fn query_balance(&self, addr: Address) -> anyhow::Result<optics_core::Balance> {
        ethers::types::AddressOrBytes::Bytes(addr.inner());
        let mesh = ethers::providers::Ws::connect(self.c.url).await?;
    }
}
*/
