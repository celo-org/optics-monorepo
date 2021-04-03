//! Interfaces to the ethereum contracts

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

/// Home abi
#[cfg(not(doctest))]
mod home;

/// Replica abi
#[cfg(not(doctest))]
mod replica;

/// Base trait for an agent
mod utils;

#[cfg(not(doctest))]
pub use crate::{home::EthereumHome, replica::EthereumReplica};
