use opentelemetry::{sdk::trace::Tracer, trace::TraceError};
use opentelemetry_zipkin::ZipkinPipelineBuilder;
use tracing::Subscriber;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::registry::LookupSpan;

/// Config parameters for Zipkin collector
#[derive(Debug, Clone, serde::Deserialize)]
pub struct ZipkinCollector {
    uri: String,
}

/// Config parameters for collection via Zipkin
#[derive(Debug, Clone, serde::Deserialize)]
pub struct ZipkinConfig {
    collector: ZipkinCollector,
    name: String,
}
impl ZipkinConfig {
    fn builder(self: &ZipkinConfig) -> ZipkinPipelineBuilder {
        ZipkinPipelineBuilder::default()
            .with_service_name(&self.name)
            .with_collector_endpoint(&self.collector.uri)
    }

    fn try_into_tracer(self: &ZipkinConfig) -> Result<Tracer, TraceError> {
        self.builder().install_batch(opentelemetry::runtime::Tokio)
    }

    pub(crate) fn try_into_layer<S: Subscriber + for<'a> LookupSpan<'a>>(
        self: &ZipkinConfig,
    ) -> Result<OpenTelemetryLayer<S, Tracer>, TraceError> {
        Ok(tracing_opentelemetry::layer().with_tracer(self.try_into_tracer()?))
    }
}
