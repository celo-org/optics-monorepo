#![allow(non_snake_case)]

use async_trait::async_trait;
use mockall::*;

use ethers::core::types::H256;

use optics_core::{accumulator::merkle::Proof, *};

mock! {
    pub ReplicaContract {
        // Replica
        pub fn _local_domain(&self) -> u32 {}

        pub fn _remote_domain(&self) -> Result<u32, ChainCommunicationError> {}

        pub fn _prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _process(&self, message: &OpticsMessage) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _prove_and_process(
            &self,
            message: &OpticsMessage,
            proof: &Proof,
        ) -> Result<TxOutcome, ChainCommunicationError> {}

        // Common
        pub fn _name(&self) -> &str {}

        pub fn _status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {}

        pub fn _updater(&self) -> Result<H256, ChainCommunicationError> {}

        pub fn _state(&self) -> Result<State, ChainCommunicationError> {}

        pub fn _committed_root(&self) -> Result<H256, ChainCommunicationError> {}

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

        pub fn _message_status(&self, leaf: H256) -> Result<MessageStatus, ChainCommunicationError> {}

        pub fn _acceptable_root(&self, root: H256) -> Result<bool, ChainCommunicationError> {}
    }
}

impl std::fmt::Debug for MockReplicaContract {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MockReplicaContract")
    }
}

#[async_trait]
impl Replica for MockReplicaContract {
    fn local_domain(&self) -> u32 {
        self._local_domain()
    }

    async fn remote_domain(&self) -> Result<u32, ChainCommunicationError> {
        self._remote_domain()
    }

    async fn prove(&self, proof: &Proof) -> Result<TxOutcome, ChainCommunicationError> {
        self._prove(proof)
    }

    async fn process(&self, message: &OpticsMessage) -> Result<TxOutcome, ChainCommunicationError> {
        self._process(message)
    }

    async fn prove_and_process(
        &self,
        message: &OpticsMessage,
        proof: &Proof,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._prove_and_process(message, proof)
    }

    async fn message_status(&self, leaf: H256) -> Result<MessageStatus, ChainCommunicationError> {
        self._message_status(leaf)
    }

    async fn acceptable_root(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        self._acceptable_root(root)
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

    async fn committed_root(&self) -> Result<H256, ChainCommunicationError> {
        self._committed_root()
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
