//! Interfaces to the ethereum contracts

#![forbid(unsafe_code)]
// #![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod macros;

/// Home abi
#[cfg(not(doctest))]
mod home;

mod home_indexer;

/// Replica abi
#[cfg(not(doctest))]
mod replica;

/// XAppConnectionManager abi
#[cfg(not(doctest))]
mod xapp;

/// Configuration structs
pub mod settings;

#[cfg(not(doctest))]
pub use crate::{
    home::EthereumHome, home_indexer::*, replica::EthereumReplica, xapp::EthereumConnectionManager,
};
