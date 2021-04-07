//! Configuration

use optics_base::decl_settings;
use optics_ethereum::EthereumSigner;

decl_settings!(Settings {
    agent: "watcher",
    watcher: EthereumSigner,
    polling_interval: u64,
});
