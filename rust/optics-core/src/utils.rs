use std::str::FromStr;

use color_eyre::{eyre::bail, Report};
use ethers::core::types::H256;
use sha3::{Digest, Keccak256};

/// Computes hash of home domain concatenated with "OPTICS"
pub fn home_domain_hash(home_domain: u32) -> H256 {
    H256::from_slice(
        Keccak256::new()
            .chain(home_domain.to_be_bytes())
            .chain("OPTICS".as_bytes())
            .finalize()
            .as_slice(),
    )
}

/// Destination and destination-specific sequence combined in single field (
/// (destination << 32) & sequence)
pub fn destination_and_sequence(destination: u32, sequence: u32) -> u64 {
    assert!(destination < u32::MAX);
    assert!(sequence < u32::MAX);
    ((destination as u64) << 32) | sequence as u64
}

/// A Hex String of length `N` representing bytes of length `N / 2`
#[derive(Debug, Clone)]
pub struct HexString<const N: usize>(String);

impl<const N: usize> AsRef<String> for HexString<N> {
    fn as_ref(&self) -> &String {
        &self.0
    }
}

impl<const N: usize> HexString<N> {
    /// Instantiate a new HexString from a String
    pub fn from_string<S: AsRef<str>>(s: S) -> Result<Self, Report> {
        // Lazy. Should do the check as a cheaper action
        if s.as_ref().len() == N && hex::decode(s.as_ref()).is_ok() {
            return Ok(Self(s.as_ref().to_owned()));
        }
        bail!("Expected hex string of length {}", N)
    }
}

impl<const N: usize> FromStr for HexString<N> {
    type Err = Report;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_string(s)
    }
}

impl<'de, const N: usize> serde::Deserialize<'de> for HexString<N> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Self::from_string(s).map_err(serde::de::Error::custom)
    }
}
