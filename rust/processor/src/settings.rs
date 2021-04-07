//! Configuration
use optics_base::decl_settings;

decl_settings!(Settings {
    agent: "processor",
    db_path: String,
    polling_interval: u64,
});
