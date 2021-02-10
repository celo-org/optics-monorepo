//! The watcher observes the home and replicas for double update fraud.
//!
//! At a regular interval, the watcher polls Home and Replicas for signed
//! updates and checks them against its local DB of updates for double update
//! fraud. If fraud is detected, the watcher submits a double update proof to
//! to the corresponding contract.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod watcher;
mod settings;

use color_eyre::{eyre::eyre, Result};

use crate::{watcher::Watcher, settings::Settings};
use optics_base::{agent::OpticsAgent, settings::log::Style};

async fn _main(settings: Settings) -> Result<()> {
    let watcher = Watcher::new(5 * 60);
    watcher.run_from_settings(&settings.base).await?;

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
