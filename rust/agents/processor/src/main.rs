//! The processor observes replicas for confirmed updates and proves + processes them
//!
//! At a regular interval, the processor polls Replicas for confirmed updates.
//! If there are confirmed updates, the processor submits a proof of their
//! validity and processes on the Replica's chain

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod prover_sync;
mod processor;
mod prover;
mod prover_sync;
mod settings;

use color_eyre::Result;

use crate::{processor::Processor, settings::ProcessorSettings as Settings};
use optics_base::agent::OpticsAgent;

async fn _main() -> Result<()> {
    color_eyre::install()?;
    let settings = Settings::new()?;
    settings.base.tracing.start_tracing()?;

    let agent = Processor::from_settings(settings).await?;
    agent.run_all().await?;
    Ok(())
}

fn main() -> Result<()> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}
