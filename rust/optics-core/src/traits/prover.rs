use ethers::core::types::H256;
use crate::accumulator::{ProverError, prover::{Proof}};

/// Prover functionality
pub trait ProverTrait {
    /// Push a leaf to the tree. Appends it to the first unoccupied slot
    ///
    /// This will fail if the underlying tree is full.
    fn ingest(&mut self, element: H256) -> Result<H256, ProverError>;
    
    /// Return the current root hash of the tree
    fn root(&self) -> H256;

    /// Return the number of leaves that have been ingested
    fn count(&self) -> usize;

    /// Create a proof of a leaf in this tree.
    ///
    /// Note, if the tree ingests more leaves, the root will need to be 
    /// recalculated.
    fn prove(&self, index: usize) -> Result<Proof, ProverError>;

    /// Verify a proof against this tree's root.
    fn verify(&self, proof: &Proof) -> Result<(), ProverError>;
}