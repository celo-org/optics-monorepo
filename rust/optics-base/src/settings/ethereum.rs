use std::convert::TryFrom;

use color_eyre::{eyre::eyre, Report, Result};
use ethers::core::types::Address;

use optics_core::traits::{Home, Replica};

/// Ethereum connection configuration
#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum EthereumConnection {
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

// Construct boxed contracts in a big "if-else" chain to handle multiple
// combinations of middleware.
macro_rules! construct_box_contract {
    ($contract:ident, $name:expr, $domain:expr, $address:expr, $provider:expr, $signer:expr) => {{
        if let Some(signer) = $signer {
            let provider = ethers::middleware::SignerMiddleware::new($provider, signer);
            Box::new(crate::abis::$contract::new(
                $name,
                $domain,
                $address,
                provider.into(),
            ))
        } else {
            Box::new(crate::abis::$contract::new(
                $name,
                $domain,
                $address,
                $provider.into(),
            ))
        }
    }};
}

macro_rules! construct_ws_box_contract {
    ($contract:ident, $name:expr, $domain:expr, $address:expr, $url:expr, $signer:expr) => {{
        let ws = ethers::providers::Ws::connect($url).await?;
        let provider = ethers::providers::Provider::new(ws);
        construct_box_contract!($contract, $name, $domain, $address, provider, $signer)
    }};
}

macro_rules! construct_http_box_contract {
    ($contract:ident, $name:expr, $domain:expr, $address:expr, $url:expr, $signer:expr) => {{
        let provider =
            ethers::providers::Provider::<ethers::providers::Http>::try_from($url.as_ref())?;

        construct_box_contract!($contract, $name, $domain, $address, provider, $signer)
    }};
}

/// Ethereum signer types
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum EthereumSigner {
    /// A local hex key
    HexKey {
        /// Hex string of private key, without 0x prefix
        key: String,
    },
    #[serde(other)]
    /// Node will sign on RPC calls
    Node,
}

impl EthereumSigner {
    // TODO: allow ledger or other signer traits?
    /// Try to conver the ethereum signer to a local wallet
    #[tracing::instrument(err)]
    pub fn try_into_wallet(&self) -> Result<ethers::signers::LocalWallet> {
        match self {
            EthereumSigner::HexKey { key } => Ok(key.parse()?),
            EthereumSigner::Node => Err(eyre!("Node signer")),
        }
    }
}

/// Ethereum configuration
#[derive(Debug, serde::Deserialize)]
pub struct EthereumConf {
    connection: EthereumConnection,
    signer: EthereumSigner,
}

impl EthereumConf {
    fn signer(&self) -> Option<ethers::signers::LocalWallet> {
        self.signer.try_into_wallet().ok()
    }

    /// Try to convert this into a home contract
    #[tracing::instrument(err)]
    pub async fn try_into_home(
        &self,
        name: &str,
        domain: u32,
        address: Address,
    ) -> Result<Box<dyn Home>, Report> {
        let b: Box<dyn Home> = match &self.connection {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(
                    HomeContract,
                    name,
                    domain,
                    address,
                    url,
                    self.signer()
                )
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(HomeContract, name, domain, address, url, self.signer())
            }
        };
        Ok(b)
    }

    /// Try to convert this into a replica contract
    #[tracing::instrument(err)]
    pub async fn try_into_replica(
        &self,
        name: &str,
        domain: u32,
        address: Address,
    ) -> Result<Box<dyn Replica>, Report> {
        let b: Box<dyn Replica> = match &self.connection {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(
                    ReplicaContract,
                    name,
                    domain,
                    address,
                    url,
                    self.signer()
                )
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(
                    ReplicaContract,
                    name,
                    domain,
                    address,
                    url,
                    self.signer()
                )
            }
        };
        Ok(b)
    }
}
