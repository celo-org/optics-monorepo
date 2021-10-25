use crate::{utils::home_domain_hash, OpticsError, OpticsIdentifier, SignerExt};
use ethers::{
    prelude::{Address, Signature},
    types::H256,
    utils::hash_message,
};
use ethers_signers::Signer;
use sha3::{Digest, Keccak256};
use serde::Serialize;

/// Failure notification produced by watcher
#[derive(optics_derive::JsonDebug, Serialize, Clone, Copy, PartialEq)]
pub struct FailureNotification {
    /// Domain of failed home
    pub home_domain: u32,
    /// Failed home's updater
    pub updater: OpticsIdentifier,
}

impl FailureNotification {
    fn signing_hash(&self) -> H256 {
        H256::from_slice(
            Keccak256::new()
                .chain(home_domain_hash(self.home_domain))
                .chain(self.home_domain.to_be_bytes())
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
        let signature = signer
            .sign_message_without_eip_155(self.signing_hash())
            .await?;
        Ok(SignedFailureNotification {
            notification: self,
            signature,
        })
    }
}

/// Signed failure notification produced by watcher
#[derive(optics_derive::JsonDebug, Serialize, Clone, Copy, PartialEq)]
pub struct SignedFailureNotification {
    /// Failure notification
    pub notification: FailureNotification,
    /// Signature
    pub signature: Signature,
}

impl SignedFailureNotification {
    /// Recover the Ethereum address of the signer
    pub fn recover(&self) -> Result<Address, OpticsError> {
        Ok(self.signature.recover(self.notification.prepended_hash())?)
    }

    /// Check whether a message was signed by a specific address
    pub fn verify(&self, signer: Address) -> Result<(), OpticsError> {
        Ok(self
            .signature
            .verify(self.notification.prepended_hash(), signer)?)
    }
}
