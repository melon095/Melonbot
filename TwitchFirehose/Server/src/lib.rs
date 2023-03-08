pub mod twitch;
pub mod websocket;

use serde::Serialize;
use serde_derive::Deserialize;
use std::{io, path::Path};
use twitch_irc::message::{ReplyToMessage, ServerMessage};

#[derive(Debug, Deserialize)]
pub struct Config {
    pub twitch_oauth: String,
    pub twitch_username: String,
    pub listening_port: u16,
}

impl Config {
    pub fn create<P: AsRef<Path>>(path: P) -> io::Result<Self> {
        let config = std::fs::read_to_string(path)?;
        let config = serde_json::from_str(&config)?;
        Ok(config)
    }
}

#[derive(Deserialize, Debug)]
pub struct ReplyContext {
    channel: String,
    reply_id: String,
}

impl ReplyToMessage for ReplyContext {
    fn channel_login(&self) -> &str {
        &self.channel
    }

    fn message_id(&self) -> &str {
        &self.reply_id
    }
}

#[derive(Deserialize, Debug)]
/// MessageReuqest defines what a client may send.
pub enum MessageRequest {
    /// Send a JOIN to TMI
    /// Takes in a channel name
    Join(String),

    /// Send a PART to TMI
    /// Takes in a channel name
    Leave(String),

    /// Send a message to TMI
    /// Takes in a channel name and a message
    Privmsg(String, String),

    /// Sends a reply to TMI.
    ///
    /// Reply is very similar to a PRIVMSG however clients may show more context to a conversation.
    ///
    /// Takes in a channel name, a message, and a reply id.
    Reply(ReplyContext, String),
    TmiDelay,
}

/// MessageResponse is the data the server will send to clients.
#[derive(Debug, Serialize, Clone)]
pub enum MessageResponse {
    Irc(ServerMessage),
    TmiDelay(u64),
}
