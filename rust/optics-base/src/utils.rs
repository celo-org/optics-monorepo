use rocksdb::{Options, DB};

/// Opens db at `db_path` and creates if missing
pub fn open_db(db_path: String) -> DB {
    let mut opts = Options::default();
    opts.create_if_missing(true);
    DB::open(&opts, db_path).expect("Failed to open db path")
}
