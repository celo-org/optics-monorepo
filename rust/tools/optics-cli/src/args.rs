use clap::Clap;

use crate::subcommands::{processor_state::ProcessorStateCommand, prove::ProveCommand};

#[derive(Clap)]
pub struct Args {
    #[clap(subcommand)]
    pub subcommands: SubCommands,
}

#[derive(Clap)]
pub enum SubCommands {
    /// Prove a message on a home for a given leaf index
    Prove(ProveCommand),
    /// Print the processor's db state
    ProcessorState(ProcessorStateCommand),
}
