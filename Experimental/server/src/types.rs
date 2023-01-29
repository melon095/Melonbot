use rlua::UserData;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct Channel(
    /// Channel ID
    pub String,
    /// Channel Name
    pub String,
);

impl Channel {
    pub fn from_request(req: (String, String)) -> Self {
        Self(req.0, req.1)
    }
}

impl UserData for Channel {
    fn add_methods<'lua, M: rlua::UserDataMethods<'lua, Self>>(methods: &mut M) {
        methods.add_method("id", |_, this, ()| Ok(this.0.clone()));
        methods.add_method("name", |_, this, ()| Ok(this.1.clone()));
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoker(
    /// Invoker ID
    pub String,
    /// Invoker Name
    pub String,
);

impl UserData for Invoker {
    fn add_methods<'lua, M: rlua::UserDataMethods<'lua, Self>>(methods: &mut M) {
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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListRequest {
    pub channel: (String, String),
    pub invoker: Invoker,
}
