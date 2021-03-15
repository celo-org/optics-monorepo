#![allow(non_snake_case)]

use async_trait::async_trait;
use mockall::*;

use ethers::core::types::H256;

use optics_core::{
    traits::{
        ChainCommunicationError, Common, DoubleUpdate, Home, RawCommittedMessage, State, TxOutcome,
    },
    Message, SignedUpdate, Update,
};

mock! {
    pub HomeContract {
        // Home
        pub fn _origin_domain(&self) -> u32 {}

        pub fn _domain_hash(&self) -> H256 {}

        pub fn _raw_message_by_sequence(
            &self,
            destination: u32,
            sequence: u32,
        ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {}

        pub fn _raw_message_by_leaf(
            &self,
            leaf: H256,
        ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {}


        pub fn _leaf_by_tree_index(
            &self,
            tree_index: usize,
        ) -> Result<Option<H256>, ChainCommunicationError> {}

        pub fn _sequences(&self, destination: u32) -> Result<u32, ChainCommunicationError> {}

        pub fn _enqueue(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _queue_contains(&self, root: H256) -> Result<bool, ChainCommunicationError> {}

        pub fn _improper_update(
            &self,
            update: &SignedUpdate,
        ) -> Result<TxOutcome, ChainCommunicationError> {}

        pub fn _produce_update(&self) -> Result<Option<Update>, ChainCommunicationError> {}

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

impl std::fmt::Debug for MockHomeContract {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MockHomeContract")
    }
}

#[async_trait]
impl Home for MockHomeContract {
    fn origin_domain(&self) -> u32 {
        self._origin_domain()
    }

    fn domain_hash(&self) -> H256 {
        self._domain_hash()
    }

    async fn raw_message_by_sequence(
        &self,
        destination: u32,
        sequence: u32,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        self._raw_message_by_sequence(destination, sequence)
    }

    async fn raw_message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        self._raw_message_by_leaf(leaf)
    }

    async fn leaf_by_tree_index(
        &self,
        tree_index: usize,
    ) -> Result<Option<H256>, ChainCommunicationError> {
        self._leaf_by_tree_index(tree_index)
    }

    async fn sequences(&self, destination: u32) -> Result<u32, ChainCommunicationError> {
        self._sequences(destination)
    }

    async fn enqueue(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {
        self._enqueue(message)
    }

    async fn queue_contains(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        self._queue_contains(root)
    }

    async fn improper_update(
        &self,
        update: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        self._improper_update(update)
    }

    async fn produce_update(&self) -> Result<Option<Update>, ChainCommunicationError> {
        self._produce_update()
    }
}

#[async_trait]
impl Common for MockHomeContract {
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
