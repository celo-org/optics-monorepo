use std::sync::Arc;

use optics_base::{CachingHome, OpticsAgent};
use optics_core::{db::OpticsDB, Common};
use prometheus::IntCounterVec;
use std::time::Duration;

use color_eyre::Result;
use tokio::{task::JoinHandle, time::sleep};
use tracing::{info, info_span, instrument::Instrumented, Instrument};

use crate::updater::Updater;

pub(crate) struct UpdateSubmitter {
    home: Arc<CachingHome>,
    db: OpticsDB,
    interval_seconds: u64,
    submitted_update_count: IntCounterVec,
}

impl UpdateSubmitter {
    pub(crate) fn new(
        home: Arc<CachingHome>,
        db: OpticsDB,
        interval_seconds: u64,
        submitted_update_count: IntCounterVec,
    ) -> Self {
        Self {
            home,
            db,
            interval_seconds,
            submitted_update_count,
        }
    }

    pub(crate) fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("UpdateSubmitter");

        tokio::spawn(async move {
            // start from the chain state
            let mut committed_root = self.home.committed_root().await?;

            loop {
                sleep(Duration::from_secs(self.interval_seconds)).await;

                // if we have produced an update building off the committed root
                // submit it
                if let Some(signed) = self.db.retrieve_produced_update(committed_root)? {
                    let hex_signature = format!("0x{}", hex::encode(signed.signature.to_vec()));
                    info!(
                        previous_root = ?signed.update.previous_root,
                        new_root = ?signed.update.new_root,
                        hex_signature = %hex_signature,
                        "Submitting update to chain"
                    );

                    self.home.update(&signed).await?;

                    self.submitted_update_count
                        .with_label_values(&[self.home.name(), Updater::AGENT_NAME])
                        .inc();

                    // continue from local state
                    committed_root = signed.update.new_root;
                }
            }
        })
        .instrument(span)
    }
}
