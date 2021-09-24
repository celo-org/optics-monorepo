//! Configuration
use ethers::prelude::H256;
use std::collections::HashSet;

use optics_base::decl_settings;

decl_settings!(Processor {
    /// The polling interval (in seconds)
    interval: String,
    /// An allow list of message senders
    allowed: Option<HashSet<H256>>,
    /// A deny list of message senders
    denied: Option<HashSet<H256>>,
    /// Only index transactions if this key is set
    index: Option<String>,
});
