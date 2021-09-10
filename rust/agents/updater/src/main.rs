//! The updater signs updates and submits them to the home chain.
//!
//! This updater polls the Home for queued updates at a regular interval.
//! It signs them and submits them back to the home chain.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod settings;
mod updater;

use color_eyre::Result;

use optics_base::agent::OpticsAgent;
use optics_core::traits::Home;

use crate::{settings::UpdaterSettings as Settings, updater::Updater};

#[allow(unused_must_use)]
async fn _main() -> Result<()> {
    color_eyre::install()?;
    let settings = Settings::new()?;
    settings.base.tracing.start_tracing()?;

    let agent = Updater::from_settings(settings).await?;

    let _ = agent.metrics().run_http_server();

    // this is deliberately different from other agents
    let indexer = &agent.as_ref().indexer;
    agent.home().index(indexer.from(), indexer.chunk_size());
    agent.run("").await??;
    Ok(())
}

fn main() -> Result<()> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}
