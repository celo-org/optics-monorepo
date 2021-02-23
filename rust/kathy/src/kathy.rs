use async_trait::async_trait;
use tokio::time::{interval, Interval};

use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;

use color_eyre::Result;

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    decl_agent,
};
use optics_core::Message;

use crate::settings::Settings;

decl_agent!(
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
            home.enqueue(&message).await?;
            interval.tick().await;
        }
    }
}

/// Generators for messages
#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ChatGenerator {
    Default,
    Static(String),
    OrderedList{messages: Vec<String>},
    Random{length: usize},
}

impl Default for ChatGenerator {
    fn default() -> Self {
        Self::Default
    }
}

impl ChatGenerator {
    fn rand_string(length: usize) -> String {
        thread_rng()
            .sample_iter(&Alphanumeric)
            .take(length)
            .map(char::from)
            .collect()
    }

    pub fn gen_chat(&self) -> Message {
        match self {
            ChatGenerator::Default => Default::default(),
            ChatGenerator::Static(body) => Message {
                destination: Default::default(),
                recipient: Default::default(),
                body: body.clone().into(),
            },
            ChatGenerator::OrderedList{messages} => {
                Message {
                    destination: Default::default(),
                    recipient: Default::default(),
                    body: messages[0].clone().into(),
                }
            },
            ChatGenerator::Random{length} => Message {
                destination: thread_rng().gen(),
                recipient: H256::from_slice(Self::rand_string(length.clone()).as_bytes()),
                body: Self::rand_string(length.clone()).into(),
            },
        }
    }
}
