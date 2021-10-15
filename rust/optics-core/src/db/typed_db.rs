use crate::db::{DbError, DB};
use crate::{Decode, Encode};
use color_eyre::Result;

/// DB handle for storing data tied to a specific type/entity.
///
/// Key structure: ```<type_prefix>_<additional_prefix(es)>_<key>```
#[derive(Debug, Clone)]
pub struct TypedDB(DB);

impl TypedDB {
    /// Instantiate new `TypedDB`
    pub fn new(db: DB) -> Self {
        Self(db)
    }

    /// Return reference to raw db
    pub fn db(&self) -> &DB {
        &self.0
    }

    fn full_prefix(entity: impl AsRef<[u8]>, prefix: impl AsRef<[u8]>) -> Vec<u8> {
        let mut full_prefix = vec![];
        full_prefix.extend(entity.as_ref());
        full_prefix.extend("_".as_bytes());
        full_prefix.extend(prefix.as_ref());
        full_prefix
    }

    /// Store encodable value
    pub fn store_encodable<V: Encode>(
        &self,
        entity: impl AsRef<[u8]>,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
        value: &V,
    ) -> Result<(), DbError> {
        self.0
            .store_encodable(TypedDB::full_prefix(entity, prefix), key, value)
    }

    /// Retrieve decodable value
    pub fn retrieve_decodable<V: Decode>(
        &self,
        entity: impl AsRef<[u8]>,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
    ) -> Result<Option<V>, DbError> {
        self.0
            .retrieve_decodable(TypedDB::full_prefix(entity, prefix), key)
    }

    /// Store encodable kv pair
    pub fn store_keyed_encodable<K: Encode, V: Encode>(
        &self,
        entity: impl AsRef<[u8]>,
        prefix: impl AsRef<[u8]>,
        key: &K,
        value: &V,
    ) -> Result<(), DbError> {
        self.0
            .store_keyed_encodable(TypedDB::full_prefix(entity, prefix), key, value)
    }

    /// Retrieve decodable value given encodable key
    pub fn retrieve_keyed_decodable<K: Encode, V: Decode>(
        &self,
        entity: impl AsRef<[u8]>,
        prefix: impl AsRef<[u8]>,
        key: &K,
    ) -> Result<Option<V>, DbError> {
        self.0
            .retrieve_keyed_decodable(TypedDB::full_prefix(entity, prefix), key)
    }
}
