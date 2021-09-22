//! Configuration
use ethers::prelude::H256;
use serde::Deserialize;
use std::collections::HashSet;

use optics_base::decl_settings;

#[derive(Debug, Deserialize, Clone)]
pub struct S3Config {
    pub bucket: String,
    pub region: String,
}

decl_settings!(Processor {
    /// The polling interval (in seconds)
    interval: String,
    /// An allow list of message senders
    allowed: Option<HashSet<H256>>,
    /// A deny list of message senders
    denied: Option<HashSet<H256>>,
    /// Only index transactions if this key is set
    indexon: Option<String>,
    /// An amazon aws s3 bucket to push proofs to
    s3: Option<S3Config>,
});
