use tokio::time::Instant;
use tracing::{span, Subscriber};
use tracing_subscriber::{layer::Context, registry::LookupSpan, Layer};

/// Records span lifetime into a prometheus histogram.
pub struct TimeSpanLifetime {
    histogram: prometheus::HistogramVec,
}

impl TimeSpanLifetime {
    /// Constructor.
    pub fn new(histogram: prometheus::HistogramVec) -> Self {
        Self { histogram }
    }
}

struct SpanTiming {
    start: Instant,
}

impl<S> Layer<S> for TimeSpanLifetime
where
    S: Subscriber + for<'a> LookupSpan<'a>,
{
    fn new_span(&self, _: &span::Attributes<'_>, id: &span::Id, ctx: Context<'_, S>) {
        match ctx.span(id) {
            Some(span) => span.extensions_mut().insert(SpanTiming {
                start: Instant::now(),
            }),
            None => unreachable!(),
        }
    }

    fn on_close(&self, id: span::Id, ctx: Context<S>) {
        let now = Instant::now();
        match ctx.span(&id) {
            Some(span) => {
                let exts = span.extensions();
                let timing = exts
                    .get::<SpanTiming>()
                    .expect("bug: didn't insert SpanTiming");
                self.histogram
                    .with_label_values(&[span.name(), span.metadata().target()])
                    .observe((now - timing.start).as_secs_f64());
            }
            None => unreachable!(),
        }
    }
}
