use std::fmt::{self, Display};

#[derive(Debug)]
pub enum Errors {
    InvalidRequest(String),
    LuaError(mlua::Error),
}

impl From<mlua::Error> for Errors {
    fn from(e: mlua::Error) -> Self {
        Errors::LuaError(e)
    }
}

impl Display for Errors {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Errors::InvalidRequest(e) => write!(f, "Invalid request: {}", e),
            Errors::LuaError(e) => write!(f, "Lua error: {}", e),
        }
    }
}
