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
