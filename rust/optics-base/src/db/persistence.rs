use optics_core::{Decode, Encode};
use rocksdb::{Error, DB};
use std::ops::Deref;

/// Extension trait for entities using rocksdb persistence
pub trait UsingPersistence<K, V>
where
    V: Encode + Decode,
{
    /// Bytes prefix for db key
    const KEY_PREFIX: &'static [u8];

    /// Converts key into bytes slice
    fn key_to_bytes(key: K) -> Vec<u8>;

    /// Appends constant `PREFIX` to provided `key`
    fn prefix_key(key: K) -> Vec<u8> {
        let mut prefixed_key = Self::KEY_PREFIX.to_owned();
        prefixed_key.extend(&Self::key_to_bytes(key));
        prefixed_key
    }

    /// Stores key-value pair in db
    fn db_put<D: Deref<Target = DB>>(db: &D, key: K, value: V) -> Result<(), Error> {
        db.put(Self::prefix_key(key), value.to_vec())
    }

    /// Gets value associated with provided key
    fn db_get<D: Deref<Target = DB>>(db: &D, key: K) -> Result<Option<V>, Error> {
        // Safe to use expect here as we assume that an invalid value means DB corruption
        Ok(db
            .get(Self::prefix_key(key))?
            .map(|v| V::read_from(&mut v.as_slice()).expect("!corrupt")))
    }
}
