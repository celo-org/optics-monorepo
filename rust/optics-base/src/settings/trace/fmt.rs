use std::io::Stdout;

use tracing::{span, Subscriber};
use tracing_subscriber::{
    fmt::{
        self,
        format::{Compact, DefaultFields, FmtSpan, Format, Full, Json, JsonFields, Pretty},
    },
    registry::LookupSpan,
    Layer,
};

/// Basic tracing configuration
#[derive(Debug, Clone, Copy, serde::Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Style {
    /// Pretty print
    Pretty,
    /// JSON
    Json,
    /// Compact
    Compact,
    /// Default style
    #[serde(other)]
    Full,
}

impl Default for Style {
    fn default() -> Self {
        Style::Full
    }
}

impl Style {
    pub(crate) fn layer<
        S: tracing::Subscriber + for<'a> tracing_subscriber::registry::LookupSpan<'a>,
    >(
        &self,
    ) -> LogOutputLayer<S> {
        let layer = fmt::layer().with_span_events(FmtSpan::CLOSE);
        LogOutputLayer {
            inner: match self {
                Style::Full => Box::new(layer),
                Style::Pretty => Box::new(layer.pretty()),
                Style::Compact => Box::new(layer.compact()),
                Style::Json => Box::new(layer.json()),
            },
        }
    }
}

struct LogOutputLayer<S> {
    inner: Box<dyn tracing_subscriber::Layer<S>>,
}

impl<S> Layer<S> for LogOutputLayer<S>
where
    S: Subscriber + for<'a> LookupSpan<'a>,
{
    fn register_callsite(
        &self,
        metadata: &'static tracing::Metadata<'static>,
    ) -> tracing::subscriber::Interest {
        self.inner.register_callsite(metadata)
    }

    fn enabled(
        &self,
        metadata: &tracing::Metadata<'_>,
        ctx: tracing_subscriber::layer::Context<'_, S>,
    ) -> bool {
        self.inner.enabled(metadata, ctx)
    }

    fn new_span(
        &self,
        attrs: &span::Attributes<'_>,
        id: &span::Id,
        ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        self.inner.new_span(attrs, id, ctx)
    }

    fn max_level_hint(&self) -> Option<tracing::metadata::LevelFilter> {
        self.inner.max_level_hint()
    }

    fn on_record(
        &self,
        span: &span::Id,
        values: &span::Record<'_>,
        ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        self.inner.on_record(span, values, ctx)
    }

    fn on_follows_from(
        &self,
        span: &span::Id,
        follows: &span::Id,
        ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        self.inner.on_follows_from(span, follows, ctx)
    }

    fn on_event(&self, event: &tracing::Event<'_>, ctx: tracing_subscriber::layer::Context<'_, S>) {
        self.inner.on_event(event, ctx)
    }

    fn on_enter(&self, id: &span::Id, ctx: tracing_subscriber::layer::Context<'_, S>) {
        self.inner.on_enter(id, ctx)
    }

    fn on_exit(&self, id: &span::Id, ctx: tracing_subscriber::layer::Context<'_, S>) {
        self.inner.on_exit(id, ctx)
    }

    fn on_close(&self, id: span::Id, ctx: tracing_subscriber::layer::Context<'_, S>) {
        self.inner.on_close(id, ctx)
    }

    fn on_id_change(
        &self,
        old: &span::Id,
        new: &span::Id,
        ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        self.inner.on_id_change(old, new, ctx)
    }
}

#[cfg(test)]
mod test {

    use super::*;

    #[derive(serde::Deserialize)]
    struct TestStyle {
        style: Style,
    }

    #[test]
    fn it_deserializes_formatting_strings() {
        let case = r#"{"style": "pretty"}"#;
        assert_eq!(
            serde_json::from_str::<TestStyle>(case).unwrap().style,
            Style::Pretty
        );

        let case = r#"{"style": "compact"}"#;
        assert_eq!(
            serde_json::from_str::<TestStyle>(case).unwrap().style,
            Style::Compact
        );

        let case = r#"{"style": "full"}"#;
        assert_eq!(
            serde_json::from_str::<TestStyle>(case).unwrap().style,
            Style::Full
        );

        let case = r#"{"style": "json"}"#;
        assert_eq!(
            serde_json::from_str::<TestStyle>(case).unwrap().style,
            Style::Json
        );

        let case = r#"{"style": "toast"}"#;
        assert_eq!(
            serde_json::from_str::<TestStyle>(case).unwrap().style,
            Style::Full
        );
    }
}
