use crate::accumulator::{
    merkle::{merkle_root_from_branch, MerkleTree, MerkleTreeError},
    TREE_DEPTH,
};

use ethers::core::types::H256;

/// A merkle proof object. The leaf, its path to the root, and its index in the
/// tree.
#[derive(Debug, Clone, Copy)]
pub struct Proof {
    leaf: H256,
    index: usize,
    path: [H256; TREE_DEPTH],
}

/// A depth-32 sparse Merkle tree capable of producing proofs for arbitrary
/// elements.
#[derive(Debug)]
pub struct Prover {
    count: usize,
    tree: MerkleTree,
}

/// Prover Errors
#[derive(Debug, thiserror::Error)]
pub enum ProverError {
    /// Index is above tree max size
    #[error("Requested proof for index above u32::MAX: {0}")]
    IndexTooHigh(usize),
    /// Requested proof for a zero element
    #[error("Requested proof for a zero element. Requested: {index}. Tree has: {count}")]
    ZeroProof {
        /// The index requested
        index: usize,
        /// The number of leaves
        count: usize,
    },
    /// Bubbled up from underlying
    #[error(transparent)]
    MerkleTreeError(#[from] MerkleTreeError),
    /// Failed proof verification
    #[error("Proof verification failed. Root is {expected}, produced is {actual}")]
    VerificationFailed {
        /// The expected root (this tree's current root)
        expected: H256,
        /// The root produced by branch evaluation
        actual: H256,
    },
}

impl Default for Prover {
    fn default() -> Self {
        let full = MerkleTree::create(&[], TREE_DEPTH);
        Self {
            count: 0,
            tree: full,
        }
    }
}

impl Prover {
    /// Push a leaf to the tree. Appends it to the first unoccupied slot
    ///
    /// This will fail if the underlying tree is full.
    pub fn ingest(&mut self, element: H256) -> Result<H256, ProverError> {
        self.count += 1;
        self.tree.push_leaf(element, TREE_DEPTH)?;
        Ok(self.tree.hash())
    }

    /// Return the current root hash of the tree
    pub fn root(&self) -> H256 {
        self.tree.hash()
    }

    /// Return the number of leaves that have been ingested
    pub fn count(&self) -> usize {
        self.count
    }

    /// Create a proof of a leaf in this tree.
    ///
    /// Note, if the tree ingests more leaves, the root will need to be recalculated.
    pub fn prove(&self, index: usize) -> Result<Proof, ProverError> {
        if index > u32::MAX as usize {
            return Err(ProverError::IndexTooHigh(index));
        }
        let count = self.count();
        if index >= count as usize {
            return Err(ProverError::ZeroProof { index, count });
        }

        let (leaf, hashes) = self.tree.generate_proof(index, TREE_DEPTH);
        let mut path = [H256::zero(); 32];
        path.copy_from_slice(&hashes[..32]);
        Ok(Proof { leaf, index, path })
    }

    /// Verify a proof against this tree's root.
    pub fn verify(&self, proof: &Proof) -> Result<(), ProverError> {
        let actual = merkle_root_from_branch(proof.leaf, &proof.path, TREE_DEPTH, proof.index);
        let expected = self.root();
        if expected == actual {
            Ok(())
        } else {
            Err(ProverError::VerificationFailed { expected, actual })
        }
    }
}

impl<T> From<T> for Prover
where
    T: AsRef<[H256]>,
{
    fn from(t: T) -> Self {
        let slice = t.as_ref();
        Self {
            count: slice.len(),
            tree: MerkleTree::create(slice, TREE_DEPTH),
        }
    }
}

impl std::iter::FromIterator<H256> for Prover {
    /// Will panic if the tree fills
    fn from_iter<I: IntoIterator<Item = H256>>(iter: I) -> Self {
        let mut prover = Self::default();
        prover.extend(iter);
        prover
    }
}

impl std::iter::Extend<H256> for Prover {
    /// Will panic if the tree fills
    fn extend<I: IntoIterator<Item = H256>>(&mut self, iter: I) {
        for i in iter {
            self.ingest(i).expect("!tree full");
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn it_test() {
        let mut tree = Prover::default();

        let elements: Vec<_> = (1..32).map(|i| H256::repeat_byte(i as u8)).collect();
        tree.ingest(elements[0]).unwrap();
        tree.ingest(elements[1]).unwrap();
        tree.ingest(elements[2]).unwrap();

        assert_eq!(tree.count(), 3);

        let idx = 1;
        let proof = tree.prove(idx).unwrap();
        dbg!(&proof);
        tree.verify(&proof).unwrap();
    }
}
