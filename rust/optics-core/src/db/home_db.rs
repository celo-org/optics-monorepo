use crate::db::{DbError, TypedDB, DB};
use crate::{
    accumulator::merkle::Proof, traits::RawCommittedMessage, utils, Decode, Encode, OpticsMessage,
    SignedUpdate,
};
use color_eyre::Result;
use ethers::core::types::H256;
use tokio::time::sleep;
use tracing::debug;

use std::future::Future;
use std::time::Duration;

use crate::db::iterator::PrefixIterator;

static NONCE: &str = "destination_and_nonce_";
static LEAF_IDX: &str = "leaf_index_";
static LEAF_HASH: &str = "leaf_hash_";
static PREV_ROOT: &str = "update_prev_root_";
static NEW_ROOT: &str = "update_new_root_";
static LATEST_ROOT: &str = "update_latest_root_";
static PROOF: &str = "proof_";
static LATEST_LEAF: &str = "latest_known_leaf_";

/// DB handle for storing data tied to a specific home.
///
/// Key structure: ```<home_name>_<additional_prefix(es)>_<key>```
#[derive(Debug, Clone)]
pub struct HomeDB(TypedDB);

impl HomeDB {
    /// Instantiated new `HomeDB`
    pub fn new(db: DB, home_name: String) -> Self {
        Self(TypedDB::new(db, home_name))
    }

    /// Store encodable value
    pub fn store_encodable<V: Encode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
        value: &V,
    ) -> Result<(), DbError> {
        self.0.store_encodable(prefix, key, value)
    }

    /// Retrieve decodable value
    pub fn retrieve_decodable<V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
    ) -> Result<Option<V>, DbError> {
        self.0.retrieve_decodable(prefix, key)
    }

    /// Store encodable kv pair
    pub fn store_keyed_encodable<K: Encode, V: Encode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
        value: &V,
    ) -> Result<(), DbError> {
        self.0.store_encodable(prefix, key.to_vec(), value)
    }

    /// Retrieve decodable value given encodable key
    pub fn retrieve_keyed_decodable<K: Encode, V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
    ) -> Result<Option<V>, DbError> {
        self.0.retrieve_decodable(prefix, key.to_vec())
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
    fn store_leaf(
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

        // If there is no latest root, or if this update is on the latest root
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
        PrefixIterator::new(self.0.db().prefix_iterator(LEAF_IDX), LEAF_IDX.as_ref())
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
