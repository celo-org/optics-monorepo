use color_eyre::Result;
use optics_core::db::OpticsDB;
use optics_core::{
    CommittedMessage, CommonIndexer, HomeIndexer, LatestMessage, LatestUpdate, RawCommittedMessage,
    SignedUpdateWithMeta,
};

use tokio::time::sleep;
use tracing::{info, info_span};
use tracing::{instrument::Instrumented, Instrument};

use std::cmp::min;
use std::convert::TryInto;
use std::sync::Arc;
use std::time::Duration;

static UPDATES_LAST_BLOCK_START: &str = "updates_last_block";
static MESSAGES_LAST_BLOCK_START: &str = "messages_last_block";

static LAST_UPDATE: &str = "last_update";
static LAST_MESSAGE: &str = "last_message";

/// Entity that drives the syncing of an agent's db with on-chain data.
/// Extracts chain-specific data (emitted updates, messages, etc) from an
/// `indexer` and fills the agent's db with this data. A CachingHome or
/// CachingReplica will use a contract sync to spawn syncing tasks to keep the
/// db up-to-date.
#[derive(Debug)]
pub struct ContractSync<I> {
    db: OpticsDB,
    contract_name: String,
    indexer: Arc<I>,
    from_height: u32,
    chunk_size: u32,
    indexed_height: prometheus::IntGauge,
}

impl<I> ContractSync<I>
where
    I: CommonIndexer + 'static,
{
    /// Instantiate new ContractSync
    pub fn new(
        db: OpticsDB,
        contract_name: String,
        indexer: Arc<I>,
        from_height: u32,
        chunk_size: u32,
        indexed_height: prometheus::IntGauge,
    ) -> Self {
        Self {
            db,
            contract_name,
            indexer,
            from_height,
            chunk_size,
            indexed_height,
        }
    }

    fn updates_valid(
        last_update: &Option<LatestUpdate>,
        sorted_updates: &[SignedUpdateWithMeta],
    ) -> bool {
        if sorted_updates.is_empty() {
            return true;
        }

        // If we have seen another update in a previous block range, ensure
        // first update in new batch builds off last seen update
        if let Some(last_seen) = last_update {
            let first_update = sorted_updates.first().unwrap();
            if last_seen.new_root != first_update.signed_update.update.previous_root {
                return false;
            }
        }

        // Ensure no gaps in new batch of leaves
        for pair in sorted_updates.windows(2) {
            if pair[0].signed_update.update.new_root != pair[1].signed_update.update.previous_root {
                return false;
            }
        }

        true
    }

    fn store_updates(db: OpticsDB, sorted_updates: &[SignedUpdateWithMeta]) -> Result<()> {
        for update_with_meta in sorted_updates {
            db.store_latest_update(&update_with_meta.signed_update)?;
            db.store_update_metadata(
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

    /// Spawn task that continuously looks for new on-chain updates and stores
    /// them in db
    pub fn sync_updates(&self) -> Instrumented<tokio::task::JoinHandle<color_eyre::Result<()>>> {
        let span = info_span!("UpdateContractSync");

        let db = self.db.clone();
        let indexer = self.indexer.clone();
        let indexed_height = self.indexed_height.clone();

        let from_height = self.from_height;
        let chunk_size = self.chunk_size;

        tokio::spawn(async move {
            let mut next_height: u32 = db
                .retrieve_decodable("", UPDATES_LAST_BLOCK_START)
                .expect("db failure")
                .unwrap_or(from_height);

            let mut last_update: Option<LatestUpdate> =
                db.retrieve_decodable("", LAST_UPDATE).expect("db failure");

            info!(
                next_height = next_height,
                "resuming update indexer from {}", next_height
            );

            loop {
                indexed_height.set(next_height as i64);
                let tip = indexer.get_block_number().await?;
                let candidate = next_height + chunk_size;
                let to = min(tip, candidate);

                info!(
                    next_height = next_height,
                    to = to,
                    "indexing block heights {}...{}",
                    next_height,
                    to
                );

                let sorted_updates = indexer.fetch_sorted_updates(next_height, to).await?;

                if !sorted_updates.is_empty() {
                    // If message chain missing updates(s), restart indexing at
                    // height of last seen updates. If we have not seen any
                    // previous updates, start at original from_height
                    if !Self::updates_valid(&last_update, &sorted_updates) {
                        next_height = match &last_update {
                            Some(last) => last.block_range_start,
                            None => from_height,
                        };
                        continue;
                    }

                    Self::store_updates(db.clone(), &sorted_updates)?;

                    last_update = Some(LatestUpdate {
                        new_root: sorted_updates.last().unwrap().signed_update.update.new_root,
                        block_range_start: next_height,
                    });
                    db.store_encodable("", LAST_UPDATE, last_update.as_ref().unwrap())?;
                }

                db.store_encodable("", UPDATES_LAST_BLOCK_START, &next_height)?;

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

impl<I> ContractSync<I>
where
    I: HomeIndexer + 'static,
{
    fn messages_valid(
        last_message: &Option<LatestMessage>,
        sorted_messages: &[RawCommittedMessage],
    ) -> bool {
        if sorted_messages.is_empty() {
            return true;
        }

        // If we have seen another leaf in a previous block range, ensure
        // first leaf in new batch is the consecutive next leaf
        if let Some(last_seen) = last_message {
            let first_message = sorted_messages.first().unwrap();
            if last_seen.leaf_index != first_message.leaf_index - 1 {
                return false;
            }
        }

        // Ensure no gaps in new batch of leaves
        for pair in sorted_messages.windows(2) {
            if pair[0].leaf_index != pair[1].leaf_index - 1 {
                return false;
            }
        }

        true
    }

    fn store_messages(db: OpticsDB, messages: &[RawCommittedMessage]) -> Result<()> {
        for message in messages {
            db.store_raw_committed_message(message)?;

            let committed_message: CommittedMessage = message.clone().try_into()?;
            info!(
                "Stored new message in db. Leaf index: {}. Origin: {}. Destination: {}. Nonce: {}.",
                &committed_message.leaf_index,
                &committed_message.message.origin,
                &committed_message.message.destination,
                &committed_message.message.nonce
            );
        }

        Ok(())
    }

    /// Spawn task that continuously looks for new on-chain messages and stores
    /// them in db
    pub fn sync_messages(&self) -> Instrumented<tokio::task::JoinHandle<color_eyre::Result<()>>> {
        let span = info_span!("MessageContractSync");

        let db = self.db.clone();
        let indexer = self.indexer.clone();
        let indexed_height = self.indexed_height.clone();

        let from_height = self.from_height;
        let chunk_size = self.chunk_size;

        tokio::spawn(async move {
            let mut next_height: u32 = db
                .retrieve_decodable("", MESSAGES_LAST_BLOCK_START)
                .expect("db failure")
                .unwrap_or(from_height);

            let mut last_message: Option<LatestMessage> =
                db.retrieve_decodable("", LAST_MESSAGE).expect("db failure");

            info!(
                next_height = next_height,
                "resuming message indexer from {}", next_height
            );

            loop {
                indexed_height.set(next_height as i64);
                let tip = indexer.get_block_number().await?;
                let candidate = next_height + chunk_size;
                let to = min(tip, candidate);

                info!(
                    next_height = next_height,
                    to = to,
                    "indexing block heights {}...{}",
                    next_height,
                    to
                );

                let sorted_messages = indexer.fetch_sorted_messages(next_height, to).await?;

                if !sorted_messages.is_empty() {
                    // If message chain missing message(s), restart indexing at
                    // height of last seen message. If we have not seen any
                    // previous messages, start at original from_height
                    if !Self::messages_valid(&last_message, &sorted_messages) {
                        next_height = match &last_message {
                            Some(last) => last.block_range_start,
                            None => from_height,
                        };
                        continue;
                    }

                    Self::store_messages(db.clone(), &sorted_messages)?;

                    last_message = Some(LatestMessage {
                        leaf_index: sorted_messages.last().unwrap().leaf_index,
                        block_range_start: next_height,
                    });
                    db.store_encodable("", LAST_MESSAGE, last_message.as_ref().unwrap())?;
                }

                db.store_encodable("", MESSAGES_LAST_BLOCK_START, &next_height)?;

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
