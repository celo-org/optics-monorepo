use std::time::Duration;

use async_trait::async_trait;
use ethers::core::types::H256;
use tokio::{task::JoinHandle, time::sleep};

use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};

use color_eyre::Result;

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    decl_agent,
};
use optics_core::{traits::Home, Message};
use tracing::info;

use crate::settings::KathySettings as Settings;

decl_agent!(Kathy {
    duration: u64,
    generator: ChatGenerator,
});

impl Kathy {
    pub fn new(duration: u64, generator: ChatGenerator, core: AgentCore) -> Self {
        Self {
            duration,
            generator,
            core,
        }
    }
}

#[async_trait]
impl OpticsAgent for Kathy {
    type Settings = Settings;

    async fn from_settings(settings: Settings) -> Result<Self> {
        Ok(Self::new(
            settings.message_interval.parse().expect("invalid u64"),
            settings.chat.into(),
            settings.base.try_into_core().await?,
        ))
    }

    #[tracing::instrument]
    fn run(&self, _: &str) -> JoinHandle<Result<()>> {
        let home = self.home();
        let mut generator = self.generator.clone();
        let duration = Duration::from_secs(self.duration);
        tokio::spawn(async move {
            loop {
                if let Some(message) = generator.gen_chat() {
                    info!(
                        "Enqueuing message of length {} to {}::{}",
                        message.body.len(),
                        message.destination,
                        message.recipient
                    );
                    home.enqueue(&message).await?;
                } else {
                    info!("Reached the end of the static message queue. Shutting down.");
                    return Ok(());
                }

                sleep(duration).await;
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
        destination: Option<u32>,
        length: usize,
        recipient: Option<H256>,
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
                body: message.as_bytes().to_vec(),
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
            ChatGenerator::Random {
                length,
                destination,
                recipient,
            } => Some(Message {
                destination: destination.unwrap_or_else(Default::default),
                recipient: recipient.unwrap_or_else(Default::default),
                body: Self::rand_string(*length).into(),
            }),
        }
    }
}
