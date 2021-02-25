//! Configuration
use optics_base::{decl_settings, settings::ethereum::EthereumSigner};

decl_settings!(
    Settings {
        "OPT_UPDATER",
        updater: EthereumSigner,
        polling_interval: u64,
    }
);
