//! Optics. OPTimistic Interchain Communication
//!
//! This crate contains core primitives, traits, and types for Optics
//! implementations.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]
#![forbid(where_clauses_object_safety)]

/// Accumulator management
pub mod accumulator;

/// Model instantatiations of the on-chain structures
pub mod models;

/// Async Traits for Homes & Replicas for use in applications
pub mod traits;

mod utils;

use ethers::{
    core::{
        types::{Address, Signature, SignatureError, H256},
        utils::hash_message,
    },
    signers::Signer,
};
use sha3::{Digest, Keccak256};
use std::convert::TryFrom;

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

/// Simple trait for types with a canonical encoding
pub trait Encode {
    /// Write the canonical encoding to the writer
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write;

    /// Serialize to a vec
    fn to_vec(&self) -> Vec<u8> {
        let mut buf = vec![];
        self.write_to(&mut buf).expect("!alloc");
        buf
    }
}

/// Simple trait for types with a canonical encoding
pub trait Decode {
    /// Try to read from some source
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
        Self: Sized;
}

impl Encode for Signature {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        writer.write_all(&self.to_vec())?;
        Ok(65)
    }
}

impl Decode for Signature {
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
    {
        let mut buf = [0u8; 65];
        let len = reader.read(&mut buf)?;
        if len != 65 {
            Err(SignatureError::InvalidLength(len).into())
        } else {
            Ok(Self::try_from(buf.as_ref())?)
        }
    }
}

/// An Optics message between chains
#[derive(Debug, Default, Clone)]
pub struct Message {
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

impl Encode for Message {
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

impl Decode for Message {
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

impl Message {
    /// Convert the message to a leaf
    pub fn to_leaf(&self) -> H256 {
        let mut k = Keccak256::new();
        self.write_to(&mut k).expect("!write");
        H256::from_slice(k.finalize().as_slice())
    }
}

/// An Optics update message
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub struct Update {
    /// The origin chain
    pub origin_slip44: u32,
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
        writer.write_all(&self.origin_slip44.to_be_bytes())?;
        writer.write_all(self.previous_root.as_ref())?;
        writer.write_all(self.new_root.as_ref())?;
        Ok(4 + 32 + 32)
    }
}

impl Update {
    fn signing_hash(&self) -> H256 {
        // sign:
        // domain(origin) || previous_root || new_root
        H256::from_slice(
            Keccak256::new()
                .chain(domain_hash(self.origin_slip44))
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
#[derive(Clone, Debug, Eq, PartialEq)]
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
                origin_slip44: 5,
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
