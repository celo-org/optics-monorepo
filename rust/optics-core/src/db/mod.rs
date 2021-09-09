use color_eyre::eyre::{Result, WrapErr};
use rocksdb::{Options, DB};
use std::path::Path;
use tracing::info;

/// Shared functionality surrounding use of rocksdb
pub mod persistence;

pub use persistence::UsingPersistence;

/// Opens db at `db_path` and creates if missing
#[tracing::instrument(err)]
pub fn from_path(db_path: &str) -> Result<DB> {
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

    DB::open(&opts, &path).wrap_err(format!(
        "Failed to open db path {}, canonicalized as {:?}",
        db_path, path
    ))
}
