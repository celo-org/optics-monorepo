use color_eyre::eyre::{Result, WrapErr};
use rocksdb::{Options, DB};
use std::path::Path;

/// Shared functionality surrounding use of rocksdb
pub mod persistence;

pub use persistence::UsingPersistence;

/// Opens db at `db_path` and creates if missing
#[tracing::instrument(err)]
pub fn from_path(db_path: &str) -> Result<DB> {
    let path = Path::new(db_path).canonicalize()?;

    let mut opts = Options::default();
    opts.create_if_missing(true);

    DB::open(&opts, &path).wrap_err(format!(
        "Failed to open db path {}, canonicalized as {:?}",
        db_path, path
    ))
}
