//! This repo contains a simple framework for building Optics agents.
//! It has common utils and tools for configuring the app, interacting with the
//! smart contracts, etc.
//!
//! Implementations of the `Home` and `Replica` traits on different chains
//! ought to live here.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

pub mod settings;

/// Base trait for an agent
pub mod agent;

/// DB related utilities
pub mod db;
pub use db::persistence;

#[doc(hidden)]
#[cfg_attr(tarpaulin, skip)]
#[macro_use]
pub mod macros;

/// Home type
pub mod home;

/// Replica type
pub mod replica;

/// XAppConnectionManager type
pub mod xapp;

pub mod metrics;
