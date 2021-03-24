//! Configuration
use optics_base::{decl_settings, settings::ethereum::EthereumSigner};

decl_settings!(
    Settings {
        "OPT_UPDATER",
        updater: EthereumSigner,
        db_path: String,
        polling_interval: u64,
        update_pause: u64,
    }
);
