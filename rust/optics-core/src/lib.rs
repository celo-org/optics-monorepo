//! Optics. OPTimistic Interchain Communication
//!
//! This crate contains core primitives, traits, and types for Optics
//! implementations.

#![warn(missing_docs)]
#![warn(unused_extern_crates)]
#![forbid(unsafe_code)]
#![forbid(where_clauses_object_safety)]

/// Accumulator management
pub mod accumulator;

/// Model instantatiations of the on-chain structures
pub mod models;

/// Async Traits for Homes & Replicas for use in applications
pub mod traits;

/// Utilities to match contract values
pub mod utils;

/// Testing utilities
pub mod test_utils;

/// Core optics system data structures
pub mod types;

/// DB related utilities
pub mod db;

/// Test functions that output json files for Solidity tests
#[cfg(feature = "output")]
pub mod test_output;

use std::convert::Infallible;

pub use identifiers::OpticsIdentifier;
pub use traits::encode::{Decode, Encode};
pub use types::*;

use async_trait::async_trait;
use ethers::{
    core::types::{Address, Signature, SignatureError, H256},
    prelude::{transaction::eip2718::TypedTransaction, AwsSigner},
    signers::{AwsSignerError, LocalWallet, Signer},
};

/// Error types for Optics
#[derive(Debug, thiserror::Error)]
pub enum OpticsError {
    /// Signature Error pasthrough
    #[error(transparent)]
    SignatureError(#[from] SignatureError),
    /// Update does not build off the current root
    #[error("Update has wrong current root. Expected: {expected}. Got: {actual}.")]
    WrongCurrentRoot {
        /// The provided root
        actual: H256,
        /// The current root
        expected: H256,
    },
    /// Update specifies a new root that is not in the queue. This is an
    /// improper update and is slashable
    #[error("Update has unknown new root: {0}")]
    UnknownNewRoot(H256),
    /// IO error from Read/Write usage
    #[error(transparent)]
    IoError(#[from] std::io::Error),
}

/// Error types for Signers
#[derive(Debug, thiserror::Error)]
pub enum SignersError {
    /// AWS Signer Error
    #[error("{0}")]
    AwsSignerError(#[from] AwsSignerError),
}

impl From<Infallible> for SignersError {
    fn from(_error: Infallible) -> Self {
        panic!("infallible")
    }
}

/// Ethereum-supported signer types
#[derive(Debug)]
pub enum Signers {
    /// A wallet instantiated with a locally stored private key
    Local(LocalWallet),
    /// A signer using a key stored in aws kms
    Aws(AwsSigner<'static>),
}

impl From<LocalWallet> for Signers {
    fn from(s: LocalWallet) -> Self {
        Signers::Local(s)
    }
}

impl From<AwsSigner<'static>> for Signers {
    fn from(s: AwsSigner<'static>) -> Self {
        Signers::Aws(s)
    }
}

#[async_trait]
impl Signer for Signers {
    type Error = SignersError;

    fn with_chain_id<T: Into<u64>>(self, chain_id: T) -> Self {
        match self {
            Signers::Local(signer) => signer.with_chain_id(chain_id).into(),
            Signers::Aws(signer) => signer.with_chain_id(chain_id).into(),
        }
    }

    async fn sign_message<S: Send + Sync + AsRef<[u8]>>(
        &self,
        message: S,
    ) -> Result<Signature, Self::Error> {
        match self {
            Signers::Local(signer) => Ok(signer.sign_message(message).await?),
            Signers::Aws(signer) => Ok(signer.sign_message(message).await?),
        }
    }

    async fn sign_transaction(&self, message: &TypedTransaction) -> Result<Signature, Self::Error> {
        match self {
            Signers::Local(signer) => Ok(signer.sign_transaction(message).await?),

            Signers::Aws(signer) => Ok(signer.sign_transaction(message).await?),
        }
    }

    fn address(&self) -> Address {
        match self {
            Signers::Local(signer) => signer.address(),
            Signers::Aws(signer) => signer.address(),
        }
    }

    fn chain_id(&self) -> u64 {
        match self {
            Signers::Local(signer) => signer.chain_id(),
            Signers::Aws(signer) => signer.chain_id(),
        }
    }
}

#[async_trait]
trait SignerExt: Signer {
    async fn sign_message_without_eip_155<S: Send + Sync + AsRef<[u8]>>(
        &self,
        message: S,
    ) -> Result<Signature, <Self as Signer>::Error> {
        let mut signature = self.sign_message(message).await?;
        signature.v = 28 - (signature.v % 2);
        Ok(signature)
    }
}

impl<T> SignerExt for T where T: Signer {}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn it_sign() {
        let t = async {
            let signer: ethers::signers::LocalWallet =
                "1111111111111111111111111111111111111111111111111111111111111111"
                    .parse()
                    .unwrap();
            let message = Update {
                home_domain: 5,
                new_root: H256::repeat_byte(1),
                previous_root: H256::repeat_byte(2),
            };

            let signed = message.sign_with(&signer).await.expect("!sign_with");
            assert!(signed.signature.v == 27 || signed.signature.v == 28);
            signed.verify(signer.address()).expect("!verify");
        };
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(t)
    }
}
