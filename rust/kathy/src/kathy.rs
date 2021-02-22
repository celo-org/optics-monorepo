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
            let messages = self.generator.gen_chat();
            for message in messages.into_iter() {
                home.enqueue(&message).await?;
            }
            interval.tick().await;
        }
    }
}

/// Generators for messages
#[derive(Copy, Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ChatGenerator {
    Default,
    Static,
    Random,
    OrderedList,
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

    pub fn gen_chat(&self) -> Vec<Message> {
        match self {
            ChatGenerator::Default => vec!(Default::default()),
            ChatGenerator::Static => vec!(
                Message {
                    destination: 1,
                    recipient: H256::from_slice("recipient".as_bytes()),
                    body: String::from("message").into(),
                }
            ),
            ChatGenerator::Random => vec!(
                Message {
                    destination: thread_rng().gen(),
                    recipient: H256::from_slice(Self::rand_string(30).as_bytes()),
                    body: Self::rand_string(30).into(),
                }
            ),
            ChatGenerator::OrderedList => vec!(
                Message {
                    destination: 1,
                    recipient: H256::from_slice("recipient1".as_bytes()),
                    body: String::from("message1").into(),
                },
                Message {
                    destination: 2,
                    recipient: H256::from_slice("recipient2".as_bytes()),
                    body: String::from("message2").into(),
                },
                Message {
                    destination: 3,
                    recipient: H256::from_slice("recipient3".as_bytes()),
                    body: String::from("message3").into(),
                },
                Message {
                    destination: 4,
                    recipient: H256::from_slice("recipient4".as_bytes()),
                    body: String::from("message4").into(),
                },
                Message {
                    destination: 5,
                    recipient: H256::from_slice("recipient5".as_bytes()),
                    body: String::from("message5").into(),
                }
            ),
        }
    }
}
