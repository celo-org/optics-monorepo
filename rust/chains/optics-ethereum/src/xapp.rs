#![allow(clippy::enum_variant_names)]

use async_trait::async_trait;
use ethers::contract::abigen;
use ethers::core::types::Address;
use optics_core::{
    traits::{ChainCommunicationError, ConnectionManager, TxOutcome},
    OpticsIdentifier, SignedFailureNotification,
};
use std::sync::Arc;

use crate::report_tx;

#[allow(missing_docs)]
abigen!(
    EthereumConnectionManagerInternal,
    "./chains/optics-ethereum/abis/XAppConnectionManager.abi.json"
);

/// A reference to a XAppConnectionManager contract on some Ethereum chain
#[derive(Debug)]
pub struct EthereumConnectionManager<M>
where
    M: ethers::providers::Middleware,
{
    contract: EthereumConnectionManagerInternal<M>,
    domain: u32,
    name: String,
}

impl<M> EthereumConnectionManager<M>
where
    M: ethers::providers::Middleware,
{
    /// Create a reference to a XAppConnectionManager at a specific Ethereum
    /// address on some chain
    #[allow(dead_code)]
    pub fn new(name: &str, domain: u32, address: Address, provider: Arc<M>) -> Self {
        Self {
            contract: EthereumConnectionManagerInternal::new(address, provider),
            domain,
            name: name.to_owned(),
        }
    }
}

#[async_trait]
impl<M> ConnectionManager for EthereumConnectionManager<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn local_domain(&self) -> u32 {
        self.domain
    }

    #[tracing::instrument(err)]
    async fn is_owner(&self, address: OpticsIdentifier) -> Result<bool, ChainCommunicationError> {
        Ok(self
            .contract
            .is_owner(address.as_ethereum_address())
            .call()
            .await?)
    }

    #[tracing::instrument(err)]
    async fn is_replica(&self, address: OpticsIdentifier) -> Result<bool, ChainCommunicationError> {
        Ok(self
            .contract
            .is_replica(address.as_ethereum_address())
            .call()
            .await?)
    }

    #[tracing::instrument(err)]
    async fn watcher_permission(
        &self,
        address: OpticsIdentifier,
        domain: u32,
    ) -> Result<bool, ChainCommunicationError> {
        Ok(self
            .contract
            .watcher_permission(address.as_ethereum_address(), domain)
            .call()
            .await?)
    }

    #[tracing::instrument(err)]
    async fn owner_enroll_replica(
        &self,
        replica: OpticsIdentifier,
        domain: u32,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self
            .contract
            .owner_enroll_replica(replica.as_ethereum_address(), domain);

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err)]
    async fn owner_unenroll_replica(
        &self,
        replica: OpticsIdentifier,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self
            .contract
            .owner_unenroll_replica(replica.as_ethereum_address());

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err)]
    async fn set_home(&self, home: OpticsIdentifier) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.set_home(home.as_ethereum_address());

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err)]
    async fn set_watcher_permission(
        &self,
        watcher: OpticsIdentifier,
        domain: u32,
        access: bool,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let tx =
            self.contract
                .set_watcher_permission(watcher.as_ethereum_address(), domain, access);

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err)]
    async fn unenroll_replica(
        &self,
        signed_failure: &SignedFailureNotification,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.unenroll_replica(
            signed_failure.notification.home_domain,
            signed_failure.notification.updater.into(),
            signed_failure.signature.to_vec(),
        );

        Ok(report_tx!(tx).into())
    }
}
