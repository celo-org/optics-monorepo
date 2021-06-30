use crate::accumulator::merkle::Proof;
use ethers::core::types::H256;
use std::{fs::File, io::Read};

/// Struct representing a single merkle test case
#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MerkleTestCase {
    /// Test case name
    pub test_name: String,
    /// Leaves of merkle tree
    pub leaves: Vec<String>,
    /// Proofs for leaves in tree
    pub proofs: Vec<Proof>,
    /// Root of tree
    pub expected_root: H256,
}

/// Reads merkle test case json file and returns a vector of `MerkleTestCase`s
pub fn load_merkle_test_json() -> Vec<MerkleTestCase> {
    let mut file = File::open("../../vectors/merkle.json").unwrap();
    let mut data = String::new();
    file.read_to_string(&mut data).unwrap();
    serde_json::from_str(&data).unwrap()
}
