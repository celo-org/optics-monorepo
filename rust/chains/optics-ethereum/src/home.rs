#![allow(clippy::enum_variant_names)]
#![allow(missing_docs)]

use async_trait::async_trait;
use color_eyre::Result;
use ethers::contract::abigen;
use ethers::core::types::{Signature, H256};
use optics_core::*;
use optics_core::{
    ChainCommunicationError, Common, DoubleUpdate, Home, Message, RawCommittedMessage,
    SignedUpdate, State, TxOutcome, Update,
};
use std::{convert::TryFrom, error::Error as StdError, sync::Arc};
use tracing::instrument;

use crate::report_tx;

abigen!(
    EthereumHomeInternal,
    "./chains/optics-ethereum/abis/Home.abi.json"
);

impl<M> std::fmt::Display for EthereumHomeInternal<M>
where
    M: ethers::providers::Middleware,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Debug)]
/// Struct that retrieves event data for an Ethereum home
pub struct EthereumHomeIndexer<M>
where
    M: ethers::providers::Middleware,
{
    contract: Arc<EthereumHomeInternal<M>>,
    provider: Arc<M>,
    from_height: u32,
    chunk_size: u32,
}

impl<M> EthereumHomeIndexer<M>
where
    M: ethers::providers::Middleware + 'static,
{
    /// Create new EthereumHomeIndexer
    pub fn new(
        provider: Arc<M>,
        ContractLocator {
            name: _,
            domain: _,
            address,
        }: &ContractLocator,
        from_height: u32,
        chunk_size: u32,
    ) -> Self {
        Self {
            contract: Arc::new(EthereumHomeInternal::new(address, provider.clone())),
            provider,
            from_height,
            chunk_size,
        }
    }
}

#[async_trait]
impl<M> CommonIndexer for EthereumHomeIndexer<M>
where
    M: ethers::providers::Middleware + 'static,
{
    #[instrument(err, skip(self))]
    async fn get_block_number(&self) -> Result<u32> {
        Ok(self.provider.get_block_number().await?.as_u32())
    }

    #[instrument(err, skip(self))]
    async fn fetch_sorted_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        let mut events = self
            .contract
            .update_filter()
            .from_block(from)
            .to_block(to)
            .query_with_meta()
            .await?;

        events.sort_by(|a, b| {
            let mut ordering = a.1.block_number.cmp(&b.1.block_number);
            if ordering == std::cmp::Ordering::Equal {
                ordering = a.1.transaction_index.cmp(&b.1.transaction_index);
            }

            ordering
        });

        Ok(events
            .iter()
            .map(|event| {
                let signature = Signature::try_from(event.0.signature.as_slice())
                    .expect("chain accepted invalid signature");

                let update = Update {
                    home_domain: event.0.home_domain,
                    previous_root: event.0.old_root.into(),
                    new_root: event.0.new_root.into(),
                };

                SignedUpdateWithMeta {
                    signed_update: SignedUpdate { update, signature },
                    metadata: UpdateMeta {
                        block_number: event.1.block_number.as_u64(),
                    },
                }
            })
            .collect())
    }
}

#[async_trait]
impl<M> HomeIndexer for EthereumHomeIndexer<M>
where
    M: ethers::providers::Middleware + 'static,
{
    #[instrument(err, skip(self))]
    async fn fetch_sorted_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        let mut events = self
            .contract
            .dispatch_filter()
            .from_block(from)
            .to_block(to)
            .query()
            .await?;

        events.sort_by(|a, b| a.leaf_index.cmp(&b.leaf_index));

        Ok(events
            .into_iter()
            .map(|f| RawCommittedMessage {
                leaf_index: f.leaf_index.as_u32(),
                committed_root: f.committed_root.into(),
                message: f.message,
            })
            .collect())
    }
}

/// A reference to a Home contract on some Ethereum chain
#[derive(Debug)]
pub struct EthereumHome<M>
where
    M: ethers::providers::Middleware,
{
    contract: Arc<EthereumHomeInternal<M>>,
    domain: u32,
    name: String,
    provider: Arc<M>,
}

impl<M> EthereumHome<M>
where
    M: ethers::providers::Middleware + 'static,
{
    /// Create a reference to a Home at a specific Ethereum address on some
    /// chain
    pub fn new(
        provider: Arc<M>,
        ContractLocator {
            name,
            domain,
            address,
        }: &ContractLocator,
    ) -> Self {
        Self {
            contract: Arc::new(EthereumHomeInternal::new(address, provider.clone())),
            domain: *domain,
            name: name.to_owned(),
            provider,
        }
    }
}

#[async_trait]
impl<M> Common for EthereumHome<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn name(&self) -> &str {
        &self.name
    }

    #[tracing::instrument(err, skip(self))]
    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        let receipt_opt = self
            .contract
            .client()
            .get_transaction_receipt(txid)
            .await
            .map_err(|e| Box::new(e) as Box<dyn StdError + Send + Sync>)?;

        Ok(receipt_opt.map(Into::into))
    }

    #[tracing::instrument(err, skip(self))]
    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.updater().call().await?.into())
    }

    #[tracing::instrument(err, skip(self))]
    async fn state(&self) -> Result<State, ChainCommunicationError> {
        let state = self.contract.state().call().await?;
        match state {
            0 => Ok(State::Waiting),
            1 => Ok(State::Failed),
            _ => unreachable!(),
        }
    }

    #[tracing::instrument(err, skip(self))]
    async fn committed_root(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.committed_root().call().await?.into())
    }

    #[tracing::instrument(err, skip(self), fields(hex_signature = %format!("0x{}", hex::encode(update.signature.to_vec()))))]
    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.update(
            update.update.previous_root.to_fixed_bytes(),
            update.update.new_root.to_fixed_bytes(),
            update.signature.to_vec(),
        );

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err, skip(self))]
    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.double_update(
            double.0.update.previous_root.to_fixed_bytes(),
            [
                double.0.update.new_root.to_fixed_bytes(),
                double.1.update.new_root.to_fixed_bytes(),
            ],
            double.0.signature.to_vec(),
            double.1.signature.to_vec(),
        );
        let response = report_tx!(tx);

        Ok(response.into())
    }
}

#[async_trait]
impl<M> Home for EthereumHome<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn local_domain(&self) -> u32 {
        self.domain
    }

    #[tracing::instrument(err, skip(self))]
    async fn nonces(&self, destination: u32) -> Result<u32, ChainCommunicationError> {
        Ok(self.contract.nonces(destination).call().await?)
    }

    #[tracing::instrument(err, skip(self))]
    async fn dispatch(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.dispatch(
            message.destination,
            message.recipient.to_fixed_bytes(),
            message.body.clone(),
        );

        Ok(report_tx!(tx).into())
    }

    async fn queue_contains(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        Ok(self.contract.queue_contains(root.into()).call().await?)
    }

    #[tracing::instrument(err, skip(self), fields(hex_signature = %format!("0x{}", hex::encode(update.signature.to_vec()))))]
    async fn improper_update(
        &self,
        update: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.improper_update(
            update.update.previous_root.to_fixed_bytes(),
            update.update.new_root.to_fixed_bytes(),
            update.signature.to_vec(),
        );

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err, skip(self))]
    async fn produce_update(&self) -> Result<Option<Update>, ChainCommunicationError> {
        let (a, b) = self.contract.suggest_update().call().await?;

        let previous_root: H256 = a.into();
        let new_root: H256 = b.into();

        if new_root.is_zero() {
            return Ok(None);
        }

        Ok(Some(Update {
            home_domain: self.local_domain(),
            previous_root,
            new_root,
        }))
    }
}
