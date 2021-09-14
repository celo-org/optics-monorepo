use color_eyre::Result;

use optics_base::{agent::OpticsAgent, settings::Settings};

/// An example main function for any agent that implemented Default
async fn _example_main<OA>(settings: Settings) -> Result<()>
where
    OA: OpticsAgent<Settings = Settings> + Sized + 'static,
{
    // Instantiate an agent
    let oa = OA::from_settings(settings).await?;
    // Use the agent to run a number of replicas
    oa.run_all().await?
}

/// Read settings from the config file and set up reporting and logging based
/// on the settings
#[allow(dead_code)]
fn setup() -> Result<Settings> {
    color_eyre::install()?;

    let settings = Settings::new()?;
    settings.tracing.start_tracing()?;

    Ok(settings)
}

#[allow(dead_code)]
fn main() -> Result<()> {
    let _settings = setup()?;
    // tokio::runtime::Builder::new_current_thread()
    //     .enable_all()
    //     .build()
    //     .unwrap()
    //     .block_on(_example_main(settings))?;

    Ok(())
}
