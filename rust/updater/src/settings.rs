//! Configuration
use optics_base::{decl_settings, settings::ethereum::EthereumSigner};

decl_settings!(Settings {
    agent: "updater",
    updater: EthereumSigner,
    db_path: String,
    polling_interval: u64,
    update_pause: u64,
});
