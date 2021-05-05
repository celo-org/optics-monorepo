use async_trait::async_trait;
use optics_core::{
    traits::{ChainCommunicationError, ConnectionManager, TxOutcome},
    OpticsIdentifier, SignedFailureNotification,
};

use optics_ethereum::EthereumConnectionManager;
use optics_test::mocks::MockConnectionManagerContract;

/// Replica type
#[derive(Debug)]
pub enum ConnectionManagers {
    /// Ethereum connection manager contract
    Ethereum(Box<dyn ConnectionManager>),
    /// Mock connection manager contract
    Mock(Box<MockConnectionManagerContract>),
    /// Other connection manager variant
    Other(Box<dyn ConnectionManager>),
}

impl ConnectionManagers {
    /// Calls checkpoint on mock variant. Should
    /// only be used during tests.
    #[doc(hidden)]
    pub fn checkpoint(&mut self) {
        if let ConnectionManagers::Mock(connection_manager) = self {
            connection_manager.checkpoint();
        } else {
            panic!("ConnectionManager should be mock variant!");
        }
    }
}

impl<M> From<EthereumConnectionManager<M>> for ConnectionManagers
where
    M: ethers::providers::Middleware + 'static,
{
    fn from(connection_manager: EthereumConnectionManager<M>) -> Self {
        ConnectionManagers::Ethereum(Box::new(connection_manager))
    }
}

impl From<MockConnectionManagerContract> for ConnectionManagers {
    fn from(mock_connection_manager: MockConnectionManagerContract) -> Self {
        ConnectionManagers::Mock(Box::new(mock_connection_manager))
    }
}

impl From<Box<dyn ConnectionManager>> for ConnectionManagers {
    fn from(connection_manager: Box<dyn ConnectionManager>) -> Self {
        ConnectionManagers::Other(connection_manager)
    }
}

#[async_trait]
impl ConnectionManager for ConnectionManagers {
    fn local_domain(&self) -> u32 {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => connection_manager.local_domain(),
            ConnectionManagers::Mock(connection_manager) => connection_manager.local_domain(),
            ConnectionManagers::Other(connection_manager) => connection_manager.local_domain(),
        }
    }

    async fn is_owner(&self, address: OpticsIdentifier) -> Result<bool, ChainCommunicationError> {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => {
                connection_manager.is_owner(address).await
            }
            ConnectionManagers::Mock(connection_manager) => {
                connection_manager.is_owner(address).await
            }
            ConnectionManagers::Other(connection_manager) => {
                connection_manager.is_owner(address).await
            }
        }
    }

    async fn is_replica(&self, address: OpticsIdentifier) -> Result<bool, ChainCommunicationError> {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => {
                connection_manager.is_replica(address).await
            }
            ConnectionManagers::Mock(connection_manager) => {
                connection_manager.is_replica(address).await
            }
            ConnectionManagers::Other(connection_manager) => {
                connection_manager.is_replica(address).await
            }
        }
    }

    async fn watcher_permission(
        &self,
        address: OpticsIdentifier,
        domain: u32,
    ) -> Result<bool, ChainCommunicationError> {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => {
                connection_manager.watcher_permission(address, domain).await
            }
            ConnectionManagers::Mock(connection_manager) => {
                connection_manager.watcher_permission(address, domain).await
            }
            ConnectionManagers::Other(connection_manager) => {
                connection_manager.watcher_permission(address, domain).await
            }
        }
    }

    async fn owner_enroll_replica(
        &self,
        replica: OpticsIdentifier,
        domain: u32,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => {
                connection_manager
                    .owner_enroll_replica(replica, domain)
                    .await
            }
            ConnectionManagers::Mock(connection_manager) => {
                connection_manager
                    .owner_enroll_replica(replica, domain)
                    .await
            }
            ConnectionManagers::Other(connection_manager) => {
                connection_manager
                    .owner_enroll_replica(replica, domain)
                    .await
            }
        }
    }

    async fn owner_unenroll_replica(
        &self,
        replica: OpticsIdentifier,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => {
                connection_manager.owner_unenroll_replica(replica).await
            }
            ConnectionManagers::Mock(connection_manager) => {
                connection_manager.owner_unenroll_replica(replica).await
            }
            ConnectionManagers::Other(connection_manager) => {
                connection_manager.owner_unenroll_replica(replica).await
            }
        }
    }

    async fn set_home(&self, home: OpticsIdentifier) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => {
                connection_manager.set_home(home).await
            }
            ConnectionManagers::Mock(connection_manager) => connection_manager.set_home(home).await,
            ConnectionManagers::Other(connection_manager) => {
                connection_manager.set_home(home).await
            }
        }
    }

    async fn set_watcher_permission(
        &self,
        watcher: OpticsIdentifier,
        domain: u32,
        access: bool,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => {
                connection_manager
                    .set_watcher_permission(watcher, domain, access)
                    .await
            }
            ConnectionManagers::Mock(connection_manager) => {
                connection_manager
                    .set_watcher_permission(watcher, domain, access)
                    .await
            }
            ConnectionManagers::Other(connection_manager) => {
                connection_manager
                    .set_watcher_permission(watcher, domain, access)
                    .await
            }
        }
    }

    async fn unenroll_replica(
        &self,
        signed_failure: &SignedFailureNotification,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        match self {
            ConnectionManagers::Ethereum(connection_manager) => {
                connection_manager.unenroll_replica(signed_failure).await
            }
            ConnectionManagers::Mock(connection_manager) => {
                connection_manager.unenroll_replica(signed_failure).await
            }
            ConnectionManagers::Other(connection_manager) => {
                connection_manager.unenroll_replica(signed_failure).await
            }
        }
    }
}
