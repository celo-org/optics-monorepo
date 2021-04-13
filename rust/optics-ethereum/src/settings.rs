use std::convert::TryFrom;

use color_eyre::{eyre::eyre, Report, Result};
use ethers::core::types::Address;

use optics_core::{
    traits::{ConnectionManager, Home, Replica},
    Signers,
};

/// Ethereum connection configuration
#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
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
            Box::new(crate::$contract::new(
                $name,
                $domain,
                $address,
                provider.into(),
            ))
        } else {
            Box::new(crate::$contract::new(
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

// TODO: figure out how to take inputs for Ledger and YubiWallet variants
/// Ethereum signer types
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
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

impl Default for EthereumSigner {
    fn default() -> Self {
        Self::Node
    }
}

impl EthereumSigner {
    /// Try to convert the ethereum signer to a local wallet
    #[tracing::instrument(err)]
    pub fn try_into_signer(&self) -> Result<Signers> {
        match self {
            EthereumSigner::HexKey { key } => Ok(Signers::Local(key.parse()?)),
            EthereumSigner::Node => Err(eyre!("Node signer")),
        }
    }
}

/// Ethereum configuration
#[derive(Debug, serde::Deserialize)]
pub struct EthereumConf {
    connection: EthereumConnection,
    #[serde(default)]
    signer: EthereumSigner,
}

impl EthereumConf {
    /// Try to get a signer from the config
    pub fn signer(&self) -> Option<Signers> {
        self.signer.try_into_signer().ok()
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
                    EthereumHome,
                    name,
                    domain,
                    address,
                    url,
                    self.signer()
                )
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(EthereumHome, name, domain, address, url, self.signer())
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
                    EthereumReplica,
                    name,
                    domain,
                    address,
                    url,
                    self.signer()
                )
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(
                    EthereumReplica,
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

    /// Try to convert this into a replica contract
    #[tracing::instrument(err)]
    pub async fn try_into_connection_manager(
        &self,
        name: &str,
        domain: u32,
        address: Address,
    ) -> Result<Box<dyn ConnectionManager>, Report> {
        let b: Box<dyn ConnectionManager> = match &self.connection {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(
                    EthereumConnectionManager,
                    name,
                    domain,
                    address,
                    url,
                    self.signer()
                )
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(
                    EthereumConnectionManager,
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
