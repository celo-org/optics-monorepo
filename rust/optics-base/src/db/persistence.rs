use optics_core::{Decode, Encode};
use rocksdb::{DBIterator, Error, DB};
use std::{marker::PhantomData, ops::Deref};

/// An iterator over a prefix that deserializes values
pub struct PrefixIterator<'a, V>(DBIterator<'a>, PhantomData<*const V>);

impl<'a, V> From<DBIterator<'a>> for PrefixIterator<'a, V> {
    fn from(i: DBIterator<'a>) -> Self {
        Self(i, PhantomData)
    }
}

impl<'a, V> Iterator for PrefixIterator<'a, V>
where
    V: Encode + Decode,
{
    type Item = V;

    fn next(&mut self) -> Option<Self::Item> {
        self.0
            .next()
            .map(|(_k, v)| v.to_vec())
            .map(|v| V::read_from(&mut v.as_slice()).expect("!corrupt"))
    }
}

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

    /// Get an iterator over values
    ///
    /// Note that if the DB is corrupt and deserialization fails, this will
    /// panic.
    fn iterator<'a, D: Deref<Target = DB>>(&self, db: &'a D) -> PrefixIterator<'a, V> {
        db.prefix_iterator(Self::KEY_PREFIX).into()
    }

    /// Stores key-value pair in db
    fn db_put<D: Deref<Target = DB>>(db: &D, key: K, value: V) -> Result<(), Error> {
        db.put(Self::prefix_key(key), value.to_vec())
    }

    /// Gets value associated with provided key
    ///
    /// Note that if the DB is corrupt and deserialization fails, this will
    /// panic.
    fn db_get<D: Deref<Target = DB>>(db: &D, key: K) -> Result<Option<V>, Error> {
        // Safe to use expect here as we assume that an invalid value means DB corruption
        Ok(db
            .get(Self::prefix_key(key))?
            .map(|v| V::read_from(&mut v.as_slice()).expect("!corrupt")))
    }
}
