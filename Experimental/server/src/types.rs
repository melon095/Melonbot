use mlua::UserData;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

#[derive(Debug, Clone)]
pub struct Channel {
    /// Channel ID
    pub channel_id: String,
    /// Channel Name
    pub channel_name: String,
    /// Reply channel
    pub reply_channel: mpsc::Sender<String>,
    /* TODO: use oneshot here, but it does not implement Clone trait. */
}

impl Channel {
    pub fn from_request(req: (String, String), tx: mpsc::Sender<String>) -> Self {
        Self {
            channel_id: req.0,
            channel_name: req.1,
            reply_channel: tx,
        }
    }
}

impl UserData for Channel {
    fn add_methods<'lua, M: mlua::UserDataMethods<'lua, Self>>(methods: &mut M) {
        methods.add_method("id", |_, this, ()| Ok(this.channel_id.clone()));
        methods.add_method("name", |_, this, ()| Ok(this.channel_name.clone()));
        methods.add_async_method("reply", |_, this, msg: String| async move {
            match this.reply_channel.send(msg).await {
                Ok(_) => Ok(()),
                Err(e) => Err(mlua::Error::RuntimeError(format!(
                    "Failed to send reply: {}",
                    e
                ))),
            }
        });
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Invoker(
    /// Invoker ID
    pub String,
    /// Invoker Name
    pub String,
);

impl UserData for Invoker {
    fn add_methods<'lua, M: mlua::UserDataMethods<'lua, Self>>(methods: &mut M) {
        methods.add_method("id", |_, this, ()| Ok(this.0.clone()));
        methods.add_method("name", |_, this, ()| Ok(this.1.clone()));
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RequestType {
    /// Execute a command
    Command(CommandRequest),
    /// List all available commands
    List(ListRequest),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandRequest {
    pub reply_id: String,
    pub command: String,
    pub channel: (String, String),
    pub invoker: Invoker,
    pub arguments: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListRequest {
    pub channel: (String, String),
    pub invoker: Invoker,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ResponseType {
    /// Command response
    Command(CommandResponse),
    /// List response
    List(ListResponse),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListResponse(pub Vec<String>);

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResponse {
    pub channel_id: String,
    pub reply_id: String,
    pub response: String,
}
