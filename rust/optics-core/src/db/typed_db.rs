use crate::db::{DbError, DB};
use crate::{Decode, Encode};
use color_eyre::Result;

/// DB handle for storing data tied to a specific type/entity.
///
/// Key structure: ```<type_prefix>_<additional_prefix(es)>_<key>```
#[derive(Debug, Clone)]
pub struct TypedDB {
    entity: String,
    db: DB,
}

impl AsRef<DB> for TypedDB {
    fn as_ref(&self) -> &DB {
        &self.db
    }
}

impl TypedDB {
    /// Instantiate new `TypedDB`
    pub fn new(entity: String, db: DB) -> Self {
        Self { entity, db }
    }

    fn full_prefix(&self, prefix: impl AsRef<[u8]>) -> Vec<u8> {
        let mut full_prefix = vec![];
        full_prefix.extend(self.entity.as_ref() as &[u8]);
        full_prefix.extend("_".as_bytes());
        full_prefix.extend(prefix.as_ref());
        full_prefix
    }

    /// Store encodable value
    pub fn store_encodable<V: Encode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
        value: &V,
    ) -> Result<(), DbError> {
        self.db
            .store_encodable(self.full_prefix(prefix), key, value)
    }

    /// Retrieve decodable value
    pub fn retrieve_decodable<V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: impl AsRef<[u8]>,
    ) -> Result<Option<V>, DbError> {
        self.db.retrieve_decodable(self.full_prefix(prefix), key)
    }

    /// Store encodable kv pair
    pub fn store_keyed_encodable<K: Encode, V: Encode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
        value: &V,
    ) -> Result<(), DbError> {
        self.db
            .store_keyed_encodable(self.full_prefix(prefix), key, value)
    }

    /// Retrieve decodable value given encodable key
    pub fn retrieve_keyed_decodable<K: Encode, V: Decode>(
        &self,
        prefix: impl AsRef<[u8]>,
        key: &K,
    ) -> Result<Option<V>, DbError> {
        self.db
            .retrieve_keyed_decodable(self.full_prefix(prefix), key)
    }
}
