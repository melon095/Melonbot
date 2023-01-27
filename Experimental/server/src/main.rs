mod error;

use error::Errors;
use rlua::UserData;
use serde::{Deserialize, Serialize};
use simplelog::{ColorChoice, LevelFilter, TermLogger, TerminalMode};
use tiny_http::Server;

extern crate simplelog;

// TODO: Async (Tokio)

#[derive(Debug, Serialize, Deserialize)]
struct Request {
    command: String,
    channel: Channel,
    user: User,
}

#[derive(Debug, Serialize, Deserialize)]
struct Channel(
    /// Channel ID
    pub String,
    /// Channel Name
    pub String,
);

impl UserData for Channel {
    fn add_methods<'lua, M: rlua::UserDataMethods<'lua, Self>>(methods: &mut M) {
        methods.add_method("id", |_, this, ()| Ok(this.0.clone()));
        methods.add_method("name", |_, this, ()| Ok(this.1.clone()));
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct User(
    /// User ID
    pub String,
    /// User Name
    pub String,
);

impl UserData for User {
    fn add_methods<'lua, H: rlua::UserDataMethods<'lua, Self>>(methods: &mut H) {
        methods.add_method("id", |_, this, ()| Ok(this.0.clone()));
        methods.add_method("name", |_, this, ()| Ok(this.1.clone()));
    }
}

fn parse_request(request: &mut tiny_http::Request) -> Result<Request, Errors> {
    let mut buf = String::new();

    match request.as_reader().read_to_string(&mut buf) {
        Ok(body) => body,
        Err(e) => {
            return Err(Errors::InvalidRequest(format!(
                "Invalid request: {}",
                e.to_string()
            )))
        }
    };

    let request: Request = match serde_json::from_str(&buf) {
        Ok(request) => request,
        Err(e) => {
            return Err(Errors::InvalidRequest(format!(
                "Invalid request: {}",
                e.to_string()
            )))
        }
    };

    Ok(request)
}

fn handle_request(request: Request) -> Result<String, Errors> {
    let lua = create_lua_ctx(request.channel, request.user)?;

    let mut result = String::new();

    lua.context(|ctx| {
        let eval_res = ctx.load(&request.command).eval::<rlua::Value>()?;

        result = match eval_res {
            rlua::Value::String(s) => s.to_str().unwrap().to_string(),
            rlua::Value::Integer(i) => i.to_string(),
            rlua::Value::Boolean(b) => b.to_string(),
            rlua::Value::LightUserData(_) => "LightUserData".to_string(),
            rlua::Value::Number(n) => n.to_string(),
            rlua::Value::Table(_) => "Table".to_string(),
            rlua::Value::Function(_) => "Function".to_string(),
            rlua::Value::Thread(_) => "Thread".to_string(),
            rlua::Value::Nil => "Nil".to_string(),
            rlua::Value::Error(_) => "Error".to_string(),
            rlua::Value::UserData(_) => "UserData".to_string(),
        };

        Ok::<(), rlua::Error>(())
    })?;

    Ok(result)
}

fn create_lua_ctx(channel: Channel, user: User) -> Result<rlua::Lua, rlua::Error> {
    let state = rlua::Lua::new();

    state.context(|ctx| {
        let globals = ctx.globals();

        globals.set("channel", channel)?;
        globals.set("user", user)?;

        Ok(())
    })?;

    Ok(state)
}

fn main() {
    let simple_config = simplelog::ConfigBuilder::new()
        .set_location_level(LevelFilter::Trace)
        .set_time_level(LevelFilter::Trace)
        .set_target_level(LevelFilter::Trace)
        .build();

    TermLogger::init(
        LevelFilter::Debug,
        simple_config,
        TerminalMode::Mixed,
        ColorChoice::Always,
    )
    .unwrap();

    let port = std::env::args().nth(1).unwrap_or("8080".to_string());

    log::info!("Starting server on port {}", port);

    let server = Server::http(format!("0.0.0.0:{}", port)).unwrap();

    for mut request in server.incoming_requests() {
        log::info!("Received request: {:?}", request);

        let body = match parse_request(&mut request) {
            Ok(body) => body,
            Err(e) => {
                log::error!("Error: {:?}", e);
                continue;
            }
        };

        log::info!("Parsed request: {:?}", body);

        match handle_request(body) {
            Ok(res) => {
                request
                    .respond(tiny_http::Response::from_string(res))
                    .unwrap();
            }
            Err(e) => {
                log::error!("Error: {:?}", e);

                match e {
                    Errors::InvalidRequest(e) => {
                        request
                            .respond(tiny_http::Response::from_string(e))
                            .unwrap();
                    }
                    Errors::LuaError(e) => {
                        request
                            .respond(tiny_http::Response::from_string(e.to_string()))
                            .unwrap();
                    }
                }
            }
        }
    }
}
