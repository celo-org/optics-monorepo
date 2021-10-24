#![allow(missing_docs)]

use color_eyre::eyre::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Address(pub bytes::Bytes);

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Balance(pub num::BigInt);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractLocator {
    pub name: String,
    pub domain: u32,
    pub address: Address,
}
impl std::fmt::Display for ContractLocator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}[@{}]+contract:0x{:x}",
            self.name, self.domain, self.address.0
        )
    }
}

#[async_trait::async_trait]
pub trait Chain {
    /// Query the balance on a chain
    async fn query_balance(&self, addr: Address) -> Result<Balance>;
}

impl From<Address> for ethers::types::H160 {
    fn from(addr: Address) -> Self {
        ethers::types::H160::from_slice(addr.0.as_ref())
    }
}

impl From<ethers::types::H160> for Address {
    fn from(addr: ethers::types::H160) -> Self {
        Address(bytes::Bytes::from(addr.as_bytes().to_owned()))
    }
}

impl From<&'_ Address> for ethers::types::H160 {
    fn from(addr: &Address) -> Self {
        ethers::types::H160::from_slice(addr.0.as_ref())
    }
}
