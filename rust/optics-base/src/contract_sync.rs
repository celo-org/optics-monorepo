use optics_core::db::OpticsDB;
use optics_core::{CommittedMessage, Indexer};

use tokio::time::sleep;
use tracing::{info, info_span};
use tracing::{instrument::Instrumented, Instrument};

use std::cmp::min;
use std::convert::TryInto;
use std::sync::Arc;
use std::time::Duration;

static LAST_INSPECTED: &str = "last_inspected";

/// Struct responsible for continuously indexing the chain for a contract's
/// event data and storing it in the agent's db
#[derive(Debug)]
pub struct ContractSync<I> {
    db: OpticsDB,
    indexer: Arc<I>,
    from_height: u32,
    chunk_size: u32,
    indexed_height: prometheus::IntGauge,
}

impl<I> ContractSync<I>
where
    I: Indexer + 'static,
{
    /// Instantiate new ContractSync
    pub fn new(
        db: OpticsDB,
        indexer: Arc<I>,
        from_height: u32,
        chunk_size: u32,
        indexed_height: prometheus::IntGauge,
    ) -> Self {
        Self {
            db,
            indexer,
            from_height,
            chunk_size,
            indexed_height,
        }
    }

    /// Spawn task that continuously indexes the contract's chain and stores
    /// messages and updates in the agent's db
    pub fn spawn(self) -> Instrumented<tokio::task::JoinHandle<color_eyre::Result<()>>> {
        let span = info_span!("ContractSync");

        tokio::spawn(async move {
            let mut next_height: u32 = self
                .db
                .retrieve_decodable(self.indexer.contract_name(), "", LAST_INSPECTED)
                .expect("db failure")
                .unwrap_or(self.from_height);
            info!(
                next_height = next_height,
                "resuming indexer from {}", next_height
            );

            loop {
                self.indexed_height.set(next_height as i64);
                let tip = self.indexer.get_block_number().await?;
                let candidate = next_height + self.chunk_size;
                let to = min(tip, candidate);

                info!(
                    next_height = next_height,
                    to = to,
                    "indexing block heights {}...{}",
                    next_height,
                    to
                );

                let sorted_updates = self.indexer.fetch_updates(next_height, to).await?;
                let messages = self.indexer.fetch_messages(next_height, to).await?;

                for update_with_meta in sorted_updates {
                    self.db
                        .store_latest_update(self.indexer.contract_name(), &update_with_meta.signed_update)?;
                    self.db.store_update_metadata(
                        self.indexer.contract_name(),
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

                for message in messages {
                    self.db.store_raw_committed_message(self.indexer.contract_name(), &message)?;

                    let committed_message: CommittedMessage = message.try_into()?;
                    info!(
                        "Stored new message in db. Leaf index: {}. Origin: {}. Destination: {}. Nonce: {}.",
                        &committed_message.leaf_index,
                        &committed_message.message.origin,
                        &committed_message.message.destination,
                        &committed_message.message.nonce
                    );
                }

                self.db
                    .store_encodable(self.indexer.contract_name(), "", LAST_INSPECTED, &next_height)?;
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
