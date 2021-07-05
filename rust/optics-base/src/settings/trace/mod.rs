use color_eyre::Result;
use tracing_error;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::{prelude::*, Registry};

use crate::settings::trace::fmt::Style;

/// Manage a `tracing_subscriber::fmt` Layer outputting to stdout
pub mod fmt;

use fmt::FmtConfig;

use self::jaeger::JaegerConfig;

/// Manage a Layer using `tracing_opentelemtry` + `opentelemetry-jaeger`
pub mod jaeger;

/// Configuration for the tracing subscribers used by Optics agents
#[derive(Debug, Copy, Clone, serde::Deserialize)]
pub struct TracingConfig {
    fmt: Option<FmtConfig>,
    jaeger: Option<JaegerConfig>,
}

impl TracingConfig {
    /// Attempt to instantiate a register a tracing subscriber setup from settings.
    pub fn try_init_tracing(&self) -> Result<()> {
        // this is all ugly
        let subscriber = tracing_subscriber::Registry::default();

        let err_layer = tracing_error::ErrorLayer::default();
        if let Some(jaeger) = self.jaeger {
            let tracer = jaeger.into_tracer()?;
            let telemetry: OpenTelemetryLayer<Registry, _> =
                tracing_opentelemetry::layer().with_tracer(tracer);
            err_layer.and_then(telemetry);
        }

        if let Some(fmt) = self.fmt {
            // ugly
            let fmt_layer = tracing_subscriber::fmt::layer();
            match fmt.style {
                Style::Pretty => {
                    subscriber.with(fmt_layer.pretty()).try_init()?;
                }
                Style::Json => {
                    subscriber.with(fmt_layer.json()).try_init()?;
                }
                Style::Compact => {
                    subscriber.with(fmt_layer.compact()).try_init()?;
                }
                Style::Default => {
                    subscriber.with(fmt_layer).try_init()?;
                }
            }
        }

        Ok(())
    }
}
