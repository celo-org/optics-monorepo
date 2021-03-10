#![allow(non_snake_case)]

use mockall::*;

use ethers::core::types::H256;
use optics_core::accumulator::{ProverError, prover::Proof};

mock! {
    pub Prover {
        pub fn ingest(&mut self, element: H256) -> Result<H256, ProverError> {}
    
        pub fn root(&self) -> H256 {}
    
        pub fn count(&self) -> usize {}

        pub fn prove(&self, index: usize) -> Result<Proof, ProverError> {}
    
        pub fn verify(&self, proof: &Proof) -> Result<(), ProverError> {}
    }
}

impl std::fmt::Debug for MockProver {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MockProver")
    }
}