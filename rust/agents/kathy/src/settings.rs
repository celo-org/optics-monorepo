//! Configuration

use ethers::core::types::H256;

use crate::kathy::ChatGenerator;

use optics_base::decl_settings;

#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ChatGenConfig {
    Static {
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

impl From<ChatGenConfig> for ChatGenerator {
    fn from(conf: ChatGenConfig) -> ChatGenerator {
        match conf {
            ChatGenConfig::Static { recipient, message } => {
                ChatGenerator::Static { recipient, message }
            }
            ChatGenConfig::OrderedList { messages } => ChatGenerator::OrderedList {
                messages,
                counter: 0,
            },
            ChatGenConfig::Random { length } => ChatGenerator::Random { length },
            ChatGenConfig::Default => ChatGenerator::Default,
        }
    }
}

decl_settings!(Kathy {
    message_interval: String,
    #[serde(default)]
    chat: ChatGenConfig,
});
