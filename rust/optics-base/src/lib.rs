//! This repo contains a simple framework for building Optics agents.
//! It has common utils and tools for configuring the app, interacting with the
//! smart contracts, etc.
//!
//! Implementations of the `Home` and `Replica` traits on different chains
//! ought to live here.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod settings;
pub use settings::*;

/// Base trait for an agent
mod agent;
pub use agent::*;

#[doc(hidden)]
#[cfg_attr(tarpaulin, skip)]
#[macro_use]
mod macros;
pub use macros::*;

/// Home type
mod home;
pub use home::*;

/// Replica type
mod replica;
pub use replica::*;
/// XAppConnectionManager type
mod xapp;
pub use xapp::*;

mod metrics;
pub use metrics::*;
