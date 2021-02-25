//! Configuration

use optics_base::decl_settings;

decl_settings!(
    Settings {
        "OPT_WATCHER",
        polling_interval: u64,
    }
);
