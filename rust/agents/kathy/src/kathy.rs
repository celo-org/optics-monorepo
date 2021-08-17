use std::time::Duration;

use async_trait::async_trait;
use color_eyre::eyre::bail;
use ethers::core::types::H256;
use optics_core::traits::Replica;
use tokio::{task::JoinHandle, time::sleep};

use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};

use color_eyre::Result;

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    decl_agent,
};
use optics_core::{traits::Home, Message};
use tracing::instrument::Instrumented;
use tracing::{info, Instrument};

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
    fn run(&self, name: &str) -> Instrumented<JoinHandle<Result<()>>> {
        let replica_opt = self.replica_by_name(name);
        let name = name.to_owned();
        let home = self.home();

        let mut generator = self.generator.clone();
        let duration = Duration::from_secs(self.duration);

        tokio::spawn(async move {
            if replica_opt.is_none() {
                bail!("No replica named {}", name);
            }
            let replica = replica_opt.unwrap();
            let destination = replica.local_domain();

            loop {
                let msg = generator.gen_chat();
                let recipient = generator.gen_recipient();

                match msg {
                    Some(body) => {
                        let message = Message {
                            destination,
                            recipient,
                            body,
                        };
                        info!(
                            "Enqueuing message of length {} to {}::{}",
                            message.body.len(),
                            message.destination,
                            message.recipient
                        );
                        home.enqueue(&message).await?;
                        info!("Enqueue success");
                    }
                    _ => {
                        info!("Reached the end of the static message queue. Shutting down.");
                        return Ok(());
                    }
                }

                sleep(duration).await;
            }
        })
        .in_current_span()
    }
}

/// Generators for messages
#[derive(Debug, Clone)]
pub enum ChatGenerator {
    Static {
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

    pub fn gen_recipient(&mut self) -> H256 {
        match self {
            ChatGenerator::Default => Default::default(),
            ChatGenerator::Static {
                recipient,
                message: _,
            } => *recipient,
            ChatGenerator::OrderedList {
                messages: _,
                counter: _,
            } => Default::default(),
            ChatGenerator::Random { length: _ } => H256::random(),
        }
    }

    pub fn gen_chat(&mut self) -> Option<Vec<u8>> {
        match self {
            ChatGenerator::Default => Some(Default::default()),
            ChatGenerator::Static {
                recipient: _,
                message,
            } => Some(message.as_bytes().to_vec()),
            ChatGenerator::OrderedList { messages, counter } => {
                if *counter >= messages.len() {
                    return None;
                }

                let msg = messages[*counter].clone().into();

                // Increment counter to next message in list
                *counter += 1;

                Some(msg)
            }
            ChatGenerator::Random { length } => Some(Self::rand_string(*length).into()),
        }
    }
}
