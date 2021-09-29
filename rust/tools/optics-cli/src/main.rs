use clap::Clap;
use color_eyre::Result;

mod args;
mod replicas;
mod rpc;
mod subcommands;

use args::{Args, SubCommands};

#[tokio::main]
async fn main() -> Result<()> {
    let opts = Args::parse();

    match opts.subcommands {
        SubCommands::Prove(prove) => prove.run().await,
        SubCommands::ProcessorState(_processor_state) => Ok(()),
    }
}
