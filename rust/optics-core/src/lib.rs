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

/// Traits for canonical binary representations
pub mod encode;

/// Unified 32-byte identifier with convenience tooling for handling
/// 20-byte ids (e.g ethereum addresses)
pub mod identifiers;

/// Testing utilities
pub mod test_utils;

/// Test functions that output json files for Solidity tests
#[cfg(feature = "output")]
pub mod test_output;

mod utils;

use std::convert::Infallible;

pub use encode::{Decode, Encode};
pub use identifiers::OpticsIdentifier;

use async_trait::async_trait;
use ethers::{
    core::{
        types::{Address, Signature, SignatureError, TransactionRequest, H256},
        utils::hash_message,
    },
    signers::Signer,
};

use ethers::signers::LocalWallet;
#[cfg(feature = "yubi")]
use ethers::signers::YubiWallet;
#[cfg(feature = "ledger")]
use ethers::signers::{Ledger, LedgerError};

use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};

use crate::utils::*;

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
    // /// ChainCommunicationError
    // #[error(transparent)]
    // ChainCommunicationError(#[from] ChainCommunicationError),
}

/// Error types for Signers
#[derive(Debug, thiserror::Error)]
pub enum SignersError {
    /// Wallet<T> signers infallible
    #[error(transparent)]
    Infallible(Infallible),
    /// Ledger error
    #[cfg(feature = "ledger")]
    Ledger(#[from] LedgerError),
}

impl From<Infallible> for SignersError {
    fn from(error: Infallible) -> Self {
        SignersError::Infallible(error)
    }
}

#[cfg(feature = "ledger")]
impl From<LedgerError> for SignersError {
    fn from(error: LedgerError) -> Self {
        SignersError::Infallible(error)
    }
}

/// Ethereum-supported signer types
#[derive(Debug)]
pub enum Signers {
    /// A wallet instantiated with a locally stored private key
    Local(LocalWallet),
    /// A wallet instantiated with a YubiHSM
    #[cfg(feature = "yubi")]
    Yubi(YubiWallet),
    /// A wallet instantiated with a Ledger
    #[cfg(feature = "ledger")]
    Ledger(Ledger),
}

impl From<LocalWallet> for Signers {
    fn from(local_wallet: LocalWallet) -> Self {
        Signers::Local(local_wallet)
    }
}

#[cfg(feature = "ledger")]
impl From<Ledger> for Signers {
    fn from(ledger: Ledger) -> Self {
        Signers::Ledger(ledger)
    }
}

#[cfg(feature = "yubi")]
impl From<YubiWallet> for Signers {
    fn from(yubi_wallet: YubiWallet) -> Self {
        Signers::Yubi(local_wallet)
    }
}

#[async_trait]
impl Signer for Signers {
    type Error = SignersError;

    async fn sign_message<S: Send + Sync + AsRef<[u8]>>(
        &self,
        message: S,
    ) -> Result<Signature, Self::Error> {
        match self {
            Signers::Local(signer) => Ok(signer.sign_message(message).await?),
            #[cfg(feature = "yubi")]
            Signers::Yubi(signer) => Ok(signer.sign_message(message).await?),
            #[cfg(feature = "ledger")]
            Signers::Ledger(signer) => Ok(signer.sign_message(message).await?),
        }
    }

    async fn sign_transaction(
        &self,
        message: &TransactionRequest,
    ) -> Result<Signature, Self::Error> {
        match self {
            Signers::Local(signer) => Ok(signer.sign_transaction(message).await?),
            #[cfg(feature = "yubi")]
            Signers::Yubi(signer) => Ok(signer.sign_transaction(message).await?),
            #[cfg(feature = "ledger")]
            Signers::Ledger(signer) => Ok(signer.sign_transaction(message).await?),
        }
    }

    fn address(&self) -> Address {
        match self {
            Signers::Local(signer) => signer.address(),
            #[cfg(feature = "yubi")]
            Signers::Yubi(signer) => signer.address(),
            #[cfg(feature = "ledger")]
            Signers::Ledger(signer) => signer.address(),
        }
    }
}

/// A full Optics message between chains
#[derive(Debug, Default, Clone)]
pub struct StampedMessage {
    /// 4   SLIP-44 ID
    pub origin: u32,
    /// 32  Address in home convention
    pub sender: H256,
    /// 4   SLIP-44 ID
    pub destination: u32,
    /// 32  Address in destination convention
    pub recipient: H256,
    /// 4   Count of all previous messages to destination
    pub sequence: u32,
    /// 0+  Message contents
    pub body: Vec<u8>,
}

/// A partial Optics message between chains
#[derive(Debug, Default, Clone)]
pub struct Message {
    /// 4   SLIP-44 ID
    pub destination: u32,
    /// 32  Address in destination convention
    pub recipient: H256,
    /// 0+  Message contents
    pub body: Vec<u8>,
}

impl Encode for StampedMessage {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        writer.write_all(&self.origin.to_be_bytes())?;
        writer.write_all(self.sender.as_ref())?;
        writer.write_all(&self.destination.to_be_bytes())?;
        writer.write_all(self.recipient.as_ref())?;
        writer.write_all(&self.sequence.to_be_bytes())?;
        Ok(36 + 36 + 4 + self.body.len())
    }
}

impl Decode for StampedMessage {
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
    {
        let mut origin = [0u8; 4];
        reader.read_exact(&mut origin)?;

        let mut sender = H256::zero();
        reader.read_exact(sender.as_mut())?;

        let mut destination = [0u8; 4];
        reader.read_exact(&mut destination)?;

        let mut recipient = H256::zero();
        reader.read_exact(recipient.as_mut())?;

        let mut sequence = [0u8; 4];
        reader.read_exact(&mut sequence)?;

        let mut body = vec![];
        reader.read_to_end(&mut body)?;

        Ok(Self {
            origin: u32::from_be_bytes(origin),
            sender,
            destination: u32::from_be_bytes(destination),
            recipient,
            sequence: u32::from_be_bytes(sequence),
            body,
        })
    }
}

impl StampedMessage {
    /// Convert the message to a leaf
    pub fn to_leaf(&self) -> H256 {
        let mut k = Keccak256::new();
        self.write_to(&mut k).expect("!write");
        H256::from_slice(k.finalize().as_slice())
    }
}

/// An Optics update message
#[derive(Copy, Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Update {
    /// The home chain
    pub home_domain: u32,
    /// The previous root
    pub previous_root: H256,
    /// The new root
    pub new_root: H256,
}

impl Encode for Update {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        writer.write_all(&self.home_domain.to_be_bytes())?;
        writer.write_all(self.previous_root.as_ref())?;
        writer.write_all(self.new_root.as_ref())?;
        Ok(4 + 32 + 32)
    }
}

impl Decode for Update {
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
        Self: Sized,
    {
        let mut home_domain = [0u8; 4];
        reader.read_exact(&mut home_domain)?;

        let mut previous_root = H256::zero();
        reader.read_exact(previous_root.as_mut())?;

        let mut new_root = H256::zero();
        reader.read_exact(new_root.as_mut())?;

        Ok(Self {
            home_domain: u32::from_be_bytes(home_domain),
            previous_root,
            new_root,
        })
    }
}

impl Update {
    fn signing_hash(&self) -> H256 {
        // sign:
        // domain(home_domain) || previous_root || new_root
        H256::from_slice(
            Keccak256::new()
                .chain(home_domain_hash(self.home_domain))
                .chain(self.previous_root)
                .chain(self.new_root)
                .finalize()
                .as_slice(),
        )
    }

    fn prepended_hash(&self) -> H256 {
        hash_message(self.signing_hash())
    }

    /// Sign an update using the specified signer
    pub async fn sign_with<S: Signer>(self, signer: &S) -> Result<SignedUpdate, S::Error> {
        let signature = signer.sign_message(self.signing_hash()).await?;
        Ok(SignedUpdate {
            update: self,
            signature,
        })
    }
}

/// A Signed Optics Update
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct SignedUpdate {
    /// The update
    pub update: Update,
    /// The signature
    pub signature: Signature,
}

impl Encode for SignedUpdate {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        let mut written = 0;
        written += self.update.write_to(writer)?;
        written += self.signature.write_to(writer)?;
        Ok(written)
    }
}

impl Decode for SignedUpdate {
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
        Self: Sized,
    {
        let update = Update::read_from(reader)?;
        let signature = Signature::read_from(reader)?;
        Ok(Self { update, signature })
    }
}

impl SignedUpdate {
    /// Recover the Ethereum address of the signer
    pub fn recover(&self) -> Result<Address, OpticsError> {
        dbg!(self.update.prepended_hash());
        Ok(self.signature.recover(self.update.prepended_hash())?)
    }

    /// Check whether a message was signed by a specific address
    pub fn verify(&self, signer: Address) -> Result<(), OpticsError> {
        Ok(self
            .signature
            .verify(self.update.prepended_hash(), signer)?)
    }
}

/// Failure notification produced by watcher
#[derive(Debug)]
pub struct FailureNotification {
    /// Domain of replica to unenroll
    pub home_domain: u32,
    /// Updater of replica to unenroll
    pub updater: OpticsIdentifier,
}

impl FailureNotification {
    fn signing_hash(&self) -> H256 {
        H256::from_slice(
            Keccak256::new()
                .chain(home_domain_hash(self.home_domain))
                .chain(self.home_domain.to_be_bytes())
                .chain(self.updater.as_ref_local())
                .finalize()
                .as_slice(),
        )
    }

    fn prepended_hash(&self) -> H256 {
        hash_message(self.signing_hash())
    }

    /// Sign an `FailureNotification` using the specified signer
    pub async fn sign_with<S>(self, signer: &S) -> Result<SignedFailureNotification, S::Error>
    where
        S: Signer,
    {
        let signature = signer.sign_message(self.signing_hash()).await?;
        Ok(SignedFailureNotification {
            notification: self,
            signature,
        })
    }
}

/// Signed failure notification produced by watcher
#[derive(Debug)]
pub struct SignedFailureNotification {
    /// Failure notification
    pub notification: FailureNotification,
    /// Signature
    pub signature: Signature,
}

impl SignedFailureNotification {
    /// Recover the Ethereum address of the signer
    pub fn recover(&self) -> Result<Address, OpticsError> {
        dbg!(self.notification.prepended_hash());
        Ok(self.signature.recover(self.notification.prepended_hash())?)
    }

    /// Check whether a message was signed by a specific address
    pub fn verify(&self, signer: Address) -> Result<(), OpticsError> {
        Ok(self
            .signature
            .verify(self.notification.prepended_hash(), signer)?)
    }
}

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
            signed.verify(signer.address()).expect("!verify");
        };
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(t)
    }
}
