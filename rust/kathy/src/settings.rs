//! Configuration

use ethers::core::types::H256;

use crate::kathy::ChatGenerator;

use optics_base::decl_settings;

#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum ChatGenConfig {
    Static {
        destination: u32,
        recipient: H256,
        message: String,
    },
    OrderedList {
        messages: Vec<String>,
    },
    Random {
        length: usize,
    },
    #[serde(other)]
    Default,
}

impl Default for ChatGenConfig {
    fn default() -> Self {
        Self::Default
    }
}

impl Into<ChatGenerator> for ChatGenConfig {
    fn into(self) -> ChatGenerator {
        match self {
            Self::Static {
                destination,
                recipient,
                message,
            } => ChatGenerator::Static {
                destination,
                recipient,
                message,
            },
            Self::OrderedList { messages } => ChatGenerator::OrderedList {
                messages,
                counter: 0,
            },
            Self::Random { length } => ChatGenerator::Random { length },
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
