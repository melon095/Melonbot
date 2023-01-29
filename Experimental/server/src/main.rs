mod error;
mod lua;
mod state;
mod types;

use error::Errors;
use lua::{create_lua_ctx, load_ready_lua_state};
use simplelog::{ColorChoice, LevelFilter, TermLogger, TerminalMode};
use tiny_http::Server;
use types::{CommandRequest, ListRequest, ListResponse};

use crate::types::{Channel, RequestType};

extern crate simplelog;

// TODO: Async (Tokio)

fn parse_request(request: &mut tiny_http::Request) -> Result<RequestType, Errors> {
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

    let request: RequestType = match serde_json::from_str(&buf) {
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

fn handle_command_request(request: CommandRequest) -> Result<String, Errors> {
    let reply: Option<String> = None;

    let lua = create_lua_ctx()?;

    let channel = Channel::from_request(request.channel);

    let state = load_ready_lua_state(lua, channel, request.invoker)?;

    let response = state.execute(&request.command, request.arguments)?;

    Ok(response)
}

fn handle_list_request(request: ListRequest) -> Result<String, Errors> {
    let lua = create_lua_ctx()?;

    let channel = Channel::from_request(request.channel);

    let state = load_ready_lua_state(lua, channel, request.invoker)?;

    return match serde_json::to_string::<ListResponse>(&state.list_commands()?) {
        Ok(response) => Ok(response),
        Err(e) => {
            return Err(Errors::InvalidRequest(format!(
                "Invalid request: {}",
                e.to_string()
            )))
        }
    };
}

fn main() {
    let simple_config = simplelog::ConfigBuilder::new()
        .set_location_level(LevelFilter::Trace)
        .set_time_level(LevelFilter::Trace)
        .set_location_level(LevelFilter::Error)
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

        let res = match body {
            RequestType::Command(request) => handle_command_request(request),
            RequestType::List(request) => handle_list_request(request),
        };

        match res {
            Ok(res) => {
                let trimmed = res.replace("\r", "").replace("\n", "");

                request
                    .respond(tiny_http::Response::from_string(trimmed))
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
                        // split by newline and get first line
                        let first_line = e
                            .to_string()
                            .split('\n')
                            .next()
                            .unwrap_or("Unknown error")
                            .to_string();

                        request
                            .respond(tiny_http::Response::from_string(first_line))
                            .unwrap();
                    }
                }
            }
        }
    }
}
