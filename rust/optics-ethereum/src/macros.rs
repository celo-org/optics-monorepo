/// Dispatches a transaction, logs the tx id, and returns the result
#[macro_export]
macro_rules! report_tx {
    ($tx:expr) => {{
        tracing::info!("Dispatching call to {:?}", $tx.tx.to());
        tracing::trace!("Call data {:?}", $tx.tx.data());
        tracing::trace!("Call from {:?}", $tx.tx.from());
        tracing::trace!("Call nonce {:?}", $tx.tx.nonce());
        let dispatch_fut = $tx.send();
        let dispatched = dispatch_fut.await?;

        let tx_hash: ethers::core::types::H256 = *dispatched;

        tracing::info!("Dispatched tx with tx_hash {:?}", tx_hash);

        let result = dispatched
            .await?
            .ok_or_else(|| optics_core::traits::ChainCommunicationError::DroppedError(tx_hash))?;

        tracing::info!(
            "confirmed transaction with tx_hash {:?}",
            result.transaction_hash
        );
        result
    }};
}
