//! Configuration

use optics_base::{
    decl_settings,
    settings::{ChainSetup, SignerConf},
};

decl_settings!(Watcher {
    watcher: SignerConf,
    connection_managers: Vec<ChainSetup>,
    polling_interval: String,
});
