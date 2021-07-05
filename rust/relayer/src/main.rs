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

use optics_base::agent::OpticsAgent;

use crate::{relayer::Relayer, settings::RelayerSettings as Settings};

async fn _main(settings: Settings) -> Result<()> {
    let relayer = Relayer::from_settings(settings).await?;
    relayer.run_all().await?;

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
