//! Configuration

use optics_base::decl_settings;

decl_settings!(Settings {
    agent: "relayer",
    polling_interval: u64,
});
