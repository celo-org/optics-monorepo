//! The updater

mod settings;
mod updater;

use color_eyre::Result;

use crate::{settings::Settings, updater::Updater};
use optics_base::agent::OpticsAgent;

async fn _main(settings: Settings) -> Result<()> {
    let signer = settings.updater.try_into_wallet()?;
    let home = settings.base.home.try_into_home("home").await?;

    let updater = Updater::new(signer, 5 * 60);

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
