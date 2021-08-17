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

/// Configuration structs
pub mod settings;

#[cfg(not(doctest))]
pub use crate::{home::EthereumHome, replica::EthereumReplica, xapp::EthereumConnectionManager};
