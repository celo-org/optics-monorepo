use futures_util::FutureExt;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use rocksdb::{Options, DB};
use std::future::Future;
use std::panic;

pub fn setup_db(db_path: String) -> DB {
    let mut opts = Options::default();
    opts.create_if_missing(true);
    DB::open(&opts, db_path).expect("Failed to open db path")
}

pub async fn run_test_db<T, Fut>(test: T)
where
    T: FnOnce(DB) -> Fut + panic::UnwindSafe,
    Fut: Future<Output = ()>,
{
    // RocksDB only allows one unique db handle to be open at a time. Because
    // `cargo test` is multithreaded by default, we use random db pathnames to
    // avoid collisions between 2+ threads
    let rand_path: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(8)
        .map(char::from)
        .collect();

    let db = setup_db(rand_path.clone());

    let func = panic::AssertUnwindSafe(async { test(db).await });
    let result = func.catch_unwind().await;

    let _ = DB::destroy(&Options::default(), rand_path);

    assert!(result.is_ok())
}
