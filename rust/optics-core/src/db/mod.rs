use color_eyre::eyre::WrapErr;
use ethers::types::H256;
use rocksdb::{Options, DB as Rocks};
use std::{path::Path, sync::Arc};
use tracing::info;

/// Shared functionality surrounding use of rocksdb
pub mod persistence;

use crate::{
    accumulator::merkle::Proof, traits::RawCommittedMessage, utils, Decode, Encode, OpticsError,
    OpticsMessage, SignedUpdate,
};

use self::persistence::PrefixIterator;

static DEST: &str = "destination_and_nonce_";
static LEAF_IDX: &str = "leaf_index_";
static LEAF_HASH: &str = "leaf_hash_";
static PREV_ROOT: &str = "update_prev_root_";
static NEW_ROOT: &str = "update_new_root_";
static PROOF: &str = "proof_";

#[derive(Debug, Clone)]
/// A KV Store
pub struct DB(Arc<Rocks>);

impl From<Rocks> for DB {
    fn from(rocks: Rocks) -> Self {
        Self(Arc::new(rocks))
    }
}

/// DB Error type
#[derive(thiserror::Error, Debug)]
pub enum DBError {
    /// Rocks DB Error
    #[error("{0}")]
    RockError(#[from] rocksdb::Error),
    /// Optics Error
    #[error("{0}")]
    OpticsError(#[from] OpticsError),
}

type Result<T> = std::result::Result<T, DBError>;

impl DB {
    /// Store a value in the DB
    fn _store(&self, key: impl AsRef<[u8]>, value: impl AsRef<[u8]>) -> Result<()> {
        Ok(self.0.put(key, value)?)
    }

    /// Retrieve a value from the DB
    fn _retrieve(&self, key: impl AsRef<[u8]>) -> Result<Option<Vec<u8>>> {
        Ok(self.0.get(key)?)
    }

    /// Prefix a key and store in the DB
    fn prefix_store(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
        value: impl AsRef<[u8]>,
    ) -> Result<()> {
        let mut buf = vec![];
        buf.extend(prefix.as_ref());
        buf.extend(key.as_ref());
        self._store(buf, value)
    }

    /// Prefix the key and retrieve
    fn prefix_retrieve(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
    ) -> Result<Option<Vec<u8>>> {
        let mut buf = vec![];
        buf.extend(prefix.as_ref());
        buf.extend(key.as_ref());
        self._retrieve(buf)
    }

    /// Store any encodeable
    pub fn store_encodable<V: Encode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
        value: &V,
    ) -> Result<()> {
        self.prefix_store(prefix, key, value.to_vec())
    }

    /// Retrieve and attempt to decode
    pub fn retrieve_decodable<V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
    ) -> Result<Option<V>> {
        Ok(self
            .prefix_retrieve(prefix, key)?
            .map(|val| V::read_from(&mut val.as_slice()))
            .transpose()?)
    }

    /// Store any encodeable
    pub fn store_keyed_encodable<K: Encode, V: Encode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
        value: &V,
    ) -> Result<()> {
        self.store_encodable(prefix, key.to_vec(), value)
    }

    /// Retrieve any decodable
    pub fn retrive_keyed_decodable<K: Encode, V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
    ) -> Result<Option<V>> {
        self.retrieve_decodable(prefix, key.to_vec())
    }

    /// Store a raw committed message
    pub fn store_raw_committed_message(&self, message: &RawCommittedMessage) -> Result<()> {
        let destination_and_nonce =
            OpticsMessage::read_from(&mut message.message.clone().as_slice())?
                .destination_and_nonce();

        let leaf_hash = message.leaf_hash();

        self.store_keyed_encodable(LEAF_HASH, &leaf_hash, message)?;
        self.store_keyed_encodable(DEST, &destination_and_nonce, &leaf_hash)?;
        self.store_leaf_hash(message.leaf_index, leaf_hash)?;
        Ok(())
    }

    /// Store the leaf_hash keyed by leaf_index
    pub fn store_leaf_hash(&self, leaf_index: u32, leaf_hash: H256) -> Result<()> {
        self.store_keyed_encodable(LEAF_IDX, &leaf_index, &leaf_hash)
    }

    /// Retrieve a raw committed message by its leaf hash
    pub fn message_by_leaf_hash(&self, leaf_hash: H256) -> Result<Option<RawCommittedMessage>> {
        self.retrive_keyed_decodable(LEAF_HASH, &leaf_hash)
    }

    /// Retrieve the leaf hash keyed by leaf index
    pub fn leaf_by_leaf_index(&self, leaf_index: u32) -> Result<Option<H256>> {
        self.retrive_keyed_decodable(LEAF_IDX, &leaf_index)
    }

    /// Retrieve the leaf hash keyed by destination and nonce
    pub fn leaf_by_destination(&self, destination: u32, nonce: u32) -> Result<Option<H256>> {
        let key = utils::destination_and_nonce(destination, nonce);
        self.retrive_keyed_decodable(LEAF_IDX, &key)
    }

    /// Retrieve a raw committed message by its leaf hash
    pub fn message_by_destination(
        &self,
        destination: u32,
        nonce: u32,
    ) -> Result<Option<RawCommittedMessage>> {
        let leaf_hash = self.leaf_by_destination(destination, nonce)?;
        match leaf_hash {
            None => Ok(None),
            Some(leaf_hash) => self.retrive_keyed_decodable(LEAF_HASH, &leaf_hash),
        }
    }

    /// Retrieve a raw committed message by its leaf index
    pub fn message_by_leaf_index(&self, index: u32) -> Result<Option<RawCommittedMessage>> {
        let leaf_hash: Option<H256> = self.retrive_keyed_decodable(LEAF_IDX, &index)?;
        match leaf_hash {
            None => Ok(None),
            Some(leaf_hash) => self.retrive_keyed_decodable(LEAF_HASH, &leaf_hash),
        }
    }

    /// Store a signed update
    pub fn store_update(&self, update: &SignedUpdate) -> Result<()> {
        self.store_keyed_encodable(PREV_ROOT, &update.update.previous_root, update)?;
        self.store_keyed_encodable(
            NEW_ROOT,
            &update.update.new_root,
            &update.update.previous_root,
        )
    }

    /// Retrieve an update by its previous root
    pub fn update_by_previous_root(&self, previous_root: H256) -> Result<Option<SignedUpdate>> {
        self.retrive_keyed_decodable(PREV_ROOT, &previous_root)
    }

    /// Retrieve an update by its new root
    pub fn update_by_new_root(&self, new_root: H256) -> Result<Option<SignedUpdate>> {
        let prev_root: Option<H256> = self.retrive_keyed_decodable(NEW_ROOT, &new_root)?;

        match prev_root {
            Some(prev_root) => self.retrive_keyed_decodable(PREV_ROOT, &prev_root),
            None => Ok(None),
        }
    }

    /// Iterate over all leaves
    pub fn leaf_iterator(&self) -> PrefixIterator<H256> {
        PrefixIterator::new(self.0.prefix_iterator(LEAF_IDX), LEAF_IDX.as_ref())
    }

    /// Store a proof by its leaf index
    pub fn store_proof(&self, leaf_index: u32, proof: &Proof) -> Result<()> {
        self.store_keyed_encodable(PROOF, &leaf_index, proof)
    }

    /// Retrieve a proof by its leaf index
    pub fn proof_by_leaf_index(&self, leaf_index: u32) -> Result<Option<Proof>> {
        self.retrive_keyed_decodable(PROOF, &leaf_index)
    }

    /// Opens db at `db_path` and creates if missing
    #[tracing::instrument(err)]
    pub fn from_path(db_path: &str) -> color_eyre::Result<DB> {
        // Canonicalize ensures existence, so we have to do that, then extend
        let mut path = Path::new(".").canonicalize()?;
        path.extend(&[db_path]);

        match path.is_dir() {
            true => info!(
                "Opening existing db at {path}",
                path = path.to_str().unwrap()
            ),
            false => info!("Creating db at {path}", path = path.to_str().unwrap()),
        }

        let mut opts = Options::default();
        opts.create_if_missing(true);

        Rocks::open(&opts, &path)
            .wrap_err(format!(
                "Failed to open db path {}, canonicalized as {:?}",
                db_path, path
            ))
            .map(Into::into)
    }
}
