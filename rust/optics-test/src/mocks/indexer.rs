#![allow(non_snake_case)]

use async_trait::async_trait;
use color_eyre::Result;
use mockall::*;

use optics_core::*;

mock! {
    pub Indexer {
        pub fn _get_block_number(&self) -> Result<u32> {}

        pub fn _fetch_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {}

        pub fn _fetch_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {}
    }
}

impl std::fmt::Debug for MockIndexer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MockIndexer")
    }
}

#[async_trait]
impl Indexer for MockIndexer {
    async fn get_block_number(&self) -> Result<u32> {
        self._get_block_number()
    }

    async fn fetch_updates(&self, from: u32, to: u32) -> Result<Vec<SignedUpdateWithMeta>> {
        self._fetch_updates(from, to)
    }

    async fn fetch_messages(&self, from: u32, to: u32) -> Result<Vec<RawCommittedMessage>> {
        self._fetch_messages(from, to)
    }
}
