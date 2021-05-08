use ethers::prelude::{H160, H256};

use crate::{Decode, Encode};

/// Identifier type.
///
/// Normally these will map to address types for different networks. For Optics,
/// we choose to _always_ serialize as 32 bytes
#[derive(Debug, Default, Copy, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct OpticsIdentifier(H256);

impl OpticsIdentifier {
    /// Check if the identifier is an ethereum address. This checks
    /// that the first 12 bytes are all 0.
    pub fn is_ethereum_address(&self) -> bool {
        self.0.as_bytes()[0..12].iter().all(|b| *b == 0)
    }

    /// Cast to an ethereum address by truncating.
    pub fn as_ethereum_address(&self) -> H160 {
        H160::from_slice(&self.0.as_ref()[12..])
    }
}

impl From<H256> for OpticsIdentifier {
    fn from(address: H256) -> Self {
        OpticsIdentifier(address)
    }
}

impl From<H160> for OpticsIdentifier {
    fn from(address: H160) -> Self {
        let mut id = OpticsIdentifier::default();
        id.as_mut()[12..].copy_from_slice(address.as_ref());
        id
    }
}

impl AsRef<[u8]> for OpticsIdentifier {
    fn as_ref(&self) -> &[u8] {
        self.0.as_ref()
    }
}

impl AsMut<[u8]> for OpticsIdentifier {
    fn as_mut(&mut self) -> &mut [u8] {
        self.0.as_mut()
    }
}

impl From<OpticsIdentifier> for H256 {
    fn from(addr: OpticsIdentifier) -> Self {
        addr.0
    }
}

impl From<OpticsIdentifier> for [u8; 32] {
    fn from(addr: OpticsIdentifier) -> Self {
        addr.0.into()
    }
}

impl Encode for OpticsIdentifier {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        self.0.write_to(writer)
    }
}

impl Decode for OpticsIdentifier {
    fn read_from<R>(reader: &mut R) -> Result<Self, crate::OpticsError>
    where
        R: std::io::Read,
        Self: Sized,
    {
        Ok(OpticsIdentifier(H256::read_from(reader)?))
    }
}
