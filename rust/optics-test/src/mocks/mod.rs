/// Mock home contract
pub mod home;

/// Mock replica contract
pub mod replica;

/// Mock connection manager contract
pub mod xapp;

pub use home::MockHomeContract;
pub use replica::MockReplicaContract;
pub use xapp::MockConnectionManagerContract;
