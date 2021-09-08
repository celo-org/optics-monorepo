//! The processor observes replicas for updates and proves + processes them
//!
//! At a regular interval, the processor polls Replicas for updates.
//! If there are updates, the processor submits a proof of their
//! validity and processes on the Replica's chain

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod processor;
mod prover;
mod prover_sync;
mod settings;

use color_eyre::Result;

use crate::{processor::Processor, settings::ProcessorSettings};
use optics_base::agent::OpticsAgent;

async fn _main() -> Result<()> {
    color_eyre::install()?;
    let config = ProcessorSettings::new()?;

    // TODO: top-level root span customizations?
    let agent = Processor::from_settings(config).await?;
    agent
        .as_ref()
        .settings
        .tracing
        .start_tracing(agent.metrics().span_duration())?;

    let _ = agent.metrics().run_http_server();

    agent.run_all().await??;
    Ok(())
}

fn main() -> Result<()> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}
