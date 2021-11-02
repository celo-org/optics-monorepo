//! Configuration

use optics_base::{decl_settings, ChainSetup, SignerConf};
use std::collections::HashMap;

decl_settings!(Watcher {
    /// The watcher's attestation signer
    watcher: SignerConf,
    /// The connection managers to notify of failure
    managers: HashMap<String, ChainSetup>,
    /// The polling interval (in seconds)
    interval: String,
});
