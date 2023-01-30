mod commands;
mod error;
mod lua;
mod state;
mod types;

use error::Errors;
use futures_util::{Sink, SinkExt, StreamExt};
use simplelog::{ColorChoice, LevelFilter, TermLogger, TerminalMode};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::{self, Message};

use crate::{commands::create_request_response, types::RequestType};

extern crate simplelog;

fn parse_request<'a>(request: &'a str) -> Result<RequestType, Errors> {
    let json: RequestType = match serde_json::from_str(request) {
        Ok(request) => request,
        Err(e) => {
            return Err(Errors::InvalidRequest(format!(
                "Invalid request: {}",
                e.to_string()
            )))
        }
    };

    Ok(json)
}

async fn handle_ws_message<'a, Write>(body: &RequestType, write: Write) -> Result<(), Errors>
where
    Write: Sink<Message> + Send + Sync + Unpin,
    <Write as Sink<Message>>::Error: 'static + Send + Sync + std::error::Error,
{
    match body {
        RequestType::Command(request) => commands::request::handle_request(request, write).await?,
        RequestType::List(request) => commands::list::handle_request(request, write).await?,
    };

    Ok(())
}

async fn wrap_initial_connection(socket: TcpStream) -> tungstenite::Result<()> {
    type Error = tungstenite::Error;

    let ws_stream = tokio_tungstenite::accept_async(socket).await?;
    let (mut write, mut read) = ws_stream.split();

    loop {
        let msg = match read.next().await {
            Some(msg) => msg?,
            None => {
                log::info!("Connection closed");
                break;
            }
        };

        let msg = match msg {
            Message::Text(t) => t,
            Message::Ping(p) => {
                write.send(Message::Pong(p)).await?;
                continue;
            }
            _ => continue,
        };

        log::info!("Received message: {:?}", msg);

        let body = match parse_request(&msg) {
            Ok(body) => body,
            Err(e) => {
                log::error!("Failed to parse request: {:?}", e);
                continue;
            }
        };

        log::info!("Parsed request: {:?}", body);

        if let Err(error) = handle_ws_message(&body, &mut write).await {
            let (channel, id) = match body {
                RequestType::Command(request) => (request.channel, Some(request.reply_id)),
                RequestType::List(request) => (request.channel, None),
            };

            match error {
                Errors::LuaError(e) => {
                    let json =
                        create_request_response(&format!("Lua error: {}", e), &channel.0, id)
                            /* FIX */
                            .unwrap();

                    write.send(Message::Text(json)).await?;
                }

                Errors::InvalidRequest(e) => {
                    let json = create_request_response(&e, &channel.0, id).unwrap();

                    write.send(Message::Text(json)).await?;
                }

                Errors::Connection(e) => match e {
                    Error::ConnectionClosed | Error::Protocol(_) | Error::Utf8 => (),
                    _ => {
                        log::error!("Connection error: {:?}", e);
                        write.close().await?;
                    }
                },
            }
        };
    }

    Ok(())
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let simple_config = simplelog::ConfigBuilder::new()
        .set_location_level(LevelFilter::Error)
        .set_time_level(LevelFilter::Error)
        .build();

    TermLogger::init(
        LevelFilter::Debug,
        simple_config,
        TerminalMode::Mixed,
        ColorChoice::Always,
    )
    .unwrap();

    let port = std::env::args().nth(1).unwrap_or("8080".to_string());

    tokio::task::LocalSet::new()
        .run_until(async move {
            let tcp_listener = TcpListener::bind(format!("0.0.0.0:{}", port))
                .await
                .unwrap();

            log::info!("Starting websocket server on port {}", port);

            loop {
                let (socket, _) = match tcp_listener.accept().await {
                    Ok(socket) => socket,
                    Err(e) => {
                        log::error!("Failed to accept WS: {:?}", e);
                        continue;
                    }
                };

                tokio::task::spawn_local(async move { wrap_initial_connection(socket).await });
            }
        })
        .await;
}
