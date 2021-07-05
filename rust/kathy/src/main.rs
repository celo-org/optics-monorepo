//! Kathy is chatty. She sends random messages to random recipients

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod kathy;
mod settings;

use color_eyre::Result;

use optics_base::agent::OpticsAgent;

use crate::{kathy::Kathy, settings::KathySettings as Settings};

async fn _main(settings: Settings) -> Result<()> {
    let kathy = Kathy::from_settings(settings).await?;
    kathy.run_all().await?;
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
