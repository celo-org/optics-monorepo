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

use crate::{settings::UpdaterSettings as Settings, updater::Updater};

async fn _main(settings: Settings) -> Result<()> {
    let updater = Updater::from_settings(settings).await?;

    updater.run("").await??;

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
