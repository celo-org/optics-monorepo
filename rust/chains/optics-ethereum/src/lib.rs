//! Interfaces to the ethereum contracts
#![cfg(not(doctest))]
#![forbid(unsafe_code)]
// #![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod macros;

/// Home abi
pub(crate) mod home;
mod home_indexer;

/// Replica abi
mod replica;

/// XAppConnectionManager abi
mod xapp;

/// Configuration structs
pub mod settings;

pub use crate::{
    home::EthereumHome, home_indexer::*, replica::EthereumReplica, xapp::EthereumConnectionManager,
};
