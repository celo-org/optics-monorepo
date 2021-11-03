use color_eyre::Result;
use optics_core::db::OpticsDB;
use optics_core::{
    CommittedMessage, Indexer, LatestMessage, LatestUpdate, RawCommittedMessage,
    SignedUpdateWithMeta,
};

use futures_util::future::select_all;
use tokio::{task::JoinHandle, time::sleep};
use tracing::{info, info_span};
use tracing::{instrument::Instrumented, Instrument};

use std::cmp::min;
use std::convert::TryInto;
use std::sync::Arc;
use std::time::Duration;

static UPDATES_LAST_INSPECTED: &str = "updates_last_inspected";
static MESSAGES_LAST_INSPECTED: &str = "messages_last_inspected";

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
    last_update: Option<LatestUpdate>,
    last_message: Option<LatestMessage>,
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
            last_update: None,
            last_message: None,
        }
    }

    fn updates_valid(
        _last_update: &Option<LatestUpdate>,
        _sorted_updates: &[SignedUpdateWithMeta],
    ) -> Result<bool> {
        Ok(true)
    }

    fn messages_valid(
        _last_message: &Option<LatestMessage>,
        _sorted_messages: &[RawCommittedMessage],
    ) -> Result<bool> {
        Ok(true)
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
                .retrieve_decodable("", UPDATES_LAST_INSPECTED)
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

                let sorted_updates = indexer.fetch_updates(next_height, to).await?;

                if !sorted_updates.is_empty() {
                    // If update chain missing update(s), restart indexing at
                    // last height of last seen update
                    if !Self::updates_valid(&last_update, &sorted_updates)? {
                        next_height = match &last_update {
                            Some(last) => last.block_range_start,
                            None => from_height,
                        };
                        continue;
                    }

                    Self::store_updates(db.clone(), &sorted_updates)?;

                    last_update = Some(LatestUpdate {
                        update: sorted_updates.last().unwrap().signed_update.update,
                        block_range_start: next_height,
                    });
                    db.store_encodable("", LAST_UPDATE, last_update.as_ref().unwrap())?;
                }

                db.store_encodable("", UPDATES_LAST_INSPECTED, &next_height)?;

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
                .retrieve_decodable("", MESSAGES_LAST_INSPECTED)
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

                let sorted_messages = indexer.fetch_messages(next_height, to).await?;

                if !sorted_messages.is_empty() {
                    // If message chain missing message(s), restart indexing at
                    // last height of last seen message
                    if !Self::messages_valid(&last_message, &sorted_messages)? {
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

                db.store_encodable("", MESSAGES_LAST_INSPECTED, &next_height)?;

                next_height = to;
                // sleep here if we've caught up
                if to == tip {
                    sleep(Duration::from_secs(100)).await;
                }
            }
        })
        .in_current_span()
    }

    /// Spawn task that continuously indexes the contract's chain and stores
    /// messages and updates in the agent's db
    pub fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("ContractSync");

        tokio::spawn(async move {
            let sync_tasks = vec![self.index_updates(), self.index_messages()];

            let (_, _, remaining) = select_all(sync_tasks).await;
            for task in remaining.into_iter() {
                cancel_task!(task);
            }

            Ok(())
        })
        .instrument(span)
    }
}
