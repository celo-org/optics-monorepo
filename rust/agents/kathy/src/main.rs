//! Kathy is chatty. She sends random messages to random recipients

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod kathy;
mod settings;

use color_eyre::Result;

use optics_base::agent::OpticsAgent;

use crate::{kathy::Kathy, settings::KathySettings as Settings};

async fn _main() -> Result<()> {
    color_eyre::install()?;
    let settings = Settings::new()?;
    // there needs to be an HTTP server here??? for health agent endpoint stuff.
    settings.base.tracing.start_tracing()?;

    let agent = Kathy::from_settings(settings).await?;
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
