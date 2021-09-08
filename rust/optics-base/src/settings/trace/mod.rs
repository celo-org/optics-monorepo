use color_eyre::Result;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::{filter::LevelFilter, prelude::*};

use crate::settings::trace::fmt::Style;

/// Configure a `tracing_subscriber::fmt` Layer outputting to stdout
pub mod fmt;

use self::{jaeger::JaegerConfig, zipkin::ZipkinConfig};

/// Configure a Layer using `tracing_opentelemtry` + `opentelemetry-jaeger`
pub mod jaeger;

/// Configure a Layer using `tracing_opentelemtry` + `opentelemetry-zipkin`
pub mod zipkin;

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

impl Default for Level {
    fn default() -> Self {
        Level::Info
    }
}

/// Configuration for the tracing subscribers used by Optics agents
#[derive(Debug, Clone, serde::Deserialize)]
pub struct TracingConfig {
    jaeger: Option<JaegerConfig>,
    zipkin: Option<ZipkinConfig>,
    #[serde(default)]
    fmt: Style,
    #[serde(default)]
    level: Level,
}

impl TracingConfig {
    /// Attempt to instantiate and register a tracing subscriber setup from settings.
    pub fn start_tracing(&self) -> Result<()> {
        let err_layer = tracing_error::ErrorLayer::default();

        let subscriber = tracing_subscriber::registry()
            .with(LevelFilter::from(self.level))
            .with(err_layer)
            .with(self.fmt.layer());

        match self.jaeger {
            None => match self.zipkin {
                None => subscriber.try_init()?,
                Some(ref zipkin) => {
                    let layer: OpenTelemetryLayer<_, _> = zipkin.try_into_layer()?;
                    subscriber.with(layer).try_init()?
                }
            },
            Some(ref jaeger) => {
                let layer: OpenTelemetryLayer<_, _> = jaeger.try_into_layer()?;
                subscriber.with(layer).try_init()?
            }
        }

        Ok(())
    }
}
