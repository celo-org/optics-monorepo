use crate::{Decode, Encode};
use rocksdb::DBIterator;
use std::marker::PhantomData;

/// An iterator over a prefix that deserializes values
pub struct PrefixIterator<'a, V> {
    iter: DBIterator<'a>,
    prefix: &'a [u8],
    _phantom: PhantomData<*const V>,
}

impl<'a, V> PrefixIterator<'a, V> {
    /// Return new prefix iterator
    pub fn new(iter: DBIterator<'a>, prefix: &'a [u8]) -> Self {
        Self {
            iter,
            prefix,
            _phantom: PhantomData,
        }
    }
}

impl<'a, V> Iterator for PrefixIterator<'a, V>
where
    V: Encode + Decode,
{
    type Item = V;

    fn next(&mut self) -> Option<Self::Item> {
        let prefix = self.prefix;
        self.iter
            .find(|(k, _)| k.strip_prefix(prefix).is_some())
            .map(|(_, v)| v.to_vec())
            .map(|v| V::read_from(&mut v.as_slice()).expect("!corrupt"))
    }
}
