//! The relayer forwards signed updates from the home to chain to replicas and
//! confirms pending replica updates.
//!
//! At a regular interval, the relayer polls Home for signed updates and
//! submits them as pending updates for the replica. The relayer also
//! polls the Replica for pending updates that are ready to be confirmed
//! and confirms them when available.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod relayer;
mod settings;

use color_eyre::Result;

use crate::{relayer::Relayer, settings::Settings};
use optics_base::agent::OpticsAgent;

async fn _main(settings: Settings) -> Result<()> {
    let relayer = Relayer::new(5 * 60);
    relayer.run_from_settings(&settings.base).await?;

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
