use ethers::core::types::H256;
use optics_core::accumulator::{
    prover::{Proof, ProverTrait},
    Prover, ProverError,
};

use optics_test::mocks::MockProver;

/// Prover type
#[derive(Debug)]
pub enum Provers {
    /// Prover struct
    Prover(Prover),
    /// Mock prover struct
    Mock(MockProver),
}

impl Provers {
    /// Calls checkpoint on mock variant. Should
    /// only be used during tests.
    #[doc(hidden)]
    pub fn checkpoint(&mut self) {
        if let Provers::Mock(prover) = self {
            prover.checkpoint();
        } else {
            panic!("Prover should be mock variant!");
        }
    }
}

impl Default for Provers {
    fn default() -> Self {
        Provers::Prover(Default::default())
    }
}

impl From<Prover> for Provers {
    fn from(prover: Prover) -> Self {
        Provers::Prover(prover)
    }
}

impl From<MockProver> for Provers {
    fn from(mock_prover: MockProver) -> Self {
        Provers::Mock(mock_prover)
    }
}

impl std::iter::FromIterator<H256> for Provers {
    /// Will panic if the tree fills
    fn from_iter<I: IntoIterator<Item = H256>>(iter: I) -> Self {
        let mut prover = Self::default();
        prover.extend(iter);
        prover
    }
}

impl std::iter::Extend<H256> for Provers {
    /// Will panic if the tree fills
    fn extend<I: IntoIterator<Item = H256>>(&mut self, iter: I) {
        for i in iter {
            self.ingest(i).expect("!tree full");
        }
    }
}

impl ProverTrait for Provers {
    fn ingest(&mut self, element: H256) -> Result<H256, ProverError> {
        match self {
            Provers::Prover(prover) => prover.ingest(element),
            Provers::Mock(mock_prover) => mock_prover.ingest(element),
        }
    }

    fn root(&self) -> H256 {
        match self {
            Provers::Prover(prover) => prover.root(),
            Provers::Mock(mock_prover) => mock_prover.root(),
        }
    }

    fn count(&self) -> usize {
        match self {
            Provers::Prover(prover) => prover.count(),
            Provers::Mock(mock_prover) => mock_prover.count(),
        }
    }

    fn prove(&self, index: usize) -> Result<Proof, ProverError> {
        match self {
            Provers::Prover(prover) => prover.prove(index),
            Provers::Mock(mock_prover) => mock_prover.prove(index),
        }
    }

    fn verify(&self, proof: &Proof) -> Result<(), ProverError> {
        match self {
            Provers::Prover(prover) => prover.verify(proof),
            Provers::Mock(mock_prover) => mock_prover.verify(proof),
        }
    }
}
