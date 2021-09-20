use color_eyre::eyre::WrapErr;
use rocksdb::{DBIterator, Options, DB as Rocks};
use std::{path::Path, sync::Arc};
use tracing::info;

/// Shared functionality surrounding use of rocksdb
pub mod iterator;

/// Type-specific db operations
mod typed_db;
pub use typed_db::*;

/// DB operations tied to specific home
mod home_db;
pub use home_db::*;

use crate::{Decode, Encode, OpticsError};

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
pub enum DbError {
    /// Rocks DB Error
    #[error("{0}")]
    RockError(#[from] rocksdb::Error),
    /// Optics Error
    #[error("{0}")]
    OpticsError(#[from] OpticsError),
}

type Result<T> = std::result::Result<T, DbError>;

impl DB {
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
    pub fn retrieve_keyed_decodable<K: Encode, V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
    ) -> Result<Option<V>> {
        self.retrieve_decodable(prefix, key.to_vec())
    }

    /// Get prefix db iterator for `prefix`
    pub fn prefix_iterator(&self, prefix: impl AsRef<[u8]>) -> DBIterator {
        self.0.prefix_iterator(prefix)
    }
}
