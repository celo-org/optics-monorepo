use async_trait::async_trait;
use std::sync::Arc;
use tokio::time::{interval, Interval};

use color_eyre::Result;

use optics_base::agent::OpticsAgent;
use optics_core::{
    traits::{Home, Replica},
    Message,
};

/// Chatty Kathy
pub struct Kathy {
    interval_seconds: u64,
    generator: ChatGenerator,
}

impl std::fmt::Debug for Kathy {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Kathy")
    }
}

impl Kathy {
    pub fn new(interval_seconds: u64, generator: ChatGenerator) -> Self {
        Self {
            interval_seconds,
            generator,
        }
    }

    #[doc(hidden)]
    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }
}

#[async_trait]
impl OpticsAgent for Kathy {
    async fn run(
        &self,
        home: Arc<Box<dyn Home>>,
        _replica: Option<Box<dyn Replica>>,
    ) -> Result<()> {
        let mut interval = self.interval();

        loop {
            let message = self.generator.gen_chat();
            home.enqueue(&message).await?;
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
