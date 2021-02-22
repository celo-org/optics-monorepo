//! Interfaces to the ethereum contracts

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

/// Settings and configuration from file
#[cfg(not(doctest))]
pub mod abis;

/// Base trait for an agent
mod utils;
