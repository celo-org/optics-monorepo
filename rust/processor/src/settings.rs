//! Configuration
use optics_base::decl_settings;

decl_settings!(
    Settings {
        "OPT_PROCESSOR",
        polling_interval: u64,
    }
);
