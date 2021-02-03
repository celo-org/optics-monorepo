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

use crate::{settings::Settings, updater::Updater};
use optics_base::agent::OpticsAgent;

async fn _main(settings: Settings) -> Result<()> {
    let signer = settings.updater.try_into_wallet()?;
    let home = settings.base.home.try_into_home("home").await?;

    let updater = Updater::new(signer, settings.polling_interval);

    // Normally we would run_from_settings
    // but for an empty replica vector that would do nothing
    updater.run(home.into(), None).await?;

    Ok(())
}

fn setup() -> Result<Settings> {
    color_eyre::install()?;

    let settings = Settings::new()?;

    // TODO: setup logging based on settings

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
