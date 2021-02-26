//! Configuration

use std::sync::{
    atomic::{AtomicUsize},
    Arc, RwLock,
};

use optics_base::decl_settings;

use crate::kathy::ChatGenerator;

#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum ChatGenConfig {
    Static { message: String },
    OrderedList { messages: Vec<String> },
    Random { length: usize },
    #[serde(other)] Default,
}

impl Default for ChatGenConfig {
    fn default() -> Self {
        Self::Default
    }
}

impl Into<ChatGenerator> for ChatGenConfig {
    fn into(self) -> ChatGenerator {
        match self {
            Self::Static{message} => ChatGenerator::Static(message),
            Self::OrderedList{messages} => ChatGenerator::OrderedList{
                messages,
                counter: Arc::new(RwLock::new(AtomicUsize::new(0))),
            },
            Self::Random{length} => ChatGenerator::Random{length},
            Self::Default => ChatGenerator::Default,
        }
    }
}

decl_settings!(
    Settings {
        "OPT_KATHY",
        message_interval: u64,
        #[serde(default)] chat_gen: ChatGenConfig,
    }
);