//! Configuration
use optics_base::{decl_settings, settings::SignerConf};

decl_settings!(Settings {
    agent: "updater",
    updater: SignerConf,
    polling_interval: u64,
    update_pause: u64,
});
