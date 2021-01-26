//! This repo contains a simple framework for building Optics agents.
//! It has common utils and tools for configuring the app, interacting with the
//! smart contracts, etc.
//!
//! Implementations of the `Home` and `Replica` traits on different chains
//! ought to live here.
//!
//! Settings parsers live here, while config toml files live with their agent.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

/// Interfaces to the ethereum contracts
pub mod abis;

/// Settings and configuration from file
pub mod settings;

/// Base trait for an agent
pub mod agent;

use color_eyre::Result;

use crate::{agent::OpticsAgent, settings::Settings};

async fn _example_main<OA>(settings: Settings) -> Result<()>
where
    OA: OpticsAgent + Default,
{
    // Instantiate an agent
    let oa = OA::default();
    // Use the agent to run a number of replicas
    oa.run_from_settings(&settings).await
}

fn main() -> Result<()> {
    color_eyre::install()?;

    let settings = settings::Settings::new().expect("!config");
    dbg!(settings);

    // tokio::runtime::Builder::new_current_thread()
    //     .enable_all()
    //     .build()
    //     .unwrap()
    //     .block_on(_main(settings))?;

    Ok(())
}
