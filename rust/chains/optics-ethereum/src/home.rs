#![allow(clippy::enum_variant_names)]

use async_trait::async_trait;
use color_eyre::Result;
use ethers::contract::abigen;
use ethers::core::types::{Address, Signature, H256};
use optics_core::db::{HomeDB, DB};
use optics_core::traits::CommittedMessage;
use optics_core::SignedUpdateWithMeta;
use optics_core::{
    accumulator::merkle::Proof,
    traits::{
        ChainCommunicationError, Common, DoubleUpdate, Home, RawCommittedMessage, State, TxOutcome,
    },
    utils, Decode, Encode, Message, OpticsMessage, SignedUpdate, Update, UpdateMeta
};
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tokio::try_join;
use tracing::{debug, info, info_span, instrument};
use tracing::{instrument::Instrumented, Instrument};

use std::cmp::min;
use std::time::Duration;
use std::{convert::TryFrom, convert::TryInto, error::Error as StdError, sync::Arc};

use crate::report_tx;

static NONCE: &str = "destination_and_nonce_";
static LEAF_IDX: &str = "leaf_index_";
static LEAF_HASH: &str = "leaf_hash_";
static PREV_ROOT: &str = "update_prev_root_";
static NEW_ROOT: &str = "update_new_root_";
static LATEST_ROOT: &str = "update_latest_root_";
static PROOF: &str = "proof_";
static LATEST_LEAF: &str = "latest_known_leaf_";

static LAST_INSPECTED: &str = "homeIndexerLastInspected";

#[allow(missing_docs)]
abigen!(
    EthereumHomeInternal,
    "./chains/optics-ethereum/abis/Home.abi.json"
);

#[derive(Debug, Clone)]
pub struct HomeDB {
    db: DB,
    home_name: String,
}

impl HomeDB {
    fn new(db: DB, home_name: String) -> Self {
        Self { db, home_name }
    }

    fn full_prefix(&self, prefix: impl AsRef<[u8]>) -> Vec<u8> {
        let mut full_prefix = vec![];
        full_prefix.extend(self.home_name.as_ref() as &[u8]);
        full_prefix.extend(prefix.as_ref());
        full_prefix
    }

    pub fn store_encodable<V: Encode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
        value: &V,
    ) -> Result<(), DbError> {
        self.db
            .store_encodable(&self.full_prefix(prefix), key, value)
    }

    pub fn retrieve_decodable<V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
    ) -> Result<Option<V>, DbError> {
        self.db.retrieve_decodable(&self.full_prefix(prefix), key)
    }

    pub fn store_keyed_encodable<K: Encode, V: Encode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
        value: &V,
    ) -> Result<(), DbError> {
        self.store_encodable(prefix, key.to_vec(), value)
    }

    pub fn retrieve_keyed_decodable<K: Encode, V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
    ) -> Result<Option<V>, DbError> {
        self.retrieve_decodable(prefix, key.to_vec())
    }

    /// Store a raw committed message
    pub fn store_raw_committed_message(
        &self,
        message: &RawCommittedMessage,
    ) -> Result<(), DbError> {
        let parsed = OpticsMessage::read_from(&mut message.message.clone().as_slice())?;

        let destination_and_nonce = parsed.destination_and_nonce();

        let leaf_hash = message.leaf_hash();

        debug!(
            leaf_hash = ?leaf_hash,
            destination_and_nonce,
            destination = parsed.destination,
            nonce = parsed.nonce,
            leaf_index = message.leaf_index,
            "storing raw committed message in db"
        );
        self.store_keyed_encodable(LEAF_HASH, &leaf_hash, message)?;
        self.store_leaf(message.leaf_index, destination_and_nonce, leaf_hash)?;
        Ok(())
    }

    /// Store the latest known leaf_index
    pub fn update_latest_leaf_index(&self, leaf_index: u32) -> Result<(), DbError> {
        if let Ok(Some(idx)) = self.retrieve_latest_leaf_index() {
            if leaf_index <= idx {
                return Ok(());
            }
        }
        self.store_encodable("", LATEST_LEAF, &leaf_index)
    }

    /// Retrieve the highest known leaf_index
    pub fn retrieve_latest_leaf_index(&self) -> Result<Option<u32>, DbError> {
        self.retrieve_decodable("", LATEST_LEAF)
    }

    /// Store the leaf_hash keyed by leaf_index
    pub fn store_leaf(
        &self,
        leaf_index: u32,
        destination_and_nonce: u64,
        leaf_hash: H256,
    ) -> Result<(), DbError> {
        debug!(
            leaf_index,
            leaf_hash = ?leaf_hash,
            "storing leaf hash keyed by index and dest+nonce"
        );
        self.store_keyed_encodable(NONCE, &destination_and_nonce, &leaf_hash)?;
        self.store_keyed_encodable(LEAF_IDX, &leaf_index, &leaf_hash)?;
        self.update_latest_leaf_index(leaf_index)
    }

    /// Retrieve a raw committed message by its leaf hash
    pub fn message_by_leaf_hash(
        &self,
        leaf_hash: H256,
    ) -> Result<Option<RawCommittedMessage>, DbError> {
        self.retrieve_keyed_decodable(LEAF_HASH, &leaf_hash)
    }

    /// Retrieve the leaf hash keyed by leaf index
    pub fn leaf_by_leaf_index(&self, leaf_index: u32) -> Result<Option<H256>, DbError> {
        self.retrieve_keyed_decodable(LEAF_IDX, &leaf_index)
    }

    /// Retrieve the leaf hash keyed by destination and nonce
    pub fn leaf_by_nonce(&self, destination: u32, nonce: u32) -> Result<Option<H256>, DbError> {
        let key = utils::destination_and_nonce(destination, nonce);
        self.retrieve_keyed_decodable(NONCE, &key)
    }

    /// Retrieve a raw committed message by its leaf hash
    pub fn message_by_nonce(
        &self,
        destination: u32,
        nonce: u32,
    ) -> Result<Option<RawCommittedMessage>, DbError> {
        let leaf_hash = self.leaf_by_nonce(destination, nonce)?;
        match leaf_hash {
            None => Ok(None),
            Some(leaf_hash) => self.message_by_leaf_hash(leaf_hash),
        }
    }

    /// Retrieve a raw committed message by its leaf index
    pub fn message_by_leaf_index(
        &self,
        index: u32,
    ) -> Result<Option<RawCommittedMessage>, DbError> {
        let leaf_hash: Option<H256> = self.leaf_by_leaf_index(index)?;
        match leaf_hash {
            None => Ok(None),
            Some(leaf_hash) => self.message_by_leaf_hash(leaf_hash),
        }
    }

    /// Retrieve the latest committed
    pub fn retrieve_latest_root(&self) -> Result<Option<H256>, DbError> {
        self.retrieve_decodable("", LATEST_ROOT)
    }

    fn store_latest_root(&self, root: H256) -> Result<(), DbError> {
        debug!(root = ?root, "storing new latest root in DB");
        self.store_encodable("", LATEST_ROOT, &root)
    }

    /// Store a signed update
    pub fn store_update(&self, update: &SignedUpdate) -> Result<(), DbError> {
        debug!(
            previous_root = ?update.update.previous_root,
            new_root = ?update.update.new_root,
            "storing update in DB"
        );

        // If there is no latet root, or if this update is on the latest root
        // update latest root
        match self.retrieve_latest_root()? {
            Some(root) => {
                if root == update.update.previous_root {
                    self.store_latest_root(update.update.new_root)?;
                }
            }
            None => self.store_latest_root(update.update.new_root)?,
        }

        self.store_keyed_encodable(PREV_ROOT, &update.update.previous_root, update)?;
        self.store_keyed_encodable(
            NEW_ROOT,
            &update.update.new_root,
            &update.update.previous_root,
        )
    }

    /// Retrieve an update by its previous root
    pub fn update_by_previous_root(
        &self,
        previous_root: H256,
    ) -> Result<Option<SignedUpdate>, DbError> {
        self.retrieve_keyed_decodable(PREV_ROOT, &previous_root)
    }

    /// Retrieve an update by its new root
    pub fn update_by_new_root(&self, new_root: H256) -> Result<Option<SignedUpdate>, DbError> {
        let prev_root: Option<H256> = self.retrieve_keyed_decodable(NEW_ROOT, &new_root)?;

        match prev_root {
            Some(prev_root) => self.retrieve_keyed_decodable(PREV_ROOT, &prev_root),
            None => Ok(None),
        }
    }

    /// Iterate over all leaves
    pub fn leaf_iterator(&self) -> PrefixIterator<H256> {
        PrefixIterator::new(self.db.prefix_iterator(LEAF_IDX), LEAF_IDX.as_ref())
    }

    /// Store a proof by its leaf index
    pub fn store_proof(&self, leaf_index: u32, proof: &Proof) -> Result<(), DbError> {
        debug!(leaf_index, "storing proof in DB");
        self.store_keyed_encodable(PROOF, &leaf_index, proof)
    }

    /// Retrieve a proof by its leaf index
    pub fn proof_by_leaf_index(&self, leaf_index: u32) -> Result<Option<Proof>, DbError> {
        self.retrieve_keyed_decodable(PROOF, &leaf_index)
    }

    // TODO(james): this is a quick-fix for the prover_sync and I don't like it
    /// poll db ever 100 milliseconds waitinf for a leaf.
    pub fn wait_for_leaf(
        &self,
        leaf_index: u32,
    ) -> impl Future<Output = Result<Option<H256>, DbError>> + '_ {
        let slf = self.clone();
        async move {
            loop {
                if let Some(leaf) = slf.leaf_by_leaf_index(leaf_index)? {
                    return Ok(Some(leaf));
                }
                sleep(Duration::from_millis(100)).await
            }
        }
    }
}

struct HomeIndexer<M>
where
    M: ethers::providers::Middleware,
{
    contract: Arc<EthereumHomeInternal<M>>,
    provider: Arc<M>,
    home_db: HomeDB,
    from_height: u32,
    chunk_size: u32,
    indexed_height: prometheus::IntGauge,
}

impl<M> HomeIndexer<M>
where
    M: ethers::providers::Middleware + 'static,
{
    #[instrument(err, skip(self))]
    async fn sync_updates(&self, from: u32, to: u32) -> Result<()> {
        let mut events = self
            .contract
            .update_filter()
            .from_block(from)
            .to_block(to)
            .query_with_meta()
            .await?;

        events.sort_by(|a, b| {
            let mut ordering = a.1.block_number.cmp(&b.1.block_number);
            if ordering == std::cmp::Ordering::Equal {
                ordering = a.1.transaction_index.cmp(&b.1.transaction_index);
            }

            ordering
        });

        let updates_with_meta = events.iter().map(|event| {
            let signature = Signature::try_from(event.0.signature.as_slice())
                .expect("chain accepted invalid signature");

            let update = Update {
                home_domain: event.0.home_domain,
                previous_root: event.0.old_root.into(),
                new_root: event.0.new_root.into(),
            };

            SignedUpdateWithMeta {
                signed_update: SignedUpdate { update, signature },
                metadata: UpdateMeta {
                    block_number: event.1.block_number.as_u64(),
                },
            }
        });

        for update_with_meta in updates_with_meta {
            self.home_db
                .store_latest_update(&update_with_meta.signed_update)?;
            self.home_db.store_update_metadata(
                update_with_meta.signed_update.update.new_root,
                update_with_meta.metadata,
            )?;

            info!(
                "Stored new update in db. Block number: {}. Previous root: {}. New root: {}.",
                &update_with_meta.metadata.block_number,
                &update_with_meta.signed_update.update.previous_root,
                &update_with_meta.signed_update.update.new_root,
            );
        }

        Ok(())
    }

    #[instrument(err, skip(self))]
    async fn sync_leaves(&self, from: u32, to: u32) -> Result<()> {
        let events = self
            .contract
            .dispatch_filter()
            .from_block(from)
            .to_block(to)
            .query()
            .await?;

        let messages = events.into_iter().map(|f| RawCommittedMessage {
            leaf_index: f.leaf_index.as_u32(),
            committed_root: f.committed_root.into(),
            message: f.message,
        });

        for message in messages {
            self.home_db.store_raw_committed_message(&message)?;

            let committed_message: CommittedMessage = message.try_into()?;
            info!(
                "Stored new message in db. Leaf index: {}. Origin: {}. Destination: {}. Nonce: {}.",
                &committed_message.leaf_index,
                &committed_message.message.origin,
                &committed_message.message.destination,
                &committed_message.message.nonce
            );
        }

        Ok(())
    }

    fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!("HomeIndexer");

        tokio::spawn(async move {
            let mut next_height: u32 = self
                .home_db
                .retrieve_decodable("", LAST_INSPECTED)
                .expect("db failure")
                .unwrap_or(self.from_height);
            info!(
                next_height = next_height,
                "resuming indexer from {}", next_height
            );

            loop {
                self.indexed_height.set(next_height as i64);
                let tip = self.provider.get_block_number().await?.as_u32();
                let candidate = next_height + self.chunk_size;
                let to = min(tip, candidate);

                info!(
                    next_height = next_height,
                    to = to,
                    "indexing block heights {}...{}",
                    next_height,
                    to
                );

                // TODO(james): these shouldn't have to go in lockstep
                try_join!(
                    self.sync_updates(next_height, to),
                    self.sync_leaves(next_height, to)
                )?;

                self.home_db
                    .store_encodable("", LAST_INSPECTED, &next_height)?;
                next_height = to;
                // sleep here if we've caught up
                if to == tip {
                    sleep(Duration::from_secs(100)).await;
                }
            }
        })
        .instrument(span)
    }
}

/// A reference to a Home contract on some Ethereum chain
#[derive(Debug)]
pub struct EthereumHome<M>
where
    M: ethers::providers::Middleware,
{
    contract: Arc<EthereumHomeInternal<M>>,
    home_db: HomeDB,
    domain: u32,
    name: String,
    provider: Arc<M>,
}

impl<M> EthereumHome<M>
where
    M: ethers::providers::Middleware + 'static,
{
    /// Create a reference to a Home at a specific Ethereum address on some
    /// chain
    pub fn new(name: &str, domain: u32, address: Address, provider: Arc<M>, db: DB) -> Self {
        Self {
            contract: Arc::new(EthereumHomeInternal::new(address, provider.clone())),
            domain,
            name: name.to_owned(),
            home_db: HomeDB::new(db, name.to_owned()),
            provider,
        }
    }
}

#[async_trait]
impl<M> Common for EthereumHome<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn name(&self) -> &str {
        &self.name
    }

    #[tracing::instrument(err, skip(self))]
    async fn status(&self, txid: H256) -> Result<Option<TxOutcome>, ChainCommunicationError> {
        let receipt_opt = self
            .contract
            .client()
            .get_transaction_receipt(txid)
            .await
            .map_err(|e| Box::new(e) as Box<dyn StdError + Send + Sync>)?;

        Ok(receipt_opt.map(Into::into))
    }

    #[tracing::instrument(err, skip(self))]
    async fn updater(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.updater().call().await?.into())
    }

    #[tracing::instrument(err, skip(self))]
    async fn state(&self) -> Result<State, ChainCommunicationError> {
        let state = self.contract.state().call().await?;
        match state {
            0 => Ok(State::Waiting),
            1 => Ok(State::Failed),
            _ => unreachable!(),
        }
    }

    #[tracing::instrument(err, skip(self))]
    async fn committed_root(&self) -> Result<H256, ChainCommunicationError> {
        Ok(self.contract.committed_root().call().await?.into())
    }

    #[tracing::instrument(err, skip(self))]
    async fn signed_update_by_old_root(
        &self,
        old_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        loop {
            if let Some(update) = self.home_db.update_by_previous_root(old_root)? {
                return Ok(Some(update));
            }
            sleep(Duration::from_millis(500)).await;
        }
    }

    #[tracing::instrument(err, skip(self))]
    async fn signed_update_by_new_root(
        &self,
        new_root: H256,
    ) -> Result<Option<SignedUpdate>, ChainCommunicationError> {
        loop {
            if let Some(update) = self.home_db.update_by_new_root(new_root)? {
                return Ok(Some(update));
            }
            sleep(Duration::from_millis(500)).await;
        }
    }

    #[tracing::instrument(err, skip(self), fields(hexSignature = %format!("0x{}", hex::encode(update.signature.to_vec()))))]
    async fn update(&self, update: &SignedUpdate) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.update(
            update.update.previous_root.to_fixed_bytes(),
            update.update.new_root.to_fixed_bytes(),
            update.signature.to_vec(),
        );

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err, skip(self))]
    async fn double_update(
        &self,
        double: &DoubleUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.double_update(
            double.0.update.previous_root.to_fixed_bytes(),
            [
                double.0.update.new_root.to_fixed_bytes(),
                double.1.update.new_root.to_fixed_bytes(),
            ],
            double.0.signature.to_vec(),
            double.1.signature.to_vec(),
        );
        let response = report_tx!(tx);

        Ok(response.into())
    }
}

#[async_trait]
impl<M> Home for EthereumHome<M>
where
    M: ethers::providers::Middleware + 'static,
{
    fn local_domain(&self) -> u32 {
        self.domain
    }

    /// Start an indexing task that syncs chain state
    fn index(
        &self,
        from_height: u32,
        chunk_size: u32,
        indexed_height: prometheus::IntGauge,
    ) -> Instrumented<JoinHandle<Result<()>>> {
        let indexer = HomeIndexer {
            contract: self.contract.clone(),
            home_db: self.home_db.clone(),
            from_height,
            provider: self.provider.clone(),
            chunk_size,
            indexed_height,
        };
        indexer.spawn()
    }

    #[tracing::instrument(err, skip(self))]
    async fn raw_message_by_nonce(
        &self,
        destination: u32,
        nonce: u32,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        loop {
            if let Some(update) = self.home_db.message_by_nonce(destination, nonce)? {
                return Ok(Some(update));
            }
            sleep(Duration::from_millis(500)).await;
        }
    }

    #[tracing::instrument(err, skip(self))]
    async fn raw_message_by_leaf(
        &self,
        leaf: H256,
    ) -> Result<Option<RawCommittedMessage>, ChainCommunicationError> {
        loop {
            if let Some(update) = self.home_db.message_by_leaf(leaf)? {
                return Ok(Some(update));
            }
            sleep(Duration::from_millis(500)).await;
        }
    }

    async fn leaf_by_tree_index(
        &self,
        tree_index: usize,
    ) -> Result<Option<H256>, ChainCommunicationError> {
        loop {
            if let Some(update) = self.home_db.leaf_by_leaf_index(tree_index as u32)? {
                return Ok(Some(update));
            }
            sleep(Duration::from_millis(500)).await;
        }
    }

    #[tracing::instrument(err, skip(self))]
    async fn nonces(&self, destination: u32) -> Result<u32, ChainCommunicationError> {
        Ok(self.contract.nonces(destination).call().await?)
    }

    #[tracing::instrument(err, skip(self))]
    async fn dispatch(&self, message: &Message) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.dispatch(
            message.destination,
            message.recipient.to_fixed_bytes(),
            message.body.clone(),
        );

        Ok(report_tx!(tx).into())
    }

    async fn queue_contains(&self, root: H256) -> Result<bool, ChainCommunicationError> {
        Ok(self.contract.queue_contains(root.into()).call().await?)
    }

    #[tracing::instrument(err, skip(self), fields(hexSignature = %format!("0x{}", hex::encode(update.signature.to_vec()))))]
    async fn improper_update(
        &self,
        update: &SignedUpdate,
    ) -> Result<TxOutcome, ChainCommunicationError> {
        let tx = self.contract.improper_update(
            update.update.previous_root.to_fixed_bytes(),
            update.update.new_root.to_fixed_bytes(),
            update.signature.to_vec(),
        );

        Ok(report_tx!(tx).into())
    }

    #[tracing::instrument(err, skip(self))]
    async fn produce_update(&self) -> Result<Option<Update>, ChainCommunicationError> {
        let (a, b) = self.contract.suggest_update().call().await?;

        let previous_root: H256 = a.into();
        let new_root: H256 = b.into();

        if new_root.is_zero() {
            return Ok(None);
        }

        Ok(Some(Update {
            home_domain: self.local_domain(),
            previous_root,
            new_root,
        }))
    }
}
