//! Configuration

use optics_base::{decl_settings, settings::ethereum::EthereumSigner};

decl_settings!(
    Settings {
        "OPT_WATCHER",
        watcher: EthereumSigner,
        db_path: String,
        polling_interval: u64,
    }
);
