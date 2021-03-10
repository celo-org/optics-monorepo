/// Mock home contract
pub mod home;

/// Mock replica contract
pub mod replica;

// Mock prover struct
pub mod prover;

pub use home::MockHomeContract;
pub use replica::MockReplicaContract;
pub use prover::MockProver;