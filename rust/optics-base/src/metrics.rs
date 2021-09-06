//! Useful metrics that all agents should track.

use color_eyre::Result;
use prometheus::{Encoder, HistogramOpts, HistogramVec, IntGaugeVec, Opts, Registry};
use std::sync::Arc;
use tokio::task::JoinHandle;

#[derive(Debug)]
/// Metrics for a particular domain
pub struct CoreMetrics {
    agent_name: String,
    blockheight: Box<IntGaugeVec>,
    transactions: Box<IntGaugeVec>,
    wallet_balance: Box<IntGaugeVec>,
    rpc_latencies: Box<HistogramVec>,
    listen_port: Option<u16>,
    /// Metrics registry for adding new metrics and gathering reports
    registry: Arc<Registry>,
}

impl CoreMetrics {
    /// Track metrics for a particular agent name.
    pub fn new<S: Into<String>>(
        for_agent: S,
        listen_port: Option<u16>,
        registry: Arc<Registry>,
    ) -> prometheus::Result<CoreMetrics> {
        let metrics = CoreMetrics {
            agent_name: for_agent.into(),
            blockheight: Box::new(IntGaugeVec::new(
                Opts::new(
                    "blockheight_max",
                    "Height of the most recently observed block",
                )
                .namespace("optics")
                .const_label("VERSION", env!("CARGO_PKG_VERSION")),
                &["chain", "agent"],
            )?),
            transactions: Box::new(IntGaugeVec::new(
                Opts::new(
                    "transactions_total",
                    "Number of transactions sent by this agent since boot",
                )
                .namespace("optics")
                .const_label("VERSION", env!("CARGO_PKG_VERSION")),
                &["chain", "wallet", "agent"],
            )?),
            wallet_balance: Box::new(IntGaugeVec::new(
                Opts::new(
                    "wallet_balance_total",
                    "Balance of the smart contract wallet",
                )
                .namespace("optics")
                .const_label("VERSION", env!("CARGO_PKG_VERSION")),
                &["chain", "wallet", "agent"],
            )?),
            rpc_latencies: Box::new(HistogramVec::new(
                HistogramOpts::new(
                    "rpc_duration_ms",
                    "Duration from dispatch to receipt-of-response for RPC calls",
                )
                .namespace("optics")
                .const_label("VERSION", env!("CARGO_PKG_VERSION")),
                &["chain", "method", "agent"],
            )?),
            registry,
            listen_port,
        };

        // TODO: only register these if they aren't already registered?

        metrics.registry.register(metrics.blockheight.clone())?;
        metrics.registry.register(metrics.transactions.clone())?;
        metrics.registry.register(metrics.wallet_balance.clone())?;
        metrics.registry.register(metrics.rpc_latencies.clone())?;

        Ok(metrics)
    }

    /// Register an int gauge.
    ///
    /// If this metric is per-replica, use `new_replica_int_gauge`
    pub fn new_int_gauge(&self, metric_name: &str, help: &str) -> Result<prometheus::IntGauge> {
        let gauge = prometheus::IntGauge::new(metric_name, help)
            .expect("metric description failed validation");

        self.registry.register(Box::new(gauge.clone()))?;

        Ok(gauge)
    }

    /// Register an int gauge for a specific replica.
    ///
    /// The name will be prefixed with the replica name to avoid accidental
    /// duplication
    pub fn new_replica_int_gauge(
        &self,
        replica_name: &str,
        metric_name: &str,
        help: &str,
    ) -> Result<prometheus::IntGauge> {
        self.new_int_gauge(&format!("{}_{}", replica_name, metric_name), help)
    }

    /// Register an int counter.
    ///
    /// If this metric is per-replica, use `new_replica_int_counter`
    pub fn new_int_counter(&self, metric_name: &str, help: &str) -> Result<prometheus::IntCounter> {
        let gauge = prometheus::IntCounter::new(metric_name, help)
            .expect("metric description failed validation");

        self.registry.register(Box::new(gauge.clone()))?;

        Ok(gauge)
    }

    /// Register an int counter for a specific replica.
    ///
    /// The name will be prefixed with the replica name to avoid accidental
    /// duplication
    pub fn new_replica_int_counter(
        &self,
        replica_name: &str,
        metric_name: &str,
        help: &str,
    ) -> Result<prometheus::IntCounter> {
        self.new_int_counter(&format!("{}_{}", replica_name, metric_name), help)
    }

    /// Call with the new balance when gas is spent.
    pub fn wallet_balance_changed(
        &self,
        chain: &str,
        address: ethers::types::Address,
        current_balance: ethers::types::U256,
    ) {
        self.wallet_balance
            .with_label_values(&[chain, &format!("{:x}", address), &self.agent_name])
            .set(current_balance.as_u64() as i64) // XXX: truncated data
    }

    /// Call with the height when a new block is observed.
    pub fn observed_block(&self, chain: &str, height: u64) {
        self.blockheight
            .with_label_values(&[chain, &self.agent_name])
            .set(height as i64) // XXX: truncated data
    }

    /// Call with RPC duration after it is complete
    pub fn rpc_complete(&self, chain: &str, method: &str, duration_ms: f64) {
        self.rpc_latencies
            .with_label_values(&[chain, method, &self.agent_name])
            .observe(duration_ms)
    }

    /// Gather available metrics into an encoded (plaintext, OpenMetrics format) report.
    pub fn gather(&self) -> prometheus::Result<Vec<u8>> {
        let collected_metrics = self.registry.gather();
        let mut out_buf = Vec::with_capacity(1024 * 64);
        let encoder = prometheus::TextEncoder::new();
        encoder.encode(&collected_metrics, &mut out_buf)?;
        Ok(out_buf)
    }

    /// Run an HTTP server serving OpenMetrics format reports on `/metrics`
    ///
    /// This is compatible with Prometheus, which ought to be configured to scrape me!
    pub fn run_http_server(self: Arc<CoreMetrics>) -> JoinHandle<()> {
        use warp::Filter;
        match self.listen_port {
            None => {
                tracing::info!("not starting prometheus server");
                tokio::spawn(std::future::ready(()))
            }
            Some(port) => {
                tracing::info!(
                    port,
                    "starting prometheus server on 0.0.0.0:{port}",
                    port = port
                );
                tokio::spawn(async move {
                    warp::serve(warp::path!("metrics").map(move || {
                        warp::reply::with_header(
                            self.gather().expect("failed to encode metrics"),
                            "Content-Type",
                            // OpenMetrics specs demands "application/openmetrics-text; version=1.0.0; charset=utf-8"
                            // but the prometheus scraper itself doesn't seem to care?
                            // try text/plain to make web browsers happy.
                            "text/plain; charset=utf-8",
                        )
                    }))
                    .run(([0, 0, 0, 0], port))
                    .await;
                })
            }
        }
    }
}
