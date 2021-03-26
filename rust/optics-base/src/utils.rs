use rocksdb::{Options, DB};

/// Prefix for inserting leaf index key into db
pub const LEAF_DB_PREFIX: &[u8] = "leaf_".as_bytes();

/// Opens db at `db_path` and creates if missing
pub fn open_db(db_path: String) -> DB {
    let mut opts = Options::default();
    opts.create_if_missing(true);
    DB::open(&opts, db_path).expect("Failed to open db path")
}

/// Prefixes index `index` with "leaf_" prefix and returns
/// `Vec<u8>`
pub fn db_key_from_leaf_index(index: usize) -> Vec<u8> {
    let mut key = LEAF_DB_PREFIX.to_owned();
    key.extend(index.to_be_bytes().iter());
    key
}
