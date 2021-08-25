use color_eyre::Result;
use opentelemetry_otlp::WithExportConfig;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::{filter::LevelFilter, prelude::*};

use crate::settings::trace::fmt::Style;

/// Configure a `tracing_subscriber::fmt` Layer outputting to stdout
pub mod fmt;

use self::fmt::LogOutputLayer;

/// Logging level
#[derive(Debug, Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Level {
    /// Off
    Off,
    /// Error
    Error,
    /// Warn
    Warn,
    /// Debug
    Debug,
    /// Trace
    Trace,
    /// Info
    #[serde(other)]
    Info,
}

impl Level {
    fn to_filter(self) -> LevelFilter {
        self.into()
    }
}

impl Default for Level {
    fn default() -> Self {
        Level::Info
    }
}

impl From<Level> for LevelFilter {
    fn from(level: Level) -> LevelFilter {
        match level {
            Level::Off => LevelFilter::OFF,
            Level::Error => LevelFilter::ERROR,
            Level::Warn => LevelFilter::WARN,
            Level::Debug => LevelFilter::DEBUG,
            Level::Trace => LevelFilter::TRACE,
            Level::Info => LevelFilter::INFO,
        }
    }
}

/// Configuration for the tracing subscribers used by Optics agents
#[derive(Debug, Clone, serde::Deserialize)]
pub struct TracingConfig {
    otlp_endpoint: Option<String>,
    #[serde(default)]
    fmt: Style,
    #[serde(default)]
    level: Level,
}

impl TracingConfig {
    /// Attempt to instantiate and register a tracing subscriber setup from settings.
    pub fn start_tracing(&self) -> Result<()> {
        let fmt_layer: LogOutputLayer<_> = self.fmt.into();
        let err_layer = tracing_error::ErrorLayer::default();

        let subscriber = tracing_subscriber::Registry::default()
            .with(self.level.to_filter())
            .with(fmt_layer)
            .with(err_layer);

        match self.otlp_endpoint {
            None => subscriber.try_init()?,
            Some(ref uri) => {
                let tracer = opentelemetry_otlp::new_pipeline()
                    .tracing()
                    .with_exporter(
                        opentelemetry_otlp::new_exporter()
                            .tonic()
                            .with_endpoint(uri)
                            .with_timeout(std::time::Duration::from_secs(3)),
                    )
                    .install_batch(opentelemetry::runtime::Tokio)?;

                let telemetry: OpenTelemetryLayer<_, _> =
                    tracing_opentelemetry::layer().with_tracer(tracer);

                subscriber.with(telemetry).try_init()?
            }
        }

        Ok(())
    }
}
