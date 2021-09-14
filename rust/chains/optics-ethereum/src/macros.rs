/// Dispatches a transaction, logs the tx id, and returns the result
#[macro_export]
macro_rules! report_tx {
    // FIXME: the code is soup, make this into a method somewhere.
    // it can't be Common, because xapp module doesn't use it
    ($self:ident, $tx:expr) => {{
        if let Some(metric) = $crate::TX_METRICS.get() {
            // TODO(before merge): certify that `NameOrAddress` Display formatting is appropriate for automated usage
            metric.with_label_values(&[&$self.for_agent, &$self.name, &$tx.tx.to().map_or_else(String::default, |x| format!("{:?}", x))]).inc()
        }

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
