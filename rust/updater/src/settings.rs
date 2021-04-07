//! Configuration
use optics_base::{decl_settings, settings::ethereum::EthereumSigner};

decl_settings!(Settings {
    agent: "updater",
    updater: EthereumSigner,
    polling_interval: u64,
    update_pause: u64,
});
