//! Configuration
use optics_base::{decl_settings, settings::SignerConf};

decl_settings!(Updater {
    updater: SignerConf,
    polling_interval: String,
    update_pause: String,
});
