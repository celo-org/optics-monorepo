//! The relayer forwards signed updates from the home to chain to replicas
//!
//! At a regular interval, the relayer polls Home for signed updates and
//! submits them as updates with a pending timelock on the replica.

#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(unused_extern_crates)]

mod relayer;
mod settings;

use color_eyre::Result;

use optics_base::OpticsAgent;

use crate::{relayer::Relayer, settings::RelayerSettings as Settings};

async fn _main() -> Result<()> {
    color_eyre::install()?;
    let settings = Settings::new()?;

    let agent = Relayer::from_settings(settings).await?;

    agent
        .as_ref()
        .settings
        .tracing
        .start_tracing(agent.metrics().span_duration())?;

    let _ = agent.metrics().run_http_server();

    agent.run_all().await??;
    Ok(())
}

fn main() -> Result<()> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}
