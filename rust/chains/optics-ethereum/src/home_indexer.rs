use async_trait::async_trait;
use color_eyre::Result;
use ethers::contract::abigen;
use ethers::core::types::{Address, Signature};
use optics_core::SignedUpdateWithMeta;
use optics_core::{
    traits::{HomeIndexer, RawCommittedMessage},
    SignedUpdate, Update, UpdateMeta,
};

use std::{convert::TryFrom, sync::Arc};

#[allow(missing_docs)]
abigen!(
    EthereumHomeInternal,
    "./chains/optics-ethereum/abis/Home.abi.json"
);

/// Home event-related data provider for Ethereum
#[derive(Debug)]
pub struct EthereumHomeIndexer<M>
where
    M: ethers::providers::Middleware,
{
    contract: Arc<EthereumHomeInternal<M>>,
    provider: Arc<M>,
}

impl<M> EthereumHomeIndexer<M>
where
    M: ethers::providers::Middleware + 'static,
{
    /// Create a new HomeIndexer for a home contract on Ethereum
    pub fn new(address: Address, provider: Arc<M>) -> Self {
        Self {
            contract: Arc::new(EthereumHomeInternal::new(address, provider.clone())),
            provider,
        }
    }
}

#[async_trait]
impl<M> HomeIndexer for EthereumHomeIndexer<M>
where
    M: ethers::providers::Middleware + 'static,
{
    #[tracing::instrument(err, skip(self))]
    async fn get_block_number(&self) -> Result<u32> {
        Ok(self.provider.get_block_number().await?.as_u32())
    }

    async fn get_updates_with_meta(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
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
            .collect::<Vec<SignedUpdateWithMeta>>())
    }

    async fn get_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        let events = self
            .contract
            .dispatch_filter()
            .from_block(from)
            .to_block(to)
            .query()
            .await?;

        Ok(events
            .into_iter()
            .map(|f| RawCommittedMessage {
                leaf_index: f.leaf_index.as_u32(),
                committed_root: f.committed_root.into(),
                message: f.message,
            })
            .collect::<Vec<RawCommittedMessage>>())
    }
}
