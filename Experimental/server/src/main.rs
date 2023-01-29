mod error;
mod lua;
mod state;
mod types;

use error::Errors;
use simplelog::{ColorChoice, LevelFilter, TermLogger, TerminalMode};
use tiny_http::Server;
use types::{CommandRequest, ListRequest};

use crate::{
    state::State,
    types::{Channel, RequestType},
};

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
    let channel = Channel::from_request(request.channel);

    let state = State::new(channel, request.invoker)?;

    let size = lua::load_commands(&state.lua)?;

    log::info!("Loaded {} commands", size);

    let response = state.execute(&request.command, vec![] /* TODO */)?;

    Ok(response)
}

fn handle_list_request(request: &ListRequest) -> Result<String, Errors> {
    todo!();
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
            RequestType::List(request) => handle_list_request(&request),
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
                    Errors::CommandNotFound => {
                        request
                            .respond(tiny_http::Response::from_string("Command not found"))
                            .unwrap();
                    }
                }
            }
        }
    }
}
