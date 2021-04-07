//! Configuration
use optics_base::decl_settings;

decl_settings!(Settings {
    agent: "processor",
    polling_interval: u64,
});
