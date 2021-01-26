use color_eyre::Result;

use optics_base::{
    agent::OpticsAgent,
    settings::{log::Style, Settings},
};

/// An example main function for any agent that implemented Default
async fn _example_main<OA>(settings: Settings) -> Result<()>
where
    OA: OpticsAgent + Default,
{
    // Instantiate an agent
    let oa = OA::default();
    // Use the agent to run a number of replicas
    oa.run_from_settings(&settings).await
}

/// Read settings from the config file and set up reporting and logging based
/// on the settings
#[allow(dead_code)]
fn setup() -> Result<Settings> {
    color_eyre::install()?;

    let settings = Settings::new()?;

    // TODO: setup logging based on settings

    Ok(settings)
}

#[allow(dead_code)]
fn main() -> Result<()> {
    let _settings = setup()?;
    dbg!(_settings);
    // tokio::runtime::Builder::new_current_thread()
    //     .enable_all()
    //     .build()
    //     .unwrap()
    //     .block_on(_example_main(settings))?;

    Ok(())
}
