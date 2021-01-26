use std::convert::TryFrom;

use color_eyre::Report;
use ethers_core::types::Address;

use optics_core::traits::{Home, Replica};

/// Ethereum connection configuration
#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type")]
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
    ($contract:ident, $origin_slip44:expr, $address:expr, $provider:expr, $signer:expr) => {{
        if let Some(signer) = $signer {
            let provider = ethers_middleware::SignerMiddleware::new($provider, signer);
            Box::new(crate::abis::$contract::at(
                $origin_slip44,
                $address,
                provider.into(),
            ))
        } else {
            Box::new(crate::abis::$contract::at(
                $origin_slip44,
                $address,
                $provider.into(),
            ))
        }
    }};
}

macro_rules! construct_ws_box_contract {
    ($contract:ident, $slip44:expr, $address:expr, $url:expr, $signer:expr) => {{
        let ws = ethers_providers::Ws::connect($url).await?;
        let provider = ethers_providers::Provider::new(ws);
        construct_box_contract!($contract, $slip44, $address, provider, $signer)
    }};
}

macro_rules! construct_http_box_contract {
    ($contract:ident, $slip44:expr, $address:expr, $url:expr, $signer:expr) => {{
        let provider =
            ethers_providers::Provider::<ethers_providers::Http>::try_from($url.as_ref())?;

        construct_box_contract!($contract, $slip44, $address, provider, $signer)
    }};
}

/// Ethereum configuration
#[derive(Debug, serde::Deserialize)]
pub struct EthereumConf {
    connection: EthereumConnection,
    signer: Option<String>,
}

impl EthereumConf {
    fn signer(&self) -> Option<ethers_signers::LocalWallet> {
        self.signer.clone().map(|s| s.parse().expect("!valid key"))
    }

    /// Try to convert this into a home contract
    pub async fn try_into_home(
        &self,
        slip44: u32,
        address: Address,
    ) -> Result<Box<dyn Home>, Report> {
        let b: Box<dyn Home> = match &self.connection {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(HomeContract, slip44, address, url, self.signer())
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(HomeContract, slip44, address, url, self.signer())
            }
        };
        Ok(b)
    }

    /// Try to convert this into a replica contract
    pub async fn try_into_replica(
        &self,
        slip44: u32,
        address: Address,
    ) -> Result<Box<dyn Replica>, Report> {
        let b: Box<dyn Replica> = match &self.connection {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(ReplicaContract, slip44, address, url, self.signer())
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(ReplicaContract, slip44, address, url, self.signer())
            }
        };
        Ok(b)
    }
}
