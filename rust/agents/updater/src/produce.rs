use ethers::core::types::H256;
use prometheus::IntCounterVec;
use std::{sync::Arc, time::Duration};

use color_eyre::Result;
use hex;
use optics_base::{Homes, OpticsAgent};
use optics_core::{db::OpticsDB, Common, Home, Signers};
use tokio::{task::JoinHandle, time::sleep};
use tracing::{debug, info, info_span, instrument::Instrumented, Instrument};

use crate::updater::Updater;

#[derive(Debug)]
pub(crate) struct UpdateProducer {
    home: Arc<Homes>,
    db: OpticsDB,
    signer: Arc<Signers>,
    interval_seconds: u64,
    update_pause: u64,
    signed_attestation_count: IntCounterVec,
}

impl UpdateProducer {
    pub(crate) fn new(
        home: Arc<Homes>,
        db: OpticsDB,
        signer: Arc<Signers>,
        interval_seconds: u64,
        update_pause: u64,
        signed_attestation_count: IntCounterVec,
    ) -> Self {
        Self {
            home,
            db,
            signer,
            interval_seconds,
            update_pause,
            signed_attestation_count,
        }
    }

    fn find_latest_root(&self) -> Result<H256> {
        // if db latest root is empty, this will produce `H256::default()`
        // which is equal to `H256::zero()`
        let latest_root = self.db.retrieve_latest_root()?.unwrap_or_default();

        if latest_root == H256::zero() {
            return Ok(latest_root);
        }

        let update = self
            .db
            .update_by_new_root(latest_root)?
            .expect("!db in inconsistent state");

        Ok(update.update.new_root)
    }

    pub(crate) fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("UpdateProduction");
        tokio::spawn(async move {
            loop {
                // we sleep at the top to make continues work fine
                sleep(Duration::from_secs(self.interval_seconds)).await;

                let current_root = self.find_latest_root()?;

                if let Some(suggested) = self.home.produce_update().await? {
                    if suggested.previous_root != current_root {
                        // this either indicates that the indexer is catching
                        // up or that we're awaiting a new update. We should
                        // ignore it
                        debug!(
                            local = ?suggested.previous_root,
                            remote = ?current_root,
                            "Local root not equal to chain root. Skipping update"
                        );
                        continue;
                    }

                    sleep(Duration::from_secs(self.update_pause)).await;

                    // guard from any state changes happening during the pause
                    if self.find_latest_root()? != current_root {
                        continue;
                    }

                    // if the suggested matches our local view, sign an update
                    // and store it as locally produced
                    let signed = suggested.sign_with(self.signer.as_ref()).await?;

                    self.signed_attestation_count
                        .with_label_values(&[self.home.name(), Updater::AGENT_NAME])
                        .inc();

                    let hex_signature = format!("0x{}", hex::encode(signed.signature.to_vec()));
                    info!(
                        previous_root = ?signed.update.previous_root,
                        new_root = ?signed.update.new_root,
                        hex_signature = %hex_signature,
                        "Storing new update in DB for broadcast"
                    );

                    self.db.store_produced_update(&signed)?;
                }
            }
        })
        .instrument(span)
    }
}
