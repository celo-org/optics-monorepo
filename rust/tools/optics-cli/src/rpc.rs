use std::convert::TryFrom;

use ethers::prelude::{Http, Provider};

fn domain_to_env(domain: u32) -> Option<&'static str> {
    match domain {
        6648936 => Some("OPT_BASE_REPLICAS_ETHEREUM_CONNECTION_URL"),
        1667591279 => Some("OPT_BASE_REPLICAS_CELO_CONNECTION_URL"),
        1886350457 => Some("OPT_BASE_REPLICAS_POLYGON_CONNECTION_URL"),
        _ => None,
    }
}

pub(crate) fn fetch_rpc_connection(domain: u32) -> Option<Provider<Http>> {
    std::env::var(domain_to_env(domain)?)
        .map(|rpc| TryFrom::try_from(rpc).expect("Invalid RPC url"))
        .ok()
}
