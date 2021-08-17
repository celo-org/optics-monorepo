//! Configuration
use ethers::prelude::H256;
use std::collections::HashSet;

use optics_base::decl_settings;

decl_settings!(Processor {
    polling_interval: String,
    allowed: Option<HashSet<H256>>,
    denied: Option<HashSet<H256>>,
});
