use ethers::core::types::H256;
use prometheus::IntCounterVec;
use std::{sync::Arc, time::Duration};

use color_eyre::Result;
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
        // If db latest root is empty, this will produce `H256::default()`
        // which is equal to `H256::zero()`
        Ok(self.db.retrieve_latest_root()?.unwrap_or_default())
    }

    pub(crate) fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("UpdateProduction");
        tokio::spawn(async move {
            loop {
                // We sleep at the top to make continues work fine
                sleep(Duration::from_secs(self.interval_seconds)).await;

                let current_root = self.find_latest_root()?;

                if let Some(suggested) = self.home.produce_update().await? {
                    if suggested.previous_root != current_root {
                        // This either indicates that the indexer is catching
                        // up or that the chain is awaiting a new update. We 
                        // should ignore it.
                        debug!(
                            local = ?suggested.previous_root,
                            remote = ?current_root,
                            "Local root not equal to chain root. Skipping update."
                        );
                        continue;
                    }

                    // Ensure we have not already signed a conflicting update.
                    // Ignore suggested if we have.
                    let existing_opt = self.db.retrieve_produced_update(suggested.previous_root)?;
                    if let Some(existing) = existing_opt {
                        if existing.update.new_root != suggested.new_root {
                            info!("Updater ignoring conflicting suggested update. Indicates chain awaiting already submitted update. Existing update: {:?}. Suggested conflicting update: {:?}.", &existing, &suggested);

                            continue;
                        }
                    }

                    // Guard from any state changes happening during the pause. 
                    // current_root (which we build update off of) considered
                    // final after `update_pause` seconds.
                    sleep(Duration::from_secs(self.update_pause)).await;
                    if self.find_latest_root()? != current_root {
                        continue;
                    }

                    // If the suggested matches our local view, sign an update
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
