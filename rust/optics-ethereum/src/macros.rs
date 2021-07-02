/// Dispatches a transaction, logs the tx id, and returns the result
#[macro_export]
macro_rules! report_tx {
    ($tx:expr) => {{
        tracing::debug!("Dispatching call to {:?}", $tx.tx.to);
        tracing::trace!("Call data {:?}", $tx.tx.data);
        tracing::trace!("Call from {:?}", $tx.tx.from);
        tracing::trace!("Call nonce {:?}", $tx.tx.nonce);
        let dispatch_fut = $tx.send();
        let dispatched = dispatch_fut.await?;
        tracing::debug!("dispatched tx with tx_hash {:?}", *dispatched);
        let result =
            tokio::time::timeout(std::time::Duration::from_secs(600), dispatched).await??;
        tracing::debug!(
            "confirmed transaction with tx_hash {}",
            result.transaction_hash
        );
        result
    }};
}
