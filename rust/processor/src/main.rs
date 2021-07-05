//! The processor observes replicas for confirmed updates and proves + processes them
//!
//! At a regular interval, the processor polls Replicas for confirmed updates.
//! If there are confirmed updates, the processor submits a proof of their
//! validity and processes on the Replica's chain

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod processor;
mod prover;
mod settings;

use color_eyre::Result;

use crate::{processor::Processor, settings::ProcessorSettings as Settings};
use optics_base::agent::OpticsAgent;

async fn _main(settings: Settings) -> Result<()> {
    let processor = Processor::from_settings(settings).await?;
    processor.run_all().await?;

    Ok(())
}

fn setup() -> Result<Settings> {
    color_eyre::install()?;
    let settings = Settings::new()?;
    settings.base.tracing.try_init_tracing()?;
    Ok(settings)
}

fn main() -> Result<()> {
    let settings = setup()?;

    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main(settings))
}
