use color_eyre::Result;
use tracing_error;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::{prelude::*, Registry};

use crate::settings::trace::fmt::Style;

/// Manage a `tracing_subscriber::fmt` Layer outputting to stdout
pub mod fmt;

use self::{fmt::LogOutputLayer, jaeger::JaegerConfig};

/// Manage a Layer using `tracing_opentelemtry` + `opentelemetry-jaeger`
pub mod jaeger;

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

impl Default for Level {
    fn default() -> Self {
        Level::Info
    }
}

impl From<Level> for tracing_subscriber::filter::LevelFilter {
    fn from(level: Level) -> tracing_subscriber::filter::LevelFilter {
        match level {
            Level::Off => tracing_subscriber::filter::LevelFilter::OFF,
            Level::Error => tracing_subscriber::filter::LevelFilter::ERROR,
            Level::Warn => tracing_subscriber::filter::LevelFilter::WARN,
            Level::Debug => tracing_subscriber::filter::LevelFilter::DEBUG,
            Level::Trace => tracing_subscriber::filter::LevelFilter::TRACE,
            Level::Info => tracing_subscriber::filter::LevelFilter::INFO,
        }
    }
}

/// Configuration for the tracing subscribers used by Optics agents
#[derive(Debug, Copy, Clone, serde::Deserialize)]
pub struct TracingConfig {
    #[serde(default)]
    fmt: Style,
    jaeger: Option<JaegerConfig>,
}

impl TracingConfig {
    /// Attempt to instantiate a register a tracing subscriber setup from settings.
    pub fn try_init_tracing(&self) -> Result<()> {
        let fmt_layer: LogOutputLayer<Registry> = self.fmt.into();
        let err_layer = tracing_error::ErrorLayer::default();

        let subscriber = tracing_subscriber::Registry::default()
            .with(fmt_layer)
            .with(err_layer);

        match self.jaeger {
            None => subscriber.try_init()?,
            Some(jaeger) => {
                let tracer = jaeger.into_tracer()?;
                let telemetry: OpenTelemetryLayer<_, _> =
                    tracing_opentelemetry::layer().with_tracer(tracer);
                subscriber.with(telemetry).try_init()?;
            }
        }

        Ok(())
    }
}
