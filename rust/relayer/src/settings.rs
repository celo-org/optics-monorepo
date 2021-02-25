//! Configuration

use optics_base::decl_settings;

decl_settings!(
    Settings {
        "OPT_UPDATER",
        polling_interval: u64,
    }
);
