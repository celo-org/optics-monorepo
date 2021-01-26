use async_trait::async_trait;
use ethers::core::types::{Address, H256, U256};
use std::sync::Arc;

use optics_core::{
    traits::{ChainCommunicationError, Common, Home, Replica, State, TxOutcome},
    Encode, Message, SignedUpdate, Update,
};

#[allow(missing_docs)]
mod contracts {
    use ethers::contract::abigen;
    abigen!(
        ReplicaContractInternal,
        "optics-base/src/abis/ProcessingReplica.abi.json"
    );

    abigen!(HomeContractInternal, "optics-base/src/abis/Home.abi.json");
}

/// A struct that provides access to an Ethereum replica contract
#[derive(Debug)]
pub struct ReplicaContract<M>
where
    M: ethers::providers::Middleware,
{
    contract: contracts::ReplicaContractInternal<M>,
    slip44: u32,
    name: String,
}

impl<M> ReplicaContract<M>
where
    M: ethers::providers::Middleware,
{
    /// Create a reference to a Replica at a specific Ethereum address on some
    /// chain
    pub fn new(name: &str, slip44: u32, address: Address, provider: Arc<M>) -> Self {
        Self {
            contract: contracts::ReplicaContractInternal::new(address, provider),
            slip44,
            name: name.to_owned(),
        }
    }
}

#[async_trait]
impl<M> Common for ReplicaContract<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn name(&self) -> &str {
        &self.name
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        let receipt_opt = self
            .contract
            .client()
            .get_transaction_receipt(txid)
            .await
            .map_err(Box::new)?;

        Ok(receipt_opt.map(Into::into))
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.updater().call().await?.into())
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        let state = self.contract.state().call().await?;
        match state {
            0 => Ok(State::Waiting),
            1 => Ok(State::Failed),
            _ => unreachable!(),
        }
    }

    async fn current_root(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.current().call().await?.into())
    }

    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        Ok(self
            .contract
            .update(
                update.update.previous_root.to_fixed_bytes(),
                update.update.new_root.to_fixed_bytes(),
                update.signature.to_vec(),
            )
            .send()
            .await?
            .await?
            .into())
    }

    async fn double_update(
        &self,
        left: &SignedUpdate,
        right: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        Ok(self
            .contract
            .double_update(
                [
                    left.update.previous_root.to_fixed_bytes(),
                    right.update.previous_root.to_fixed_bytes(),
                ],
                [
                    left.update.new_root.to_fixed_bytes(),
                    right.update.new_root.to_fixed_bytes(),
                ],
                left.signature.to_vec(),
                right.signature.to_vec(),
            )
            .send()
            .await?
            .await?
            .into())
    }
}

#[async_trait]
impl<M> Replica for ReplicaContract<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn destination_slip44(&self) -> u32 {
        self.slip44
    }

    async fn next_pending(&self) -> Result<Option<(H256, U256)>, ChainCommunicationError> {
        let (pending, confirm_at) = self.contract.next_pending().call().await?;

        if confirm_at.is_zero() {
            Ok(None)
        } else {
            Ok(Some((pending.into(), confirm_at)))
        }
    }

    async fn confirm(&self) -> Result<TxOutcome, ChainCommunicationError> {
        Ok(self.contract.confirm().send().await?.await?.into())
    }

    async fn previous_root(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.previous().call().await?.into())
    }

    async fn prove(
        &self,
        leaf: H256,
        index: u32,
        proof: [H256; 32],
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let mut sol_proof: [[u8; 32]; 32] = Default::default();
        sol_proof
            .iter_mut()
            .enumerate()
            .for_each(|(i, elem)| *elem = proof[i].to_fixed_bytes());

        Ok(self
            .contract
            .prove(leaf.into(), sol_proof, index.into())
            .send()
            .await?
            .await?
            .into())
    }

    async fn process(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {
        Ok(self
            .contract
            .process(message.to_vec())
            .send()
            .await?
            .await?
            .into())
    }
}

/// A reference to a Home contract on some Ethereum chain
#[derive(Debug)]
pub struct HomeContract<M>
where
    M: ethers::providers::Middleware,
{
    contract: contracts::HomeContractInternal<M>,
    slip44: u32,
    name: String,
}

impl<M> HomeContract<M>
where
    M: ethers::providers::Middleware,
{
    /// Create a reference to a Home at a specific Ethereum address on some
    /// chain
    pub fn new(name: &str, slip44: u32, address: Address, provider: Arc<M>) -> Self {
        Self {
            contract: contracts::HomeContractInternal::new(address, provider),
            slip44,
            name: name.to_owned(),
        }
    }
}

#[async_trait]
impl<M> Common for HomeContract<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn name(&self) -> &str {
        &self.name
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        let receipt_opt = self
            .contract
            .client()
            .get_transaction_receipt(txid)
            .await
            .map_err(Box::new)?;

        Ok(receipt_opt.map(Into::into))
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.updater().call().await?.into())
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        let state = self.contract.state().call().await?;
        match state {
            0 => Ok(State::Waiting),
            1 => Ok(State::Failed),
            _ => unreachable!(),
        }
    }

    async fn current_root(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.current().call().await?.into())
    }

    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        Ok(self
            .contract
            .update(
                update.update.previous_root.to_fixed_bytes(),
                update.update.new_root.to_fixed_bytes(),
                update.signature.to_vec(),
            )
            .send()
            .await?
            .await?
            .into())
    }

    async fn double_update(
        &self,
        left: &SignedUpdate,
        right: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        Ok(self
            .contract
            .double_update(
                [
                    left.update.previous_root.to_fixed_bytes(),
                    right.update.previous_root.to_fixed_bytes(),
                ],
                [
                    left.update.new_root.to_fixed_bytes(),
                    right.update.new_root.to_fixed_bytes(),
                ],
                left.signature.to_vec(),
                right.signature.to_vec(),
            )
            .send()
            .await?
            .await?
            .into())
    }
}

#[async_trait]
impl<M> Home for HomeContract<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn origin_slip44(&self) -> u32 {
        self.slip44
    }

    async fn raw_message_by_sequence(
        &self,
        destination: u32,
        sequence: u32,
    ) -> Result<Option<Vec<u8>>, ChainCommunicationError> {
        let filters = self
            .contract
            .dispatch_filter()
            .topic1(U256::from(destination))
            .topic2(U256::from(sequence))
            .query()
            .await?;

        Ok(filters.into_iter().next().map(|f| f.message))
    }

    async fn raw_message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<Vec<u8>>, ChainCommunicationError> {
        let filters = self.contract.dispatch_filter().topic3(leaf).query().await?;

        Ok(filters.into_iter().next().map(|f| f.message))
    }

    async fn sequences(&self, destination: u32) -> Result<u32, ChainCommunicationError> {
        Ok(self.contract.sequences(destination).call().await?)
    }

    async fn enqueue(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {
        Ok(self
            .contract
            .enqueue(
                message.destination,
                message.recipient.to_fixed_bytes(),
                message.body.clone(),
            )
            .send()
            .await?
            .await?
            .into())
    }

    async fn improper_update(
        &self,
        update: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        Ok(self
            .contract
            .improper_update(
                update.update.previous_root.to_fixed_bytes(),
                update.update.new_root.to_fixed_bytes(),
                update.signature.to_vec(),
            )
            .send()
            .await?
            .await?
            .into())
    }

    async fn produce_update(&self) -> Result<Update, ChainCommunicationError> {
        let (a, b) = self.contract.suggest_update().call().await?;
        Ok(Update {
            origin_chain: self.origin_slip44(),
            previous_root: a.into(),
            new_root: b.into(),
        })
    }
}
