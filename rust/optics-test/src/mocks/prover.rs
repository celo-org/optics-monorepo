#![allow(non_snake_case)]

use mockall::*;

use ethers::core::types::H256;
use optics_core::accumulator::{
    prover::{Proof, ProverTrait},
    ProverError,
};

mock! {
    pub Prover {
        pub fn _ingest(&mut self, element: H256) -> Result<H256, ProverError> {}

        pub fn _root(&self) -> H256 {}

        pub fn _count(&self) -> usize {}

        pub fn _prove(&self, index: usize) -> Result<Proof, ProverError> {}

        pub fn _verify(&self, proof: &Proof) -> Result<(), ProverError> {}
    }
}

impl std::fmt::Debug for MockProver {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MockProver")
    }
}

impl ProverTrait for MockProver {
    fn ingest(&mut self, element: H256) -> Result<H256, ProverError> {
        self._ingest(element)
    }

    fn root(&self) -> H256 {
        self._root()
    }

    fn count(&self) -> usize {
        self._count()
    }

    fn prove(&self, index: usize) -> Result<Proof, ProverError> {
        self._prove(index)
    }

    fn verify(&self, proof: &Proof) -> Result<(), ProverError> {
        self._verify(proof)
    }
}
