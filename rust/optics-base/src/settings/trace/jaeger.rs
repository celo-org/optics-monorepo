use opentelemetry::{sdk::trace::Tracer, trace::TraceError};
use opentelemetry_jaeger::PipelineBuilder;
use tracing::Subscriber;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::registry::LookupSpan;

/// Config parameters for collection via Jaeger
#[derive(Debug, Clone, Copy, serde::Deserialize)]
pub struct JaegerConfig {
    // TODO
}

impl JaegerConfig {
    /// Convert into a tracer, consuming self
    pub fn try_into_tracer(self) -> Result<Tracer, TraceError> {
        let pipeline: PipelineBuilder = self.into();
        pipeline.install_simple()
    }

    /// Convert into an `OpenTelemetryLayer` for use with `tracing` Subscribers
    pub fn try_into_telemetry_layer<S>(self) -> Result<OpenTelemetryLayer<S, Tracer>, TraceError>
    where
        S: Subscriber + for<'a> LookupSpan<'a>,
    {
        let tracer = self.try_into_tracer()?;
        let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
        Ok(telemetry)
    }
}

impl From<JaegerConfig> for PipelineBuilder {
    fn from(_: JaegerConfig) -> Self {
        todo!()
    }
}
