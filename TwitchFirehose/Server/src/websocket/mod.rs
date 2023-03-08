use crate::{MessageRequest, MessageResponse};
use futures_util::{SinkExt, StreamExt};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::{broadcast, mpsc},
};
use tokio_tungstenite::tungstenite::{self, Message};
use twitch_irc::message::ServerMessage;

pub async fn listen(
    port: u16,
    tmi_request: mpsc::Sender<MessageRequest>,
    event_receiver: broadcast::Sender<MessageResponse>,
) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("Listening for websocket connections on port {}", port);

    let tcp_listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await?;

    tokio::task::LocalSet::new()
        .run_until(async move {
            loop {
                let (socket, _) = match tcp_listener.accept().await {
                    Ok(socket) => socket,
                    Err(e) => {
                        log::error!("Error accepting connection: {}", e);
                        continue;
                    }
                };

                let tmi_request = tmi_request.clone();
                let event_receiver = event_receiver.subscribe();

                tokio::task::spawn_local(async move {
                    type Error = tungstenite::Error;

                    if let Err(e) =
                        wrap_initial_connection(socket, tmi_request, event_receiver).await
                    {
                        match e {
                            Error::ConnectionClosed | Error::Protocol(_) | Error::Utf8 => (),
                            err => log::error!("Error in websocket connection: {}", err),
                        }
                    }
                });
            }
        })
        .await;

    return Ok(());
}

async fn wrap_initial_connection(
    socket: TcpStream,
    tmi_request: mpsc::Sender<MessageRequest>,
    mut event_receiver: broadcast::Receiver<MessageResponse>,
) -> tungstenite::Result<()> {
    type Error = tungstenite::Error;

    let ws_stream = tokio_tungstenite::accept_async(socket).await?;

    let (mut write, mut read) = ws_stream.split();

    loop {
        tokio::select! {
            // On websocket message
            msg = read.next() => {
                let msg = match msg {
                    Some(msg) => msg?,
                    None => {
                        log::info!("Connection closed");
                        break;
                    }
                };

                let body = match msg {
                    Message::Text(t) => t,
                    Message::Binary(b) => String::from_utf8(b)?,
                    Message::Ping(p) => {
                        write.send(Message::Pong(p)).await?;
                        continue;
                    },
                    Message::Pong(_) => continue,
                    _ => {
                        log::warn!("Received invalid message type");
                        continue;
                    }
                };

                let parsed_body: MessageRequest = match serde_json::from_str(body.as_ref()) {
                    Ok(body) => body,
                    Err(e) => {
                        log::warn!("Error parsing request: {}", e);
                        continue;
                    }
                };

                match handle_ws_message(parsed_body, &tmi_request).await {
                    Ok(_) => (),
                    Err(e) => {
                        log::warn!("Error handling request: {}", e);
                        continue;
                    }
                };
            },
            // On message from TMI
            evt = event_receiver.recv() => {
                let evt = match evt {
                    Ok(evt) => evt,
                    Err(broadcast::error::RecvError::Closed) => {
                        log::error!("Event receiver closed");

                        write.send(Message::Close(None)).await?;

                        break;
                    }
                    Err(err) => {
                        log::error!("Error receiving event: {}", err);

                        break;
                    }
                };

                let msg = match serde_json::to_string(&evt) {
                    Ok(msg) => msg,
                    Err(e) => {
                        log::error!("Error serializing event: {}", e);
                        continue;
                    }
                };

                log::info!("Broadcast {} event", irc_type_to_string(&evt));
                write.send(Message::Text(msg)).await?;
            }
        }
    }

    Ok(())
}

async fn handle_ws_message(
    body: MessageRequest,
    tmi_request: &mpsc::Sender<MessageRequest>,
) -> anyhow::Result<()> {
    log::info!("Received request: {:?}", body);

    tmi_request.send(body).await?;

    Ok(())
}

fn irc_type_to_string(evt: &MessageResponse) -> &'static str {
    let irc_evt_to_str = |evt: &ServerMessage| -> &'static str {
        match evt {
            ServerMessage::Privmsg(_) => "PRIVMSG",
            ServerMessage::Notice(_) => "NOTICE",
            ServerMessage::UserNotice(_) => "USERNOTICE",
            ServerMessage::UserState(_) => "USERSTATE",
            ServerMessage::ClearChat(_) => "CLEARCHAT",
            ServerMessage::ClearMsg(_) => "CLEARMSG",
            ServerMessage::GlobalUserState(_) => "GLOBALUSERSTATE",
            ServerMessage::RoomState(_) => "ROOMSTATE",
            ServerMessage::Reconnect(_) => "RECONNECT",
            ServerMessage::Join(_) => "JOIN",
            ServerMessage::Part(_) => "PART",
            ServerMessage::Ping(_) => "PING",
            ServerMessage::Pong(_) => "PONG",
            ServerMessage::Whisper(_) => "WHISPER",
            _ => "(Non implemented message type)",
        }
    };

    match evt {
        MessageResponse::Irc(evt) => irc_evt_to_str(evt),
        MessageResponse::TmiDelay(_) => "TMI_DELAY",
    }
}
