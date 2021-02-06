use color_eyre::{eyre::eyre, Result};

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

    let builder = tracing_subscriber::fmt::fmt().with_max_level(settings.tracing.level);

    match settings.tracing.style {
        Style::Pretty => builder.pretty().try_init(),
        Style::Json => builder.json().try_init(),
        Style::Compact => builder.compact().try_init(),
        Style::Default => builder.try_init(),
    }
    .map_err(|e| eyre!(e))?;

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
