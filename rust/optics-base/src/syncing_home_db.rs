use crate::home_indexer::HomeIndexers;
use crate::settings::IndexSettings;
use color_eyre::Result;
use optics_core::db::HomeDB;
use optics_core::{
    traits::{HomeIndexer, RawCommittedMessage},
    SignedUpdateWithMeta,
};

use tokio::task::JoinHandle;
use tokio::time::sleep;
use tokio::try_join;
use tracing::{info, info_span, instrument};
use tracing::{instrument::Instrumented, Instrument};

use std::cmp::min;
use std::sync::Arc;
use std::time::Duration;

static LAST_INSPECTED: &str = "home_indexer_last_inspected_";

/// Struct that indexes event data emitted by a home contract
/// and stores it in a HomeDB.
#[derive(Debug, Clone)]
pub struct SyncingHomeDB {
    provider: Arc<HomeIndexers>,
    pub home_db: HomeDB,
    from_height: u32,
    chunk_size: u32,
    indexed_height: prometheus::IntGauge,
}

impl SyncingHomeDB {
    /// Instantiate new SyncingHomeDB
    pub fn new(
        provider: Arc<HomeIndexers>,
        home_db: HomeDB,
        index_settings: IndexSettings,
        block_height: prometheus::IntGauge,
    ) -> Self {
        Self {
            provider,
            home_db,
            from_height: index_settings.from(),
            chunk_size: index_settings.chunk_size(),
            indexed_height: block_height,
        }
    }

    pub fn home_db(&self) -> HomeDB {
        self.home_db.clone()
    }

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
        match self.provider.as_ref() {
            HomeIndexers::Ethereum(provider) => provider.get_updates_with_meta(from, to).await,
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
        match self.provider.as_ref() {
            HomeIndexers::Ethereum(provider) => provider.get_messages(from, to).await,
        }
    }

    /// Spawn HomeDB sync task
    pub fn index(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("HomeIndexer");
        let provider = self.provider.clone();

        tokio::spawn(async move {
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
                let tip: u32 = provider.get_block_number().await?;
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
