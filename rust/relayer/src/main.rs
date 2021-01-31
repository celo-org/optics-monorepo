//! The relayer forwards signed updates from the home to chain to replicas and 
//! confirms pending replica updates.
//!
//! This relayer polls the Home for signed updates at a regular interval.
//! It then submits them as pending updates for the replica. This relayer
//! also polls the Replica for pending updates that are ready to be confirmed
//! and confirms them.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod settings;
mod relayer;

use color_eyre::Result;

use crate::{settings::Settings, relayer::Relayer};
use optics_base::agent::OpticsAgent;

async fn _main(settings: Settings) -> Result<()> {
    let home = settings.base.home.try_into_home("home").await?;

    let relayer = Relayer::new(5 * 60);

    // Normally we would run_from_settings
    // but for an empty replica vector that would do nothing
    relayer.run(home.into(), None).await?;

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

