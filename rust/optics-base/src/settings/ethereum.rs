use std::convert::TryFrom;

use color_eyre::{Report, Result};
use ethers::core::types::Address;

use optics_core::traits::{Home, Replica};

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
    ($contract:ident, $name:expr, $slip44:expr, $address:expr, $provider:expr, $signer:expr) => {{
        if let Some(signer) = $signer {
            let signer = signer?;
            let provider = ethers::middleware::SignerMiddleware::new($provider, signer);
            Box::new(crate::abis::$contract::new(
                $name,
                $slip44,
                $address,
                provider.into(),
            ))
        } else {
            Box::new(crate::abis::$contract::new(
                $name,
                $slip44,
                $address,
                $provider.into(),
            ))
        }
    }};
}

macro_rules! construct_ws_box_contract {
    ($contract:ident, $name:expr, $slip44:expr, $address:expr, $url:expr, $signer:expr) => {{
        let ws = ethers::providers::Ws::connect($url).await?;
        let provider = ethers::providers::Provider::new(ws);
        construct_box_contract!($contract, $name, $slip44, $address, provider, $signer)
    }};
}

macro_rules! construct_http_box_contract {
    ($contract:ident, $name:expr, $slip44:expr, $address:expr, $url:expr, $signer:expr) => {{
        let provider =
            ethers::providers::Provider::<ethers::providers::Http>::try_from($url.as_ref())?;

        construct_box_contract!($contract, $name, $slip44, $address, provider, $signer)
    }};
}

/// Ethereum signer types
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(untagged)]
pub enum EthereumSigner {
    /// Hex string of private key
    HexKey(String),
}

impl EthereumSigner {
    // TODO: allow ledger or other signer traits?
    /// Try to conver the ethereum signer to a local wallet
    pub fn try_into_wallet(&self) -> Result<ethers::signers::LocalWallet> {
        match self {
            EthereumSigner::HexKey(s) => Ok(s.parse()?),
        }
    }
}

/// Ethereum configuration
#[derive(Debug, serde::Deserialize)]
pub struct EthereumConf {
    connection: EthereumConnection,
    signer: Option<EthereumSigner>,
}

impl EthereumConf {
    fn signer(&self) -> Option<Result<ethers::signers::LocalWallet>> {
        self.signer.clone().map(|s| s.try_into_wallet())
    }

    /// Try to convert this into a home contract
    pub async fn try_into_home(
        &self,
        name: &str,
        slip44: u32,
        address: Address,
    ) -> Result<Box<dyn Home>, Report> {
        let b: Box<dyn Home> = match &self.connection {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(
                    HomeContract,
                    name,
                    slip44,
                    address,
                    url,
                    self.signer()
                )
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(HomeContract, name, slip44, address, url, self.signer())
            }
        };
        Ok(b)
    }

    /// Try to convert this into a replica contract
    pub async fn try_into_replica(
        &self,
        name: &str,
        slip44: u32,
        address: Address,
    ) -> Result<Box<dyn Replica>, Report> {
        let b: Box<dyn Replica> = match &self.connection {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(
                    ReplicaContract,
                    name,
                    slip44,
                    address,
                    url,
                    self.signer()
                )
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(
                    ReplicaContract,
                    name,
                    slip44,
                    address,
                    url,
                    self.signer()
                )
            }
        };
        Ok(b)
    }
}
