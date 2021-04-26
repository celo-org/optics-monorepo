use ethers::core::types::H256;
use sha3::{Digest, Keccak256};

/// Computes hash of home domain concatenated with "OPTICS"
pub(crate) fn home_domain_hash(home_domain: u32) -> H256 {
    H256::from_slice(
        Keccak256::new()
            .chain(home_domain.to_be_bytes())
            .chain("OPTICS".as_bytes())
            .finalize()
            .as_slice(),
    )
}
