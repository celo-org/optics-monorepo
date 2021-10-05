use color_eyre::Result;
use ethers::contract::abigen;
use ethers::core::types::Signature;
use optics_core::db::HomeDB;
use optics_core::{traits::{HomeEventProvider, RawCommittedMessage}, SignedUpdateWithMeta, SignedUpdate, Update, UpdateMeta};

use tokio::task::JoinHandle;
use tokio::time::sleep;
use tokio::try_join;
use tracing::{info, info_span, instrument};
use tracing::{instrument::Instrumented, Instrument};

use std::cmp::min;
use std::time::Duration;
use std::{convert::TryFrom, sync::Arc};

static LAST_INSPECTED: &str = "home_indexer_last_inspected_";

#[allow(missing_docs)]
abigen!(
    EthereumHomeInternal,
    "./chains/optics-ethereum/abis/Home.abi.json"
);

/// Provider variants
pub enum Providers<E>
where
    E: ethers::providers::Middleware,
{
    /// Ethereum provider
    Ethereum(E),
}

/// HomeInternal variants
pub enum HomeInternals<E>
where
    E: ethers::providers::Middleware,
{
    /// Ethereum HomeInternal
    Ethereum(EthereumHomeInternal<E>),
}

/// Struct that indexes event data emitted by a home contract
/// and stores it in a HomeDB.
pub struct HomeIndexer<E>
where
    E: ethers::providers::Middleware,
{
    contract: Arc<HomeInternals<E>>,
    provider: Arc<Providers<E>>,
    home_db: HomeDB,
    from_height: u32,
    chunk_size: u32,
    indexed_height: prometheus::IntGauge,
}

impl<E> HomeIndexer<E>
where
    E: ethers::providers::Middleware + 'static,
{
    #[instrument(err, skip(self))]
    async fn sync_updates(&self, from: u32, to: u32) -> Result<()> {
        let updates_with_meta = self.get_updates_with_meta(from, to).await?;

        for update_with_meta in updates_with_meta {
            self.home_db
                .store_latest_update(&update_with_meta.signed_update)?;
            self.home_db.store_update_metadata(
                update_with_meta.signed_update.update.new_root,
                update_with_meta.metadata,
            )?;
        }

        Ok(())
    }

    /// Retrieve new signed updates based on a particular chain API
    async fn get_updates_with_meta(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        match self.contract.as_ref() {
            HomeInternals::Ethereum(contract) => {
                let mut events = contract
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

                Ok(events.iter().map(|event| {
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
                }).collect::<Vec<SignedUpdateWithMeta>>())
            },
        }
    }

    #[instrument(err, skip(self))]
    async fn sync_leaves(&self, from: u32, to: u32) -> Result<()> {
        let messages = self.get_messages(from, to).await?;

        for message in messages {
            self.home_db.store_raw_committed_message(&message)?;
        }

        Ok(())
    }
    
    /// Retrieve new messages based on a particular chain API
    async fn get_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        match self.contract.as_ref() {
            HomeInternals::Ethereum(contract) => {
                let events = contract
                    .dispatch_filter()
                    .from_block(from)
                    .to_block(to)
                    .query()
                    .await?;

                Ok(events.into_iter().map(|f| RawCommittedMessage {
                    leaf_index: f.leaf_index.as_u32(),
                    committed_root: f.committed_root.into(),
                    message: f.message,
                }).collect::<Vec<RawCommittedMessage>>())
            },
        }
    }

    fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("HomeIndexer");

        tokio::spawn(async move {
            let provider = match self.provider.as_ref() {
                Providers::Ethereum(provider) => provider,
            };

            let mut next_height: u32 = self
                .home_db
                .retrieve_decodable("", LAST_INSPECTED)
                .expect("db failure")
                .unwrap_or(self.from_height);
            info!(
                next_height = next_height,
                "resuming indexer from {}", next_height
            );

            loop {
                self.indexed_height.set(next_height as i64);
                let tip = provider.get_block_number().await?.as_u32();
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
                try_join!(
                    self.sync_updates(next_height, to),
                    self.sync_leaves(next_height, to)
                )?;

                self.home_db
                    .store_encodable("", LAST_INSPECTED, &next_height)?;
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
