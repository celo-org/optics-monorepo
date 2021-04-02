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

use ethers::signers::LocalWallet;

#[cfg(feature = "ledger")]
use ethers::signers::Ledger;
#[cfg(feature = "yubi")]
use ethers::signers::YubiWallet;

/// Ethereum-supported signer types
pub enum Signers {
    /// A wallet instantiated with a locally stored private key
    Local(LocalWallet),
    /// A wallet instantiated with a YubiHSM
    #[cfg(feature = "ledger")]
    Ledger(Ledger),
    /// A wallet instantiated with a Ledger
    #[cfg(feature = "yubi")]
    Yubi(YubiWallet),
}
