use opentelemetry::{sdk::trace::Tracer, trace::TraceError};
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

/// Config parameters fo

/// Config parameters for collection via Jaeger
#[derive(Debug, Clone, serde::Deserialize)]
pub struct JaegerConfig {
    collector: JaegerCollector,
    name: String,
}

impl JaegerConfig {
    /// Convert into a tracer, consuming self
    pub fn try_into_tracer(&self) -> Result<Tracer, TraceError> {
        let pipeline: PipelineBuilder = self.into();
        pipeline.install_simple()
    }

    /// Convert into an `OpenTelemetryLayer` for use with `tracing` Subscribers
    pub fn try_into_telemetry_layer<S>(&self) -> Result<OpenTelemetryLayer<S, Tracer>, TraceError>
    where
        S: Subscriber + for<'a> LookupSpan<'a>,
    {
        let tracer = self.try_into_tracer()?;
        let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
        Ok(telemetry)
    }
}

impl From<&JaegerConfig> for PipelineBuilder {
    fn from(conf: &JaegerConfig) -> Self {
        let builder = PipelineBuilder::default()
            .with_service_name(&conf.name)
            .with_collector_endpoint(&conf.collector.uri);

        if let Some(ref auth) = conf.collector.auth {
            builder
                .with_collector_username(&auth.username)
                .with_collector_password(&auth.password)
        } else {
            builder
        }
    }
}
