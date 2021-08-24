use crate::{utils::home_domain_hash, Decode, Encode, OpticsError, SignerExt};
use ethers::{
    prelude::{Address, Signature},
    types::H256,
    utils::hash_message,
};
use ethers_signers::Signer;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};

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

impl std::fmt::Display for Update {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Update(domain {} moved from {} to {})",
            self.home_domain, self.previous_root, self.new_root
        )
    }
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
        let signature = signer
            .sign_message_without_eip_155(self.signing_hash())
            .await?;
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
        Ok(self.signature.recover(self.update.prepended_hash())?)
    }

    /// Check whether a message was signed by a specific address
    pub fn verify(&self, signer: Address) -> Result<(), OpticsError> {
        Ok(self
            .signature
            .verify(self.update.prepended_hash(), signer)?)
    }
}
