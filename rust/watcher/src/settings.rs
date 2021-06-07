//! Configuration

use optics_base::{
    decl_settings,
    settings::{ChainSetup, SignerConf},
};

decl_settings!(Settings {
    agent: "watcher",
    watcher: SignerConf,
    connection_managers: Vec<ChainSetup>,
    polling_interval: u64,
});
