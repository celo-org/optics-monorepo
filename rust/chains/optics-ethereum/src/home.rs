#![allow(clippy::enum_variant_names)]

use async_trait::async_trait;
use ethers::contract::abigen;
use ethers::core::types::{Address, Signature, H256, U256};
use optics_core::{
    traits::{
        ChainCommunicationError, Common, DoubleUpdate, Home, RawCommittedMessage, State, TxOutcome,
    },
    utils, Message, SignedUpdate, Update,
};

use std::{convert::TryFrom, error::Error as StdError, sync::Arc};

use crate::report_tx;

#[allow(missing_docs)]
abigen!(
    EthereumHomeInternal,
    "./chains/optics-ethereum/abis/Home.abi.json"
);

/// A reference to a Home contract on some Ethereum chain
#[derive(Debug)]
pub struct EthereumHome<M>
where
    M: ethers::providers::Middleware,
{
    contract: EthereumHomeInternal<M>,
    domain: u32,
    name: String,
}

impl<M> EthereumHome<M>
where
    M: ethers::providers::Middleware,
{
    /// Create a reference to a Home at a specific Ethereum address on some
    /// chain
    pub fn new(name: &str, domain: u32, address: Address, provider: Arc<M>) -> Self {
        Self {
            contract: EthereumHomeInternal::new(address, provider),
            domain,
            name: name.to_owned(),
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
    async fn current_root(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.current().call().await?.into())
    }

    #[tracing::instrument(err, skip(self))]
    async fn signed_update_by_old_root(
        &self,
        old_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        self.contract
            .update_filter()
            .from_block(0)
            .topic2(old_root)
            .query()
            .await?
            .first()
            .map(|event| {
                let signature = Signature::try_from(event.signature.as_slice())
                    .expect("chain accepted invalid signature");

                let update = Update {
                    home_domain: event.home_domain,
                    previous_root: event.old_root.into(),
                    new_root: event.new_root.into(),
                };

                SignedUpdate { update, signature }
            })
            .map(Ok)
            .transpose()
    }

    #[tracing::instrument(err, skip(self))]
    async fn signed_update_by_new_root(
        &self,
        new_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        self.contract
            .update_filter()
            .from_block(0)
            .topic3(new_root)
            .query()
            .await?
            .first()
            .map(|event| {
                let signature = Signature::try_from(event.signature.as_slice())
                    .expect("chain accepted invalid signature");

                let update = Update {
                    home_domain: event.home_domain,
                    previous_root: event.old_root.into(),
                    new_root: event.new_root.into(),
                };

                SignedUpdate { update, signature }
            })
            .map(Ok)
            .transpose()
    }

    #[tracing::instrument(err, skip(self), fields(hexSignature = %format!("0x{}", hex::encode(update.signature.to_vec()))))]
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
    async fn raw_message_by_sequence(
        &self,
        destination: u32,
        sequence: u32,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        let dest_and_seq = utils::destination_and_sequence(destination, sequence);

        let events = self
            .contract
            .dispatch_filter()
            .from_block(0)
            .topic2(U256::from(dest_and_seq))
            .query()
            .await?;

        Ok(events.into_iter().next().map(|f| RawCommittedMessage {
            leaf_index: f.leaf_index.as_u32(),
            message: f.message,
        }))
    }

    #[tracing::instrument(err, skip(self))]
    async fn raw_message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        let events = self
            .contract
            .dispatch_filter()
            .from_block(0)
            .topic3(leaf)
            .query()
            .await?;

        Ok(events.into_iter().next().map(|f| RawCommittedMessage {
            leaf_index: f.leaf_index.as_u32(),
            message: f.message,
        }))
    }

    async fn leaf_by_tree_index(
        &self,
        tree_index: usize,
    ) -> Result<Option<H256>, ChainCommunicationError> {
        Ok(self
            .contract
            .dispatch_filter()
            .from_block(0)
            .topic1(U256::from(tree_index))
            .query()
            .await?
            .first()
            .map(|event| event.leaf.into()))
    }

    #[tracing::instrument(err, skip(self))]
    async fn sequences(&self, destination: u32) -> Result<u32, ChainCommunicationError> {
        Ok(self.contract.sequences(destination).call().await?)
    }

    #[tracing::instrument(err, skip(self))]
    async fn enqueue(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.enqueue(
            message.destination,
            message.recipient.to_fixed_bytes(),
            message.body.clone(),
        );

        Ok(report_tx!(tx).into())
    }

    async fn queue_contains(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        Ok(self.contract.queue_contains(root.into()).call().await?)
    }

    #[tracing::instrument(err, skip(self), fields(hexSignature = %format!("0x{}", hex::encode(update.signature.to_vec()))))]
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
