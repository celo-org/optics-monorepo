//! Configuration
use optics_base::decl_settings;

decl_settings!(
    Settings {
        "OPT_PROCESSOR",
        db_path: String,
        polling_interval: u64,
    }
);
