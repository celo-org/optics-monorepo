//! Kathy is chatty. She sends random messages to random recipients

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod kathy;
mod settings;

use color_eyre::{eyre::eyre, Result};

use optics_base::{agent::OpticsAgent, settings::log::Style};

use crate::{kathy::Kathy, settings::Settings};

async fn _main(settings: Settings) -> Result<()> {
    let kathy = Kathy::from_settings(settings).await?;

    // Normally we would run_from_settings
    // but for an empty replica vector that would do nothing
    kathy.run("").await?;

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
