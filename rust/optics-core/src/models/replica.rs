use crate::{OpticsError, SignedUpdate};
use ethers::core::types::{Address, H256, U256};

/// Waiting state
#[derive(Debug, Clone, Copy, Default)]
pub struct Waiting {
    root: H256,
}

/// Pending update state
#[derive(Debug, Clone, Copy)]
pub struct Pending {
    root: H256,
    new_root: H256,
    timeout: U256,
}

/// Failed state
#[derive(Debug, Clone, Copy)]
pub struct Failed {}

/// The Replica-chain Optics object
#[derive(Debug, Clone, Copy, Default)]
pub struct Replica<S> {
    remote: u32,
    local: u32,
    updater: Address,
    optimistic_wait: U256,
    state: S,
}

impl<S> Replica<S> {
    /// SLIP-44 id of the Home chain
    pub fn remote(&self) -> u32 {
        self.remote
    }

    /// SLIP-44 id of this Replica chain
    pub fn local(&self) -> u32 {
        self.local
    }

    /// Ethereum address of the updater

    pub fn updater(&self) -> Address {
        self.updater
    }

    /// The number of seconds to wait before optimistically accepting an update
    pub fn wait(&self) -> U256 {
        self.optimistic_wait
    }

    /// Current state
    pub fn state(&self) -> &S {
        &self.state
    }

    fn check_sig(&self, update: &SignedUpdate) -> Result<(), OpticsError> {
        update.verify(self.updater)
    }

    /// Notify Replica of double update, and set to failed
    pub fn double_update(
        self,
        first: &SignedUpdate,
        second: &SignedUpdate,
    ) -> Result<Replica<Failed>, Self> {
        if first == second || self.check_sig(first).is_err() || self.check_sig(second).is_err() {
            Err(self)
        } else {
            Ok(Replica {
                remote: self.remote,
                local: self.local,
                updater: self.updater,
                optimistic_wait: self.optimistic_wait,
                state: Failed {},
            })
        }
    }
}

impl Replica<Waiting> {
    /// Get the current root
    pub fn root(&self) -> H256 {
        self.state().root
    }

    /// Instantiate a new Replica.
    pub fn init(remote: u32, local: u32, updater: Address, optimistic_wait: U256) -> Self {
        Self {
            remote,
            local,
            updater,
            optimistic_wait,
            state: Waiting::default(),
        }
    }

    /// Queue a pending update
    pub fn update(
        self,
        update: &SignedUpdate,
        now: impl FnOnce() -> U256,
    ) -> Result<Replica<Pending>, Self> {
        if self.check_sig(update).is_err() {
            return Err(self);
        }

        Ok(Replica {
            remote: self.remote,
            local: self.local,
            updater: self.updater,
            optimistic_wait: self.optimistic_wait,
            state: Pending {
                root: self.state.root,
                new_root: update.update.new_root,
                timeout: now() + self.optimistic_wait,
            },
        })
    }
}

impl Replica<Pending> {
    /// Get the current root
    pub fn root(&self) -> H256 {
        self.state().root
    }

    /// Confirm a queued update after the timer has elapsed
    pub fn confirm_update(self, now: impl FnOnce() -> U256) -> Result<Replica<Waiting>, Self> {
        if now() < self.state.timeout {
            // timeout hasn't elapsed
            return Err(self);
        }

        Ok(Replica {
            remote: self.remote,
            local: self.local,
            updater: self.updater,
            optimistic_wait: self.optimistic_wait,
            state: Waiting {
                root: self.state.new_root,
            },
        })
    }
}
