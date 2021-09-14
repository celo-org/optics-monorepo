use color_eyre::{Report, Result};
use ethers::prelude::{Address, Middleware};
use std::convert::TryFrom;

use optics_core::{
    db::DB,
    traits::{ConnectionManager, Home, Replica},
    Signers,
};

// Construct boxed contracts in a big "if-else" chain to handle multiple
// combinations of middleware.
macro_rules! construct_box_contract {
    ($contract:ident, $name:expr, $domain:expr, $address:expr, $provider:expr, $signer:expr) => {{
        if let Some(signer) = $signer {
            // If there's a provided signer, we want to manage every aspect
            // locally

            // First set the chain ID locally
            let provider_chain_id = $provider.get_chainid().await?;
            let signer = ethers::signers::Signer::with_chain_id(signer, provider_chain_id.as_u64());

            // Manage the nonce locally
            let address = ethers::prelude::Signer::address(&signer);
            let provider =
                ethers::middleware::nonce_manager::NonceManagerMiddleware::new($provider, address);

            // Manage signing locally
            let signing_provider = ethers::middleware::SignerMiddleware::new(provider, signer);

            Box::new(crate::$contract::new(
                $name,
                $domain,
                $address,
                signing_provider.into(),
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
    ($contract:ident, $name:expr, $domain:expr, $address:expr, $provider:expr, $signer:expr, $db:expr) => {{
        if let Some(signer) = $signer {
            // If there's a provided signer, we want to manage every aspect
            // locally

            // First set the chain ID locally
            let provider_chain_id = $provider.get_chainid().await?;
            let signer = ethers::signers::Signer::with_chain_id(signer, provider_chain_id.as_u64());

            // Manage the nonce locally
            let address = ethers::prelude::Signer::address(&signer);
            let provider =
                ethers::middleware::nonce_manager::NonceManagerMiddleware::new($provider, address);

            // Manage signing locally
            let signing_provider = ethers::middleware::SignerMiddleware::new(provider, signer);

            Box::new(crate::$contract::new(
                $name,
                $domain,
                $address,
                signing_provider.into(),
                $db,
            ))
        } else {
            Box::new(crate::$contract::new(
                $name,
                $domain,
                $address,
                $provider.into(),
                $db,
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
    ($contract:ident, $name:expr, $domain:expr, $address:expr, $url:expr, $signer:expr, $db:expr) => {{
        let ws = ethers::providers::Ws::connect($url).await?;
        let provider = ethers::providers::Provider::new(ws);
        construct_box_contract!($contract, $name, $domain, $address, provider, $signer, $db)
    }};
}

macro_rules! construct_http_box_contract {
    ($contract:ident, $name:expr, $domain:expr, $address:expr, $url:expr, $signer:expr) => {{
        let provider =
            ethers::providers::Provider::<ethers::providers::Http>::try_from($url.as_ref())?;
        construct_box_contract!($contract, $name, $domain, $address, provider, $signer)
    }};
    ($contract:ident, $name:expr, $domain:expr, $address:expr, $url:expr, $signer:expr, $db:expr) => {{
        let provider =
            ethers::providers::Provider::<ethers::providers::Http>::try_from($url.as_ref())?;
        construct_box_contract!($contract, $name, $domain, $address, provider, $signer, $db)
    }};
}

/// Ethereum connection configuration
#[derive(Debug, serde::Deserialize, Clone)]
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

impl EthereumConnection {
    /// Try to convert this into a home contract
    #[tracing::instrument(err)]
    pub async fn try_into_home(
        &self,
        name: &str,
        domain: u32,
        address: Address,
        signer: Option<Signers>,
        db: DB,
    ) -> Result<Box<dyn Home>, Report> {
        let b: Box<dyn Home> = match &self {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(EthereumHome, name, domain, address, url, signer, db)
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(EthereumHome, name, domain, address, url, signer, db)
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
        signer: Option<Signers>,
    ) -> Result<Box<dyn Replica>, Report> {
        let b: Box<dyn Replica> = match &self {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(EthereumReplica, name, domain, address, url, signer)
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(EthereumReplica, name, domain, address, url, signer)
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
        signer: Option<Signers>,
    ) -> Result<Box<dyn ConnectionManager>, Report> {
        let b: Box<dyn ConnectionManager> = match &self {
            EthereumConnection::Http { url } => {
                construct_http_box_contract!(
                    EthereumConnectionManager,
                    name,
                    domain,
                    address,
                    url,
                    signer
                )
            }
            EthereumConnection::Ws { url } => {
                construct_ws_box_contract!(
                    EthereumConnectionManager,
                    name,
                    domain,
                    address,
                    url,
                    signer
                )
            }
        };
        Ok(b)
    }
}
