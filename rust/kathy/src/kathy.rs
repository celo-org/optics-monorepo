use async_trait::async_trait;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc, RwLock,
};
use tokio::time::{interval, Interval};

use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};

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
            settings.chat_gen.into(),
            settings.base.try_into_core().await?,
        ))
    }

    async fn run(&self, _: &str) -> Result<()> {
        let mut interval = self.interval();

        loop {
            if let Some(message) = self.generator.gen_chat() {
                self.home().enqueue(&message).await?;
            } else {
                return Ok(());
            }

            interval.tick().await;
        }
    }
}

/// Generators for messages
#[derive(Clone, Debug)]
pub enum ChatGenerator {
    Static(String),
    OrderedList {messages: Vec<String>,counter: Arc<RwLock<AtomicUsize>>},
    Random {length: usize},
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

    pub fn gen_chat(&self) -> Option<Message> {
        match self {
            ChatGenerator::Default => Some(Default::default()),
            ChatGenerator::Static(body) => Some(Message {
                destination: Default::default(),
                recipient: Default::default(),
                body: body.clone().into(),
            }),
            ChatGenerator::OrderedList { messages, counter } => {
                if counter.read().unwrap().load(Ordering::SeqCst) >= messages.len() {
                    return None;
                }

                let msg = Message {
                    destination: Default::default(),
                    recipient: Default::default(),
                    body: messages[counter.read().unwrap().load(Ordering::SeqCst)]
                        .clone()
                        .into(),
                };

                // Increment counter to next message in list
                let mut _old_val = counter.write().unwrap().fetch_add(1, Ordering::SeqCst);

                Some(msg)
            }
            ChatGenerator::Random { length } => Some(Message {
                destination: Default::default(),
                recipient: Default::default(),
                body: Self::rand_string(length.clone()).into(),
            }),
        }
    }
}
