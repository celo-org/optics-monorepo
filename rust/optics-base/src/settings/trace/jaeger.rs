use std::convert::{TryFrom, TryInto};

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

/// Config parameters for collection via Jaeger
#[derive(Debug, Clone, serde::Deserialize)]
pub struct JaegerConfig {
    collector: JaegerCollector,
    name: String,
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

impl TryFrom<&JaegerConfig> for Tracer {
    type Error = TraceError;

    fn try_from(value: &JaegerConfig) -> Result<Self, Self::Error> {
        let p: PipelineBuilder = value.into();
        p.install_simple()
    }
}

impl<S> TryFrom<&JaegerConfig> for OpenTelemetryLayer<S, Tracer>
where
    S: Subscriber + for<'a> LookupSpan<'a>,
{
    type Error = TraceError;

    fn try_from(value: &JaegerConfig) -> Result<Self, Self::Error> {
        Ok(tracing_opentelemetry::layer().with_tracer(value.try_into()?))
    }
}
