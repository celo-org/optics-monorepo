//! The processor observes replicas for confirmed updates and proves + processes them
//!
//! At a regular interval, the processor polls Replicas for confirmed updates.
//! If there are confirmed updates, the processor submits a proof of their
//! validity and processes on the Replica's chain

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod processor;
mod settings;

use color_eyre::{eyre::eyre, Result};

use crate::{processor::Processor, settings::Settings};
use optics_base::{agent::OpticsAgent, settings::log::Style};

async fn _main(settings: Settings) -> Result<()> {
    let processor = Processor::from_settings(settings).await?;
    processor.run_all().await?;

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
