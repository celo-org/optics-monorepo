//! Configuration
use config::{Config, ConfigError, Environment, File};
use std::env;

use optics_base::settings::{ethereum::EthereumSigner, Settings as BaseSettings};

#[derive(Debug, serde::Deserialize)]
pub struct Settings {
    #[serde(flatten)]
    pub(crate) base: BaseSettings,
    pub(crate) updater: EthereumSigner,
    pub(crate) polling_interval: u64,
}

impl Settings {
    /// Read settings from the config file
    pub fn new() -> Result<Self, ConfigError> {
        let mut s = Config::new();

        s.merge(File::with_name("config/default"))?;

        let env = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());
        s.merge(File::with_name(&format!("config/{}", env)).required(false))?;

        // Add in settings from the environment (with a prefix of OPT_UPDATER)
        // Eg.. `OPT_UPDATER_DEBUG=1 would set the `debug` key
        s.merge(Environment::with_prefix("OPT_UPDATER"))?;

        s.try_into()
    }
}
