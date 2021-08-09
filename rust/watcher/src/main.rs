//! The watcher observes the home and replicas for double update fraud.
//!
//! At a regular interval, the watcher polls Home and Replicas for signed
//! updates and checks them against its local DB of updates for fraud. It
//! checks for double updates on both the Home and Replicas and fraudulent
//! updates on just the Replicas by verifying Replica updates on the Home.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod settings;
mod watcher;

use color_eyre::Result;

use optics_base::agent::OpticsAgent;

use crate::{settings::WatcherSettings as Settings, watcher::Watcher};

async fn _main() -> Result<()> {
    color_eyre::install()?;
    let settings = Settings::new()?;
    settings.base.tracing.start_tracing()?;

    let agent = Watcher::from_settings(settings).await?;
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
