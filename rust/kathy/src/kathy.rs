use async_trait::async_trait;
use tokio::time::{interval, Interval};

use color_eyre::Result;

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    decl_agent,
};
use optics_core::Message;

use crate::settings::Settings;

decl_agent!(
    /// Chatty Kathy
    Kathy {
        interval_seconds: u64,
        generator: ChatGenerator,
    }
);

impl Kathy {
    pub fn new(interval_seconds: u64, generator: ChatGenerator, core: AgentCore) -> Self {
        Self {
            interval_seconds,
            generator,
            core,
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
impl OpticsAgent for Kathy {
    type Settings = Settings;

    async fn from_settings(settings: Settings) -> Result<Self> {
        Ok(Self::new(
            settings.message_interval,
            ChatGenerator::Default,
            settings.as_ref().try_into_core().await?,
        ))
    }

    async fn run(&self, _: &str) -> Result<()> {
        let mut interval = self.interval();

        loop {
            let message = self.generator.gen_chat();
            self.home().enqueue(&message).await?;
            interval.tick().await;
        }
    }
}

/// Generators for messages
#[derive(Copy, Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ChatGenerator {
    #[serde(other)]
    Default,
}

impl Default for ChatGenerator {
    fn default() -> Self {
        Self::Default
    }
}

impl ChatGenerator {
    pub fn gen_chat(&self) -> Message {
        match self {
            ChatGenerator::Default => Default::default(),
        }
    }
}
