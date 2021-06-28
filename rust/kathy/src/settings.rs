//! Configuration

use ethers::core::types::H256;

use crate::kathy::ChatGenerator;

use optics_base::decl_settings;

#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ChatGenConfig {
    Static {
        destination: String,
        recipient: H256,
        message: String,
    },
    OrderedList {
        messages: Vec<String>,
    },
    Random {
        length: usize,
        destination: Option<String>,
        recipient: Option<H256>,
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
            ChatGenConfig::Static {
                destination,
                recipient,
                message,
            } => ChatGenerator::Static {
                destination: destination.parse().expect("invalid uint"),
                recipient,
                message,
            },
            ChatGenConfig::OrderedList { messages } => ChatGenerator::OrderedList {
                messages,
                counter: 0,
            },
            ChatGenConfig::Random {
                length,
                destination,
                recipient,
            } => ChatGenerator::Random {
                length,
                destination: destination.map(|d| d.parse().expect("invalid uint")),
                recipient,
            },
            ChatGenConfig::Default => ChatGenerator::Default,
        }
    }
}

decl_settings!(Kathy {
    message_interval: String,
    #[serde(default)]
    chat: ChatGenConfig,
});
