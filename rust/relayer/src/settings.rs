//! Configuration

use optics_base::decl_settings;

decl_settings!(
    Settings {
        "OPT_RELAYER",
        agent: "relayer",
        polling_interval: u64,
    }
);
