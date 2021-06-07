use color_eyre::Report;
use optics_core::Signers;
use optics_ethereum::settings::EthereumConnection;
use serde::Deserialize;

use crate::{home::Homes, replica::Replicas, xapp::ConnectionManagers};

/// A connection to _some_ blockchain.
///
/// Specify the chain name (enum variant) in toml under the `chain` key
/// Specify the connection details as a toml object under the `connection` key.
#[derive(Debug, Deserialize)]
#[serde(tag = "rpcStyle", content = "config", rename_all = "camelCase")]
pub enum ChainConf {
    /// Ethereum configuration
    Ethereum(EthereumConnection),
}

/// A chain setup is a domain ID, an address on that chain (where the home or
/// replica is deployed) and details for connecting to the chain API.
#[derive(Debug, Deserialize)]
pub struct ChainSetup {
    /// Chain name
    pub name: String,
    /// Chain domain identifier
    pub domain: u32,
    /// Address of contract on the chain
    pub address: String,
    /// The chain connection details
    #[serde(flatten)]
    pub chain: ChainConf,
}

impl ChainSetup {
    /// Try to convert the chain setting into a Home contract
    pub async fn try_into_home(&self, signer: Option<Signers>) -> Result<Homes, Report> {
        match &self.chain {
            ChainConf::Ethereum(conf) => Ok(Homes::Ethereum(
                conf.try_into_home(&self.name, self.domain, self.address.parse()?, signer)
                    .await?,
            )),
        }
    }

    /// Try to convert the chain setting into a replica contract
    pub async fn try_into_replica(&self, signer: Option<Signers>) -> Result<Replicas, Report> {
        match &self.chain {
            ChainConf::Ethereum(conf) => Ok(Replicas::Ethereum(
                conf.try_into_replica(&self.name, self.domain, self.address.parse()?, signer)
                    .await?,
            )),
        }
    }

    /// Try to convert chain setting into XAppConnectionManager contract
    pub async fn try_into_connection_manager(
        &self,
        signer: Option<Signers>,
    ) -> Result<ConnectionManagers, Report> {
        match &self.chain {
            ChainConf::Ethereum(conf) => Ok(ConnectionManagers::Ethereum(
                conf.try_into_connection_manager(
                    &self.name,
                    self.domain,
                    self.address.parse()?,
                    signer,
                )
                .await?,
            )),
        }
    }
}
