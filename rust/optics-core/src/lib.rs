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

mod utils;

pub use encode::{Decode, Encode};

use ethers::{
    core::{
        types::{Address, Signature, SignatureError, H256},
        utils::hash_message,
    },
    signers::Signer,
};
use identifiers::OpticsIdentifier;
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

/// A full Optics message between chains
#[derive(Debug, Default, Clone)]
pub struct StampedMessage {
    /// 4   SLIP-44 ID
    pub origin: u32,
    /// 32  Address in origin convention
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
    /// The origin chain
    pub origin_domain: u32,
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
        writer.write_all(&self.origin_domain.to_be_bytes())?;
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
        let mut origin_domain = [0u8; 4];
        reader.read_exact(&mut origin_domain)?;

        let mut previous_root = H256::zero();
        reader.read_exact(previous_root.as_mut())?;

        let mut new_root = H256::zero();
        reader.read_exact(new_root.as_mut())?;

        Ok(Self {
            origin_domain: u32::from_be_bytes(origin_domain),
            previous_root,
            new_root,
        })
    }
}

impl Update {
    fn signing_hash(&self) -> H256 {
        // sign:
        // domain(origin) || previous_root || new_root
        H256::from_slice(
            Keccak256::new()
                .chain(domain_hash(self.origin_domain))
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
    pub async fn sign_with<S>(self, signer: &S) -> Result<SignedUpdate, S::Error>
    where
        S: Signer,
    {
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
pub struct FailureNotification {
    /// Domain of replica to unenroll
    pub domain: u32,
    /// Updater of replica to unenroll
    pub updater: OpticsIdentifier,
}

impl FailureNotification {
    fn signing_hash(&self) -> H256 {
        H256::from_slice(
            Keccak256::new()
                .chain(domain_hash(self.domain))
                .chain(self.domain.to_be_bytes())
                .chain(self.updater.as_ref())
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
    use serde_json::{json, Value};
    use std::{fs::OpenOptions, io::Write};

    #[test]
    fn it_sign() {
        let t = async {
            let signer: ethers::signers::LocalWallet =
                "1111111111111111111111111111111111111111111111111111111111111111"
                    .parse()
                    .unwrap();
            let message = Update {
                origin_domain: 5,
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

    /// Outputs signed update test cases in /vector/signedUpdateTestCases.json
    #[allow(dead_code)]
    fn it_outputs_signed_updates() {
        let t = async {
            let signer: ethers::signers::LocalWallet =
                "1111111111111111111111111111111111111111111111111111111111111111"
                    .parse()
                    .unwrap();

            let mut test_cases: Vec<Value> = Vec::new();

            // `origin_domain` MUST BE 1000 to match origin domain of Commmon
            // test suite
            for i in 1..=3 {
                let signed_update = Update {
                    origin_domain: 1000,
                    new_root: H256::repeat_byte(i + 1),
                    previous_root: H256::repeat_byte(i),
                }
                .sign_with(&signer)
                .await
                .expect("!sign_with");

                test_cases.push(json!({
                    "originDomain": signed_update.update.origin_domain,
                    "oldRoot": signed_update.update.previous_root,
                    "newRoot": signed_update.update.new_root,
                    "signature": signed_update.signature,
                    "signer": signer.address(),
                }))
            }

            let json = json!({ "testCases": test_cases }).to_string();

            let mut file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open("../../vectors/signedUpdateTestCases.json")
                .expect("Failed to open/create file");

            file.write_all(json.as_bytes())
                .expect("Failed to write to file");
        };

        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(t)
    }

    /// Outputs signed update test cases in /vector/signedFailureTestCases.json
    #[allow(dead_code)]
    fn it_outputs_signed_failure_notifications() {
        let t = async {
            let signer: ethers::signers::LocalWallet =
                "1111111111111111111111111111111111111111111111111111111111111111"
                    .parse()
                    .unwrap();

            let updater: ethers::signers::LocalWallet =
                "2222222222222222222222222222222222222222222222222222222222222222"
                    .parse()
                    .unwrap();

            // `origin_domain` MUST BE 1000 to match origin domain of
            // UsingOptics test suite
            let signed_failure = FailureNotification {
                domain: 1000,
                updater: updater.address().into(),
            }
            .sign_with(&signer)
            .await
            .expect("!sign_with");

            let updater = signed_failure.notification.updater;
            let signed_json = json!({
                "domain": signed_failure.notification.domain,
                "updater": updater,
                "signature": signed_failure.signature,
                "signer": signer.address()
            });

            let json = json!({ "testCases": vec!(signed_json) }).to_string();

            let mut file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open("../../vectors/signedFailureTestCases.json")
                .expect("Failed to open/create file");

            file.write_all(json.as_bytes())
                .expect("Failed to write to file");
        };

        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(t)
    }
}
