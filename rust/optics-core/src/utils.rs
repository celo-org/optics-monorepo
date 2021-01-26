use ethers::core::types::H256;
use sha3::{Digest, Keccak256};

pub(crate) fn domain_hash(origin_slip44_id: u32) -> H256 {
    H256::from_slice(
        Keccak256::new()
            .chain(origin_slip44_id.to_be_bytes())
            .chain("OPTICS".as_bytes())
            .finalize()
            .as_slice(),
    )
}
