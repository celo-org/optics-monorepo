#![allow(non_snake_case)]

use async_trait::async_trait;
use mockall::*;

use ethers::core::types::{H256, U256};

use optics_core::{
    accumulator::merkle::Proof,
    traits::{ChainCommunicationError, Common, DoubleUpdate, Replica, State, TxOutcome},
    SignedUpdate, StampedMessage,
};

mock! {
    pub ReplicaContract {
        // Replica
        pub fn _destination_domain(&self) -> u32 {}

        pub fn _next_pending(&self) -> Result<Option<(H256, U256)>, ChainCommunicationError> {}

        pub fn _can_confirm(&self) -> Result<bool, ChainCommunicationError> {}

        pub fn _confirm(&self) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _previous_root(&self) -> Result<H256, ChainCommunicationError> {}

        pub fn _last_processed(&self) -> Result<U256, ChainCommunicationError> {}

        pub fn _prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _process(&self, message: &StampedMessage) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _prove_and_process(
            &self,
            message: &StampedMessage,
            proof: &Proof,
        ) -> Result<TxOutcome, ChainCommunicationError> {}

        // Common
        pub fn _name(&self) -> &str {}

        pub fn _status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {}

        pub fn _updater(&self) -> Result<H256, ChainCommunicationError> {}

        pub fn _state(&self) -> Result<State, ChainCommunicationError> {}

        pub fn _current_root(&self) -> Result<H256, ChainCommunicationError> {}

        pub fn _signed_update_by_old_root(
            &self,
            old_root: H256,
        ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {}

        pub fn _signed_update_by_new_root(
            &self,
            new_root: H256,
        ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {}

        pub fn _update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _double_update(
            &self,
            double: &DoubleUpdate,
        ) -> Result<TxOutcome, ChainCommunicationError> {}
    }
}

impl std::fmt::Debug for MockReplicaContract {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MockReplicaContract")
    }
}

#[async_trait]
impl Replica for MockReplicaContract {
    fn destination_domain(&self) -> u32 {
        self._destination_domain()
    }

    async fn next_pending(&self) -> Result<Option<(H256, U256)>, ChainCommunicationError> {
        self._next_pending()
    }

    async fn can_confirm(&self) -> Result<bool, ChainCommunicationError> {
        self._can_confirm()
    }

    async fn confirm(&self) -> Result<TxOutcome, ChainCommunicationError> {
        self._confirm()
    }

    async fn previous_root(&self) -> Result<H256, ChainCommunicationError> {
        self._previous_root()
    }

    async fn last_processed(&self) -> Result<U256, ChainCommunicationError> {
        self._last_processed()
    }

    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {
        self._prove(proof)
    }

    async fn process(
        &self,
        message: &StampedMessage,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._process(message)
    }

    async fn prove_and_process(
        &self,
        message: &StampedMessage,
        proof: &Proof,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._prove_and_process(message, proof)
    }
}

#[async_trait]
impl Common for MockReplicaContract {
    fn name(&self) -> &str {
        self._name()
    }

    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        self._status(txid)
    }

    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        self._updater()
    }

    async fn state(&self) -> Result<State, ChainCommunicationError> {
        self._state()
    }

    async fn current_root(&self) -> Result<H256, ChainCommunicationError> {
        self._current_root()
    }

    async fn signed_update_by_old_root(
        &self,
        old_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        self._signed_update_by_old_root(old_root)
    }

    async fn signed_update_by_new_root(
        &self,
        new_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        self._signed_update_by_new_root(new_root)
    }

    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        self._update(update)
    }

    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._double_update(double)
    }
}
