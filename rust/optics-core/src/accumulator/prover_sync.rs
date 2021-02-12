use crate::{accumulator::{prover::{Prover, ProverError}}, traits::{Home}};
use std::{sync::Arc};
use tokio::{sync::{RwLock, oneshot::Receiver}};

pub struct ProverSync {
    prover: Arc<RwLock<Prover>>,
    home: Arc<Box<dyn Home>>,
    receiver: Receiver<()>,
}

impl ProverSync {
    async fn poll_updates(&self) -> Result<(), ProverError> {
        Ok(())
    }
}