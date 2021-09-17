/// Dispatches a transaction, logs the tx id, and returns the result
#[macro_export]
macro_rules! report_tx {
    ($tx:expr) => {{

        // "0x..."
        let data = format!("0x{}", hex::encode(&$tx.tx.data().map(|b| b.to_vec()).unwrap_or_default()));

        let to = $tx.tx.to().cloned().unwrap_or_else(|| ethers::types::NameOrAddress::Address(Default::default()));

        tracing::info!(
            to = ?to,
            data = %data,
            "Dispatching transaction"
        );
        let dispatch_fut = $tx.send();
        let dispatched = dispatch_fut.await?;

        let tx_hash: ethers::core::types::H256 = *dispatched;

        tracing::info!(
            to = ?to,
            data = %data,
            tx_hash = ?tx_hash,
            "Dispatched tx with tx_hash {:?}",
            tx_hash
        );

        let result = dispatched
            .await?
            .ok_or_else(|| optics_core::ChainCommunicationError::DroppedError(tx_hash))?;

        tracing::info!(
            "confirmed transaction with tx_hash {:?}",
            result.transaction_hash
        );
        result
    }};
}

macro_rules! contract {
    (@finish $provider:expr, $abi:ident, $signer:ident, $($tail:tt)*) => {{
        if let Some(signer) = $signer {
            // If there's a provided signer, we want to manage every aspect
            // locally

            // First set the chain ID locally
            let provider_chain_id = $provider.get_chainid().await?;
            let signer = ethers::signers::Signer::with_chain_id(signer, provider_chain_id.as_u64());

            // Manage the nonce locally
            let address = ethers::prelude::Signer::address(&signer);
            let provider =
                ethers::middleware::nonce_manager::NonceManagerMiddleware::new($provider, address);

            // Manage signing locally
            let signing_provider = ethers::middleware::SignerMiddleware::new(provider, signer);

            Box::new(crate::$abi::new(signing_provider.into(), $($tail)*))
        } else {
            Box::new(crate::$abi::new($provider, $($tail)*))
        }
    }};
    (@ws $url:expr, $($tail:tt)*) => {{
        let ws = ethers::providers::Ws::connect($url).await?;
        let provider = Arc::new(ethers::providers::Provider::new(ws));
        contract!(@finish provider, $($tail)*)
    }};
    (@http $url:expr, $($tail:tt)*) => {{
        let provider =
            Arc::new(ethers::providers::Provider::<ethers::providers::Http>::try_from($url.as_ref())?);
        contract!(@finish provider, $($tail)*)
    }};
    ($name:ident, $abi:ident, $trait:ident, $($n:ident:$t:ty),*)  => {
        #[doc = "Cast a contract locator to a live contract handle"]
        pub async fn $name(conn: Connection, locator: &ContractLocator, signer: Option<Signers>, $($n:$t),*) -> color_eyre::Result<Box<dyn $trait>> {
            let b: Box<dyn $trait> = match conn {
                Connection::Http { url } => {
                    contract!(@http url, $abi, signer, locator, $($n),*)
                }
                Connection::Ws { url } => {
                    contract!(@ws url, $abi, signer, locator, $($n),*)
                }
            };
            Ok(b)
        }
    };
}
