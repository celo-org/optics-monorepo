use opentelemetry::{sdk::trace::Tracer, trace::TraceError};
use opentelemetry_jaeger::PipelineBuilder;

/// Config parameters for collection via Jaeger
#[derive(Debug, Clone, Copy, serde::Deserialize)]
pub struct JaegerConfig {
    // TODO
}

impl JaegerConfig {
    /// Convert into a tracer, consuming self
    pub fn into_tracer(self) -> Result<Tracer, TraceError> {
        let pipeline: PipelineBuilder = self.into();
        pipeline.install_simple()
    }
}

impl From<JaegerConfig> for PipelineBuilder {
    fn from(_: JaegerConfig) -> Self {
        todo!()
    }
}
