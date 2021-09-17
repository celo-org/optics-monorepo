#![allow(non_snake_case)]

use async_trait::async_trait;
use mockall::*;

use optics_core::*;

mock! {
    pub ConnectionManagerContract {
        pub fn _local_domain(&self) -> u32 {}

        pub fn _is_replica(&self, address: OpticsIdentifier) -> Result<bool, ChainCommunicationError> {}

        pub fn _watcher_permission(
            &self,
            address: OpticsIdentifier,
            domain: u32,
        ) -> Result<bool, ChainCommunicationError> {}

        pub fn _owner_enroll_replica(
            &self,
            replica: OpticsIdentifier,
            domain: u32,
        ) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _owner_unenroll_replica(
            &self,
            replica: OpticsIdentifier,
        ) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _set_home(&self, home: OpticsIdentifier) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _set_watcher_permission(
            &self,
            watcher: OpticsIdentifier,
            domain: u32,
            access: bool,
        ) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _unenroll_replica(
            &self,
            signed_failure: &SignedFailureNotification,
        ) -> Result<TxOutcome, ChainCommunicationError> {}
    }
}

impl std::fmt::Debug for MockConnectionManagerContract {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MockConnectionManagerContract")
    }
}

#[async_trait]
impl ConnectionManager for MockConnectionManagerContract {
    fn local_domain(&self) -> u32 {
        self._local_domain()
    }

    async fn is_replica(&self, address: OpticsIdentifier) -> Result<bool, ChainCommunicationError> {
        self._is_replica(address)
    }

    async fn watcher_permission(
        &self,
        address: OpticsIdentifier,
        domain: u32,
    ) -> Result<bool, ChainCommunicationError> {
        self._watcher_permission(address, domain)
    }

    async fn owner_enroll_replica(
        &self,
        replica: OpticsIdentifier,
        domain: u32,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._owner_enroll_replica(replica, domain)
    }

    async fn owner_unenroll_replica(
        &self,
        replica: OpticsIdentifier,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._owner_unenroll_replica(replica)
    }

    async fn set_home(&self, home: OpticsIdentifier) -> Result<TxOutcome, ChainCommunicationError> {
        self._set_home(home)
    }

    async fn set_watcher_permission(
        &self,
        watcher: OpticsIdentifier,
        domain: u32,
        access: bool,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._set_watcher_permission(watcher, domain, access)
    }

    async fn unenroll_replica(
        &self,
        signed_failure: &SignedFailureNotification,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._unenroll_replica(signed_failure)
    }
}
