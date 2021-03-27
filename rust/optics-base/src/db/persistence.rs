use rocksdb::{Error, DB};
use std::ops::Deref;

/// Extension trait for entities using rocksdb persistence
pub trait UsingPersistence<K, V> {
    /// Bytes prefix for db key
    const KEY_PREFIX: &'static [u8];

    /// Converts key into bytes slice
    fn key_to_bytes(key: K) -> Vec<u8>;

    /// Converts value of type `V` into `Vec<u8>`
    fn serialize_value(value: V) -> Vec<u8>;

    /// Converts `Vec<u8>` into value type `V`
    fn deserialize_value(bytes: Vec<u8>) -> V;

    /// Appends constant `PREFIX` to provided `key`
    fn prefix_key(key: K) -> Vec<u8> {
        let mut prefixed_key = Self::KEY_PREFIX.to_owned();
        prefixed_key.extend(&Self::key_to_bytes(key));
        prefixed_key
    }

    /// Stores key-value pair in db
    fn db_put<D: Deref<Target = DB>>(db: &D, key: K, value: V) -> Result<(), Error> {
        db.put(Self::prefix_key(key), Self::serialize_value(value))
    }

    /// Gets value associated with provided key
    fn db_get<D: Deref<Target = DB>>(db: &D, key: K) -> Result<Option<V>, Error> {
        if let Some(bytes) = db.get(Self::prefix_key(key))? {
            Ok(Some(Self::deserialize_value(bytes)))
        } else {
            Ok(None)
        }
    }
}
