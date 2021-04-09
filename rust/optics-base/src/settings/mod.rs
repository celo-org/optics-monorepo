use color_eyre::Report;
use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;
use std::{collections::HashMap, env, sync::Arc};

use crate::{db, home::Homes, replica::Replicas};

/// Tracing configuration
pub mod log;

use log::TracingConfig;
use optics_ethereum::settings::EthereumConf;

use crate::agent::AgentCore;

/// A connection to _some_ blockchain.
///
/// Specify the chain name (enum variant) in toml under the `chain` key
/// Specify the connection details as a toml object under the `connection` key.
#[derive(Debug, Deserialize)]
#[serde(tag = "rpcStyle", content = "config", rename_all = "camelCase")]
pub enum ChainConf {
    /// Ethereum configuration
    Ethereum(EthereumConf),
}

/// A chain setup is a domain ID, an address on that chain (where the home or
/// replica is deployed) and details for connecting to the chain API.
#[derive(Debug, Deserialize)]
pub struct ChainSetup {
    name: String,
    domain: u32,
    address: String,
    #[serde(flatten)]
    chain: ChainConf,
}

impl ChainSetup {
    /// Try to convert the chain setting into a Home contract
    pub async fn try_into_home(&self) -> Result<Homes, Report> {
        match &self.chain {
            ChainConf::Ethereum(conf) => Ok(Homes::Ethereum(
                conf.try_into_home(&self.name, self.domain, self.address.parse()?)
                    .await?,
            )),
        }
    }

    /// Try to convert the chain setting into a replica contract
    pub async fn try_into_replica(&self) -> Result<Replicas, Report> {
        match &self.chain {
            ChainConf::Ethereum(conf) => Ok(Replicas::Ethereum(
                conf.try_into_replica(&self.name, self.domain, self.address.parse()?)
                    .await?,
            )),
        }
    }
}

/// Settings. Usually this should be treated as a base config and used as
/// follows:
///
/// ```
/// use optics_base::settings::*;
/// use serde::Deserialize;
///
/// pub struct OtherSettings { /* anything */ };
///
/// #[derive(Debug, Deserialize)]
/// pub struct MySettings {
///     #[serde(flatten)]
///     base_settings: Settings,
///     #[serde(flatten)]
///     other_settings: (),
/// }
///
/// // Make sure to define MySettings::new()
/// impl MySettings {
///     fn new() -> Self {
///         unimplemented!()
///     }
/// }
/// ```
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// The path to use for the DB file
    pub db_path: String,
    /// The home configuration
    pub home: ChainSetup,
    /// The replica configurations
    pub replicas: Vec<ChainSetup>,
    /// The tracing configuration
    pub tracing: TracingConfig,
}

impl Settings {
    /// Try to get all replicas from this settings object
    pub async fn try_replicas(&self) -> Result<HashMap<String, Arc<Replicas>>, Report> {
        let mut result = HashMap::default();
        for v in self.replicas.iter() {
            result.insert(v.name.clone(), Arc::new(v.try_into_replica().await?));
        }
        Ok(result)
    }

    /// Try to get a home object
    pub async fn try_home(&self) -> Result<Homes, Report> {
        self.home.try_into_home().await
    }

    /// Try to generate an agent core
    pub async fn try_into_core(&self) -> Result<AgentCore, Report> {
        let home = Arc::new(self.try_home().await?);
        let replicas = self.try_replicas().await?;
        let db = Arc::new(db::from_path(&self.db_path)?);

        Ok(AgentCore { home, replicas, db })
    }

    /// Read settings from the config file
    pub fn new() -> Result<Self, ConfigError> {
        let mut s = Config::new();

        s.merge(File::with_name("config/default"))?;

        let env = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());
        s.merge(File::with_name(&format!("config/{}", env)).required(false))?;

        // Add in settings from the environment (with a prefix of OPTICS)
        // Eg.. `OPTICS_DEBUG=1 would set the `debug` key
        s.merge(Environment::with_prefix("OPTICS"))?;

        s.try_into()
    }
}
