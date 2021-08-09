use opentelemetry::{
    sdk::trace::{IdGenerator, Tracer},
    trace::TraceError,
};
use opentelemetry_jaeger::PipelineBuilder;
use tracing::Subscriber;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::registry::LookupSpan;

/// Jaeger collector auth configuration
#[derive(Debug, Clone, serde::Deserialize)]
pub struct CollectorAuth {
    username: String,
    password: String,
}

/// Config parameters for Jaeger collector
#[derive(Debug, Clone, serde::Deserialize)]
pub struct JaegerCollector {
    uri: String,
    #[serde(flatten)]
    auth: Option<CollectorAuth>,
}

/// Config parameters for collection via Jaeger
#[derive(Debug, Clone, serde::Deserialize)]
pub struct JaegerConfig {
    collector: JaegerCollector,
    name: String,
}

impl JaegerConfig {
    fn builder(self: &JaegerConfig) -> PipelineBuilder {
        let builder = PipelineBuilder::default()
            .with_service_name(&self.name)
            .with_collector_endpoint(&self.collector.uri)
            .with_trace_config(
                opentelemetry::sdk::trace::config().with_id_generator(IdGenerator::default()),
            );

        if let Some(ref auth) = self.collector.auth {
            builder
                .with_collector_username(&auth.username)
                .with_collector_password(&auth.password)
        } else {
            builder
        }
    }

    fn try_into_tracer(self: &JaegerConfig) -> Result<Tracer, TraceError> {
        self.builder().install_batch(opentelemetry::runtime::Tokio)
    }

    pub(crate) fn try_into_layer<S: Subscriber + for<'a> LookupSpan<'a>>(
        self: &JaegerConfig,
    ) -> Result<OpenTelemetryLayer<S, Tracer>, TraceError> {
        Ok(tracing_opentelemetry::layer().with_tracer(self.try_into_tracer()?))
    }
}
