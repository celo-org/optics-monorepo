/// A configuration for a tracing subscriber
///
/// See the subscriber builder page for full details: [link](https://docs.rs/tracing-subscriber/0.2.15/tracing_subscriber/fmt/struct.SubscriberBuilder.html).
///
#[derive(Debug, serde::Deserialize)]
pub struct TracingConfig {
    /// The logging style. json | pretty | compact | default
    #[serde(default)]
    pub style: Style,
    /// The logging level. Defaults to info
    #[serde(default)]
    pub level: Level,
}

/// Basic tracing configuration
#[derive(Debug, Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Style {
    /// Pretty print
    Pretty,
    /// JSON
    Json,
    /// Compact
    Compact,
    /// Default style
    #[serde(other)]
    Default,
}

impl Default for Style {
    fn default() -> Self {
        Style::Default
    }
}

/// Logging level
#[derive(Debug, Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
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

impl Default for Level {
    fn default() -> Self {
        Level::Info
    }
}

impl Into<tracing_subscriber::filter::LevelFilter> for Level {
    fn into(self) -> tracing_subscriber::filter::LevelFilter {
        match self {
            Level::Off => tracing_subscriber::filter::LevelFilter::OFF,
            Level::Error => tracing_subscriber::filter::LevelFilter::ERROR,
            Level::Warn => tracing_subscriber::filter::LevelFilter::WARN,
            Level::Debug => tracing_subscriber::filter::LevelFilter::DEBUG,
            Level::Trace => tracing_subscriber::filter::LevelFilter::TRACE,
            Level::Info => tracing_subscriber::filter::LevelFilter::INFO,
        }
    }
}
