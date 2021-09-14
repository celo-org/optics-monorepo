//! Interfaces to the ethereum contracts

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod macros;

/// Home abi
#[cfg(not(doctest))]
mod home;

/// Replica abi
#[cfg(not(doctest))]
mod replica;

/// XAppConnectionManager abi
#[cfg(not(doctest))]
mod xapp;

/// Configuration structsß
pub mod settings;

use tokio::sync::OnceCell;

#[cfg(not(doctest))]
pub use crate::{home::EthereumHome, replica::EthereumReplica, xapp::EthereumConnectionManager};

/// Crate-wide state for reporting transaction counts
pub(crate) static TX_METRICS: OnceCell<prometheus::IntCounterVec> = OnceCell::const_new();

/// Initialize metric tracking for transaction counting.
///
/// Labels: network, agent, address.
///
/// Reports using a label for the destination contract under `address`.
pub async fn install_metrics(config: prometheus::IntCounterVec) {
    let config: Result<_, ()> = Ok(config);
    TX_METRICS
        .get_or_try_init(|| std::future::ready(config))
        .await
        .expect("metrics already installed! only call optics_ethereum::install_metrics once");
}
