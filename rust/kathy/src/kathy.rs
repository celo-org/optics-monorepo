use async_trait::async_trait;
use ethers::core::types::H256;
use tokio::{
    task::JoinHandle,
    time::{interval, Interval},
};

use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};

use color_eyre::Result;

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    decl_agent,
};
use optics_core::Message;

use crate::settings::Settings;

decl_agent!(Kathy {
    interval_seconds: u64,
    generator: ChatGenerator,
});

impl Kathy {
    pub fn new(interval_seconds: u64, generator: ChatGenerator, core: AgentCore) -> Self {
        Self {
            interval_seconds,
            generator,
            core,
        }
    }

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
            settings.chat_gen.into(),
            settings.base.try_into_core().await?,
        ))
    }

    #[tracing::instrument]
    fn run(&self, _: &str) -> JoinHandle<Result<()>> {
        let mut interval = self.interval();
        let home = self.home();
        let mut generator = self.generator.clone();
        tokio::spawn(async move {
            loop {
                if let Some(message) = generator.gen_chat() {
                    home.enqueue(&message).await?;
                } else {
                    return Ok(());
                }

                interval.tick().await;
            }
        })
    }
}

/// Generators for messages
#[derive(Debug, Clone)]
pub enum ChatGenerator {
    Static {
        destination: u32,
        recipient: H256,
        message: String,
    },
    OrderedList {
        messages: Vec<String>,
        counter: usize,
    },
    Random {
        length: usize,
    },
    Default,
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

    pub fn gen_chat(&mut self) -> Option<Message> {
        match self {
            ChatGenerator::Default => Some(Default::default()),
            ChatGenerator::Static {
                destination,
                recipient,
                message,
            } => Some(Message {
                destination: destination.to_owned(),
                recipient: recipient.to_owned(),
                body: message.clone().into(),
            }),
            ChatGenerator::OrderedList { messages, counter } => {
                if *counter >= messages.len() {
                    return None;
                }

                let msg = Message {
                    destination: Default::default(),
                    recipient: Default::default(),
                    body: messages[*counter].clone().into(),
                };

                // Increment counter to next message in list
                *counter += 1;

                Some(msg)
            }
            ChatGenerator::Random { length } => Some(Message {
                destination: Default::default(),
                recipient: Default::default(),
                body: Self::rand_string(*length).into(),
            }),
        }
    }
}
