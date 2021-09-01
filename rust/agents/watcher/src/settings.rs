//! Configuration

use optics_base::{
    decl_settings,
    settings::{ChainSetup, SignerConf},
};

decl_settings!(Watcher {
    /// The watcher's attestation signer
    watcher: SignerConf,
    /// The connection managers to notify of failure
    connection_managers: Vec<ChainSetup>,
    /// The polling interval (in seconds)
    interval: String,
});
