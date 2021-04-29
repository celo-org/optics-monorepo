use ethers::core::types::{Address, H256};
use std::{collections::VecDeque, io::Write};

use crate::{
    accumulator::{hash, incremental::IncrementalMerkle},
    OpticsError, SignedUpdate, Update,
};

/// Waiting state
#[derive(Default, Debug, Clone)]
pub struct Waiting {
    queue: VecDeque<H256>,
    accumulator: IncrementalMerkle,
}

/// Failed state
#[derive(Debug, Clone)]
pub struct Failed {
    queue: VecDeque<H256>,
    accumulator: IncrementalMerkle,
}

impl Waiting {
    /// Return a reference to the root queue
    pub fn queue(&self) -> &VecDeque<H256> {
        &self.queue
    }

    /// Return a reference to the incremental merkle tree
    pub fn accumulator(&self) -> &IncrementalMerkle {
        &self.accumulator
    }
}

impl Failed {
    /// Return a reference to the root queue
    pub fn queue(&self) -> &VecDeque<H256> {
        &self.queue
    }

    /// Return a reference to the incremental merkle tree
    pub fn accumulator(&self) -> &IncrementalMerkle {
        &self.accumulator
    }
}

fn format_message(
    origin: u32,
    sender: H256,
    destination: u32,
    recipient: H256,
    body: &[u8],
) -> Vec<u8> {
    let mut buf = vec![];
    buf.write_all(&origin.to_be_bytes()).unwrap();
    buf.write_all(sender.as_ref()).unwrap();
    buf.write_all(&destination.to_be_bytes()).unwrap();
    buf.write_all(recipient.as_ref()).unwrap();
    buf.write_all(&body).unwrap();
    buf
}

/// The Home-chain Optics object
#[derive(Debug, Clone)]
pub struct Home<S> {
    local: u32,
    updater: Address,
    current_root: H256,
    state: S,
}

impl<S> Home<S> {
    /// SLIP-44 id of the Home chain
    pub fn local(&self) -> u32 {
        self.local
    }

    /// Ethereum address of the updater
    pub fn updater(&self) -> Address {
        self.updater
    }

    /// Current state
    pub fn state(&self) -> &S {
        &self.state
    }

    fn check_sig(&self, update: &SignedUpdate) -> Result<(), OpticsError> {
        update.verify(self.updater)
    }
}

impl From<Home<Waiting>> for Home<Failed> {
    fn from(h: Home<Waiting>) -> Self {
        Self {
            local: h.local,
            updater: h.updater,
            current_root: h.current_root,
            state: Failed {
                accumulator: h.state.accumulator,
                queue: h.state.queue,
            },
        }
    }
}

impl Home<Waiting> {
    /// Get the current accumulator root
    pub fn root(&self) -> H256 {
        self.state().accumulator().root()
    }

    /// Instantiate a new Home.
    pub fn init(local: u32, updater: Address) -> Home<Waiting> {
        Self {
            local,
            updater,
            current_root: Default::default(),
            state: Waiting::default(),
        }
    }

    /// Enqueue a message
    pub fn enqueue(&mut self, sender: H256, destination: u32, recipient: H256, body: &[u8]) {
        let message = format_message(self.local, sender, destination, recipient, body);
        let message_hash = hash(&message);
        self.state.accumulator.ingest(message_hash);
        self.state.queue.push_back(self.state.accumulator.root());
    }

    fn _update(&mut self, update: &Update) -> Result<(), OpticsError> {
        if update.previous_root != self.current_root {
            return Err(OpticsError::WrongCurrentRoot {
                actual: update.previous_root,
                expected: self.current_root,
            });
        }

        if self.state.queue.contains(&update.new_root) {
            loop {
                let item = self.state.queue.pop_front().unwrap();
                if item == update.new_root {
                    return Ok(());
                }
            }
        }

        Err(OpticsError::UnknownNewRoot(update.new_root))
    }

    /// Produce an update from the current root to the new root.
    pub fn produce_update(&self) -> Update {
        Update {
            home_domain: self.local,
            previous_root: self.current_root,
            new_root: self.state.accumulator.root(),
        }
    }

    /// Update the root
    pub fn update(&mut self, update: &SignedUpdate) -> Result<(), OpticsError> {
        self.check_sig(update)?;
        self._update(&update.update)
    }

    /// Notify the Home of a double update, and set failed.
    pub fn double_update(
        self,
        first: &SignedUpdate,
        second: &SignedUpdate,
    ) -> Result<Home<Failed>, Home<Waiting>> {
        if first == second || self.check_sig(first).is_err() || self.check_sig(second).is_err() {
            Err(self)
        } else {
            Ok(self.into())
        }
    }

    /// Notify the Home of an improper update, and set failed.
    pub fn improper_update(self, update: &SignedUpdate) -> Result<Home<Failed>, Home<Waiting>> {
        if self.check_sig(update).is_err() || self.state.queue.contains(&update.update.new_root) {
            Err(self)
        } else {
            Ok(self.into())
        }
    }
}
