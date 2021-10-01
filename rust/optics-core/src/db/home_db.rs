use crate::db::{DbError, TypedDB, DB};
use crate::UpdateMeta;
use crate::{
    accumulator::merkle::Proof, traits::RawCommittedMessage, utils, Decode, Encode, OpticsMessage,
    SignedUpdate,
};
use color_eyre::Result;
use ethers::core::types::H256;
use tokio::time::sleep;
use tracing::{debug, warn};

use std::future::Future;
use std::time::Duration;

use crate::db::iterator::PrefixIterator;

static LEAF_IDX: &str = "leaf_index_";
static LEAF: &str = "leaf_";
static PREV_ROOT: &str = "update_prev_root_";
static PROOF: &str = "proof_";
static MESSAGE: &str = "message_";
static UPDATE: &str = "update_";
static UPDATE_META: &str = "update_metadata_";
static LATEST_ROOT: &str = "update_latest_root_";
static LATEST_NONCE: &str = "latest_nonce_";
static LATEST_LEAF_INDEX: &str = "latest_known_leaf_index_";

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
    ///
    /// Keys --> Values:
    /// - `destination_and_nonce` --> `leaf`
    /// - `leaf_index` --> `leaf`
    /// - `leaf` --> `message`
    pub fn store_raw_committed_message(&self, message: &RawCommittedMessage) -> Result<()> {
        let parsed = OpticsMessage::read_from(&mut message.message.clone().as_slice())?;

        let destination_and_nonce = parsed.destination_and_nonce();

        let leaf = message.leaf();

        debug!(
            leaf = ?leaf,
            destination_and_nonce,
            destination = parsed.destination,
            nonce = parsed.nonce,
            leaf_index = message.leaf_index,
            "storing raw committed message in db"
        );
        self.store_leaf(message.leaf_index, destination_and_nonce, leaf)?;
        self.store_keyed_encodable(MESSAGE, &leaf, message)?;
        Ok(())
    }

    /// Store the latest known leaf_index
    ///
    /// Key --> value: `LATEST_LEAF_INDEX` --> `leaf_index`
    pub fn update_latest_leaf_index(&self, leaf_index: u32) -> Result<(), DbError> {
        if let Ok(Some(idx)) = self.retrieve_latest_leaf_index() {
            if leaf_index <= idx {
                return Ok(());
            }
        }
        self.store_encodable("", LATEST_LEAF_INDEX, &leaf_index)
    }

    /// Retrieve the highest known leaf_index
    pub fn retrieve_latest_leaf_index(&self) -> Result<Option<u32>, DbError> {
        self.retrieve_decodable("", LATEST_LEAF_INDEX)
    }

    /// Store the leaf keyed by leaf_index
    fn store_leaf(
        &self,
        leaf_index: u32,
        destination_and_nonce: u64,
        leaf: H256,
    ) -> Result<(), DbError> {
        debug!(
            leaf_index,
            leaf = ?leaf,
            "storing leaf hash keyed by index and dest+nonce"
        );
        self.store_keyed_encodable(LEAF, &destination_and_nonce, &leaf)?;
        self.store_keyed_encodable(LEAF, &leaf_index, &leaf)?;
        self.update_latest_leaf_index(leaf_index)
    }

    /// Retrieve a raw committed message by its leaf hash
    pub fn message_by_leaf(&self, leaf: H256) -> Result<Option<RawCommittedMessage>, DbError> {
        self.retrieve_keyed_decodable(MESSAGE, &leaf)
    }

    /// Retrieve the leaf hash keyed by leaf index
    pub fn leaf_by_leaf_index(&self, leaf_index: u32) -> Result<Option<H256>, DbError> {
        self.retrieve_keyed_decodable(LEAF, &leaf_index)
    }

    /// Retrieve the leaf hash keyed by destination and nonce
    pub fn leaf_by_nonce(&self, destination: u32, nonce: u32) -> Result<Option<H256>, DbError> {
        let dest_and_nonce = utils::destination_and_nonce(destination, nonce);
        self.retrieve_keyed_decodable(LEAF, &dest_and_nonce)
    }

    /// Retrieve a raw committed message by its leaf hash
    pub fn message_by_nonce(
        &self,
        destination: u32,
        nonce: u32,
    ) -> Result<Option<RawCommittedMessage>, DbError> {
        let leaf = self.leaf_by_nonce(destination, nonce)?;
        match leaf {
            None => Ok(None),
            Some(leaf) => self.message_by_leaf(leaf),
        }
    }

    /// Retrieve a raw committed message by its leaf index
    pub fn message_by_leaf_index(
        &self,
        index: u32,
    ) -> Result<Option<RawCommittedMessage>, DbError> {
        let leaf: Option<H256> = self.leaf_by_leaf_index(index)?;
        match leaf {
            None => Ok(None),
            Some(leaf) => self.message_by_leaf(leaf),
        }
    }

    /// Stores the latest inspected nonce for a given replica domain
    ///
    /// Keys --> Values:
    /// - `replica_domain` --> `nonce`
    pub fn store_latest_nonce(&self, replica_domain: u32, nonce: u32) -> Result<(), DbError> {
        self.store_keyed_encodable(LATEST_NONCE, &replica_domain, &nonce)?;

        Ok(())
    }

    /// Retrieves the latest inspected nonce for a given replica domain
    pub fn retrieve_latest_nonce(&self, replica_domain: u32) -> Result<Option<u32>, DbError> {
        self.retrieve_keyed_decodable(LATEST_NONCE, &replica_domain)
    }

    /// Retrieve the latest committed
    pub fn retrieve_latest_root(&self) -> Result<Option<H256>, DbError> {
        self.retrieve_decodable("", LATEST_ROOT)
    }

    fn store_latest_root(&self, root: H256) -> Result<(), DbError> {
        debug!(root = ?root, "storing new latest root in DB");
        self.store_encodable("", LATEST_ROOT, &root)
    }

    /// Store update metadata (by update's new root)
    pub fn store_update_metadata(
        &self,
        new_root: H256,
        metadata: UpdateMeta,
    ) -> Result<(), DbError> {
        debug!(new_root = ?new_root, metadata = ?metadata, "storing update metadata in DB");

        self.store_keyed_encodable(UPDATE_META, &new_root, &metadata)
    }

    /// Retrieve update metadata (by update's new root)
    pub fn retrieve_update_metadata(&self, new_root: H256) -> Result<Option<UpdateMeta>, DbError> {
        self.retrieve_keyed_decodable(UPDATE_META, &new_root)
    }

    /// Store a signed update building off latest root
    ///
    /// Keys --> Values:
    /// - `LATEST_ROOT` --> `root`
    /// - `new_root` --> `prev_root`
    /// - `prev_root` --> `update`
    pub fn store_latest_update(&self, update: &SignedUpdate) -> Result<(), DbError> {
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
                } else {
                    warn!(
                        "Attempted to store update not building off latest root: {:?}",
                        update
                    )
                }
            }
            None => self.store_latest_root(update.update.new_root)?,
        }

        self.store_keyed_encodable(UPDATE, &update.update.previous_root, update)?;
        self.store_keyed_encodable(
            PREV_ROOT,
            &update.update.new_root,
            &update.update.previous_root,
        )
    }

    /// Retrieve an update by its previous root
    pub fn update_by_previous_root(
        &self,
        previous_root: H256,
    ) -> Result<Option<SignedUpdate>, DbError> {
        self.retrieve_keyed_decodable(UPDATE, &previous_root)
    }

    /// Retrieve an update by its new root
    pub fn update_by_new_root(&self, new_root: H256) -> Result<Option<SignedUpdate>, DbError> {
        let prev_root: Option<H256> = self.retrieve_keyed_decodable(PREV_ROOT, &new_root)?;

        match prev_root {
            Some(prev_root) => self.update_by_previous_root(prev_root),
            None => Ok(None),
        }
    }

    /// Iterate over all leaves
    pub fn leaf_iterator(&self) -> PrefixIterator<H256> {
        PrefixIterator::new(self.0.db().prefix_iterator(LEAF_IDX), LEAF_IDX.as_ref())
    }

    /// Store a proof by its leaf index
    ///
    /// Keys --> Values:
    /// - `leaf_index` --> `proof`
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
    ) -> impl Future<Output = Result<Option<H256>, DbError>> {
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
