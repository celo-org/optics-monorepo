#![allow(clippy::enum_variant_names)]

use async_trait::async_trait;
use color_eyre::Result;
use ethers::contract::abigen;
use ethers::core::types::{Signature, H256};
use optics_core::ContractLocator;
use optics_core::{accumulator::merkle::Proof, db::OpticsDB, *};
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tracing::{info, info_span, instrument};
use tracing::{instrument::Instrumented, Instrument};

use std::cmp::min;
use std::time::Duration;
use std::{convert::TryFrom, error::Error as StdError, sync::Arc};

use crate::report_tx;

static LAST_INSPECTED: &str = "replica_indexer_last_inspected";

#[allow(missing_docs)]
abigen!(
    EthereumReplicaInternal,
    "./chains/optics-ethereum/abis/Replica.abi.json",
     methods {
        initialize(address) as initialize_common;
        initialize(uint32, address, bytes32, uint256, uint32) as initialize;
     },
);

impl<M> std::fmt::Display for EthereumReplicaInternal<M>
where
    M: ethers::providers::Middleware,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
	}
}

struct ReplicaIndexer<M>
where
    M: ethers::providers::Middleware,
{
    replica_name: String,
    contract: Arc<EthereumReplicaInternal<M>>,
    provider: Arc<M>,
    db: OpticsDB,
    from_height: u32,
    chunk_size: u32,
    indexed_height: prometheus::IntGauge,
}

impl<M> ReplicaIndexer<M>
where
    M: ethers::providers::Middleware + 'static,
{
    #[instrument(err, skip(self))]
    async fn sync_updates(&self, from: u32, to: u32) -> Result<()> {
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

        let updates_with_meta = events.iter().map(|event| {
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
        });

        for update_with_meta in updates_with_meta {
            self.db
                .store_latest_update(&self.replica_name, &update_with_meta.signed_update)?;
            self.db.store_update_metadata(
                &self.replica_name,
                update_with_meta.signed_update.update.new_root,
                update_with_meta.metadata,
            )?;

            info!(
                "Stored new update in db. Block number: {}. Previous root: {}. New root: {}.",
                &update_with_meta.metadata.block_number,
                &update_with_meta.signed_update.update.previous_root,
                &update_with_meta.signed_update.update.new_root,
            );
        }

        Ok(())
    }

    fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("HomeIndexer");

        tokio::spawn(async move {
            let mut next_height: u32 = self
                .db
                .retrieve_decodable(&self.replica_name, "", LAST_INSPECTED)
                .expect("db failure")
                .unwrap_or(self.from_height);
            info!(
                next_height = next_height,
                "resuming indexer from {}", next_height
            );

            loop {
                self.indexed_height.set(next_height as i64);
                let tip = self.provider.get_block_number().await?.as_u32();
                let candidate = next_height + self.chunk_size;
                let to = min(tip, candidate);

                info!(
                    next_height = next_height,
                    to = to,
                    "indexing block heights {}...{}",
                    next_height,
                    to
                );

                // TODO(james): these shouldn't have to go in lockstep
                self.sync_updates(next_height, to).await?;

                self.db
                    .store_encodable(&self.replica_name, "", LAST_INSPECTED, &next_height)?;
                next_height = to;
                // sleep here if we've caught up
                if to == tip {
                    sleep(Duration::from_secs(100)).await;
                }
            }
        })
        .instrument(span)
    }
}

/// A struct that provides access to an Ethereum replica contract
#[derive(Debug)]
pub struct EthereumReplica<M>
where
    M: ethers::providers::Middleware,
{
    contract: Arc<EthereumReplicaInternal<M>>,
    db: OpticsDB,
    domain: u32,
    name: String,
    provider: Arc<M>,
}

impl<M> EthereumReplica<M>
where
    M: ethers::providers::Middleware,
{
    /// Create a reference to a Replica at a specific Ethereum address on some
    /// chain
    pub fn new(
        provider: Arc<M>,
        ContractLocator {
            name,
            domain,
            address,
        }: &ContractLocator,
        db: OpticsDB,
    ) -> Self {
        Self {
            contract: Arc::new(EthereumReplicaInternal::new(address, provider.clone())),
            domain: *domain,
            name: name.to_owned(),
            db,
            provider,
        }
    }
}

#[async_trait]
impl<M> Common for EthereumReplica<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn name(&self) -> &str {
        &self.name
    }

    #[tracing::instrument(err)]
    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        let receipt_opt = self
            .contract
            .client()
            .get_transaction_receipt(txid)
            .await
            .map_err(|e| Box::new(e) as Box<dyn StdError + Send + Sync>)?;

        Ok(receipt_opt.map(Into::into))
    }

    #[tracing::instrument(err)]
    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.updater().call().await?.into())
    }

    #[tracing::instrument(err)]
    async fn state(&self) -> Result<State, ChainCommunicationError> {
        let state = self.contract.state().call().await?;
        match state {
            0 => Ok(State::Waiting),
            1 => Ok(State::Failed),
            _ => unreachable!(),
        }
    }

    #[tracing::instrument(err)]
    async fn committed_root(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.committed_root().call().await?.into())
    }

    #[tracing::instrument(err)]
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

    #[tracing::instrument(err)]
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

    #[tracing::instrument(err)]
    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.update(
            update.update.previous_root.to_fixed_bytes(),
            update.update.new_root.to_fixed_bytes(),
            update.signature.to_vec(),
        );

        let result = report_tx!(tx);
        Ok(result.into())
    }

    #[tracing::instrument(err)]
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

        Ok(report_tx!(tx).into())
    }

    /// Start an indexing task that syncs chain state
    fn index(
        &self,
        from_height: u32,
        chunk_size: u32,
        indexed_height: prometheus::IntGauge,
    ) -> Instrumented<JoinHandle<Result<()>>> {
        let indexer = ReplicaIndexer {
            replica_name: self.name.to_owned(),
            contract: self.contract.clone(),
            db: self.db.clone(),
            from_height,
            provider: self.provider.clone(),
            chunk_size,
            indexed_height,
        };
        indexer.spawn()
    }
}

#[async_trait]
impl<M> Replica for EthereumReplica<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn local_domain(&self) -> u32 {
        self.domain
    }

    async fn remote_domain(&self) -> Result<u32, ChainCommunicationError> {
        Ok(self.contract.remote_domain().call().await?)
    }

    #[tracing::instrument(err)]
    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {
        let mut sol_proof: [[u8; 32]; 32] = Default::default();
        sol_proof
            .iter_mut()
            .enumerate()
            .for_each(|(i, elem)| *elem = proof.path[i].to_fixed_bytes());

        let tx = self
            .contract
            .prove(proof.leaf.into(), sol_proof, proof.index.into());

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err)]
    async fn process(&self, message: &OpticsMessage) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.process(message.to_vec());
        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err)]
    async fn prove_and_process(
        &self,
        message: &OpticsMessage,
        proof: &Proof,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let mut sol_proof: [[u8; 32]; 32] = Default::default();
        sol_proof
            .iter_mut()
            .enumerate()
            .for_each(|(i, elem)| *elem = proof.path[i].to_fixed_bytes());

        let tx = self
            .contract
            .prove_and_process(message.to_vec(), sol_proof, proof.index.into());
        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err)]
    async fn message_status(&self, leaf: H256) -> Result<MessageStatus, ChainCommunicationError> {
        let status = self.contract.messages(leaf.into()).call().await?;
        match status {
            0 => Ok(MessageStatus::None),
            1 => Ok(MessageStatus::Proven),
            2 => Ok(MessageStatus::Processed),
            _ => panic!("Bad status from solidity"),
        }
    }

    async fn acceptable_root(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        Ok(self.contract.acceptable_root(root.into()).call().await?)
    }
}
