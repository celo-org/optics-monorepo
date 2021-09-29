use structopt::StructOpt;

use crate::subcommands::{processor_state::ProcessorStateCommand, prove::ProveCommand};

#[derive(StructOpt)]
pub enum Commands {
    /// Prove a message on a home for a given leaf index
    Prove(ProveCommand),
    /// Print the processor's db state
    ProcessorState(ProcessorStateCommand),
}
