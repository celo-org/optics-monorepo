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

use color_eyre::{eyre::eyre, Result};

use crate::{settings::WatcherSettings as Settings, watcher::Watcher};
use optics_base::{agent::OpticsAgent, settings::log::Style};

async fn _main(settings: Settings) -> Result<()> {
    let watcher = Watcher::from_settings(settings).await?;
    watcher.run_all().await?;

    Ok(())
}

fn setup() -> Result<Settings> {
    color_eyre::install()?;

    let settings = Settings::new()?;

    let builder = tracing_subscriber::fmt::fmt().with_max_level(settings.base.tracing.level);

    match settings.base.tracing.style {
        Style::Pretty => builder.pretty().try_init(),
        Style::Json => builder.json().try_init(),
        Style::Compact => builder.compact().try_init(),
        Style::Default => builder.try_init(),
    }
    .map_err(|e| eyre!(e))?;

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
