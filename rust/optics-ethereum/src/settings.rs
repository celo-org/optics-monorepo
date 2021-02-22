// use config::{Config, ConfigError, Environment, File};
// use std::{collections::HashMap, env};

// use optics_core::traits::{Home, Replica};

// /// Settings. Usually this should be treated as a base config and used as
// /// follows:
// ///
// /// ```
// /// use optics_base::settings::*;
// ///
// /// pub struct OtherSettings { /* anything */ };
// ///
// /// #[derive(Debug, serde::Deseirialize)]
// /// pub struct MySettings {
// ///     #[serde(flatten)]
// ///     base_settings: Settings,
// ///     #[serde(flatten)]
// ///     other_settings: (),
// /// }
// ///
// /// // Make sure to define MySettings::new()
// /// impl MySettings {
// ///     fn new() -> Self {
// ///         unimplemented!()
// ///     }
// /// }
// /// ```
// #[derive(Debug, serde::Deserialize)]
// pub struct Settings {
//     /// The home configuration
//     pub home: ChainSetup,
//     /// The replica configurations
//     pub replicas: HashMap<String, ChainSetup>,
//     /// The tracing configuration
//     pub tracing: TracingConfig,
// }

// impl Settings {
//     /// Read settings from the config file
//     pub fn new() -> Result<Self, ConfigError> {
//         let mut s = Config::new();

//         s.merge(File::with_name("config/default"))?;

//         let env = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());
//         s.merge(File::with_name(&format!("config/{}", env)).required(false))?;

//         // Add in settings from the environment (with a prefix of OPTICS)
//         // Eg.. `OPTICS_DEBUG=1 would set the `debug` key
//         s.merge(Environment::with_prefix("OPTICS"))?;

//         s.try_into()
//     }
// }
