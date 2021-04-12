//! Configuration

use optics_base::{decl_settings, settings::ChainSetup};
use optics_ethereum::EthereumSigner;

decl_settings!(Settings {
    agent: "watcher",
    watcher: EthereumSigner,
    xapp_connection_manager: ChainSetup,
    polling_interval: u64,
});
