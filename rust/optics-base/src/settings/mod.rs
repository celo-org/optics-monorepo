use crate::{agent::AgentCore, db, home::Homes, replica::Replicas};
use color_eyre::{eyre::bail, Report};
use config::{Config, ConfigError, Environment, File};
use optics_core::{utils::HexString, Signers};
use serde::Deserialize;
use std::{collections::HashMap, env, sync::Arc};
use tracing::instrument;

/// Chain configuartion
pub mod chains;

pub use chains::ChainSetup;

/// Tracing subscriber management
pub mod trace;

use crate::settings::trace::TracingConfig;

// TODO: figure out how to take inputs for Ledger and YubiWallet variants
/// Ethereum signer types
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SignerConf {
    /// A local hex key
    HexKey {
        /// Hex string of private key, without 0x prefix
        key: HexString<64>,
    },
    #[serde(other)]
    /// Assume node will sign on RPC calls
    Node,
}

impl Default for SignerConf {
    fn default() -> Self {
        Self::Node
    }
}

impl SignerConf {
    /// Try to convert the ethereum signer to a local wallet
    #[instrument(err)]
    pub fn try_into_signer(&self) -> Result<Signers, Report> {
        match self {
            SignerConf::HexKey { key } => Ok(Signers::Local(key.as_ref().parse()?)),
            SignerConf::Node => bail!("Node signer"),
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
    pub db: String,
    /// The home configuration
    pub home: ChainSetup,
    /// The replica configurations
    pub replicas: HashMap<String, ChainSetup>,
    /// The tracing configuration
    pub tracing: TracingConfig,
    /// Transaction signers
    pub signers: HashMap<String, SignerConf>,
}

impl Settings {
    /// Try to get a signer instance by name
    pub fn get_signer(&self, name: &str) -> Option<Signers> {
        self.signers.get(name)?.try_into_signer().ok()
    }

    /// Try to get all replicas from this settings object
    pub async fn try_replicas(&self) -> Result<HashMap<String, Arc<Replicas>>, Report> {
        let mut result = HashMap::default();
        for (k, v) in self.replicas.iter() {
            if k != &v.name {
                bail!(
                    "Replica key does not match replica name:\n key: {}  name: {}",
                    k,
                    v.name
                );
            }
            let signer = self.get_signer(&v.name);
            result.insert(v.name.clone(), Arc::new(v.try_into_replica(signer).await?));
        }
        Ok(result)
    }

    /// Try to get a home object
    pub async fn try_home(&self) -> Result<Homes, Report> {
        let signer = self.get_signer(&self.home.name);
        self.home.try_into_home(signer).await
    }

    /// Try to generate an agent core
    pub async fn try_into_core(&self) -> Result<AgentCore, Report> {
        let home = Arc::new(self.try_home().await?);
        let replicas = self.try_replicas().await?;
        let db = Arc::new(db::from_path(&self.db)?);

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
