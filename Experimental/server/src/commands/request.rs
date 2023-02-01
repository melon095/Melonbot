use futures_util::{Sink, SinkExt};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

use crate::{
    commands::create_request_response,
    error::Errors,
    lua::load_ready_lua_state,
    types::{Channel, CommandRequest},
};

pub async fn handle_request<Write>(request: &CommandRequest, mut write: Write) -> Result<(), Errors>
where
    Write: Sink<Message> + Send + Sync + Unpin,
    <Write as Sink<Message>>::Error: 'static + Send + Sync + std::error::Error,
{
    let (tx, mut rx) = mpsc::channel(10);

    let channel = Channel::from_request(request.channel.clone(), tx.clone());

    let state = load_ready_lua_state(channel, request.invoker.clone())?;

    tokio::join!(
        // Future that executes the command and sends a reply if something goes wrong.
        async move {
            let tx = tx.clone();

            let res = state
                .execute(&request.command, request.arguments.clone())
                .await;

            match res {
                Ok(_) => (),
                Err(e) => {
                    log::error!("Error executing command: {}", e);

                    let err_str = match create_readable_error_response(&e) {
                        Some(s) => s,
                        None => String::from("Unknown error"),
                    };

                    match tx.send(err_str).await {
                        Ok(_) => (),
                        Err(e) => {
                            log::error!("Error sending reply: {}", e);
                        }
                    }
                }
            }
        },
        // Future that listens for replies and sends them to the websocket.
        async move {
            let reply_id = request.reply_id.clone();
            let channel_id = request.channel.0.clone();

            loop {
                let msg = rx.recv().await;
                if let None = msg {
                    break;
                }
                let msg = msg.unwrap();

                log::info!("Sending reply to {}: {}", reply_id, msg);
                let json =
                    match create_request_response(&msg, &channel_id, Some(reply_id.to_string())) {
                        Ok(json) => json,
                        Err(e) => {
                            log::error!("Error creating reply: {}", e);
                            break;
                        }
                    };

                match write.send(Message::Text(json)).await {
                    Ok(_) => (),
                    Err(e) => {
                        log::error!("Error sending reply: {}", e);
                        break;
                    }
                }
            }
        }
    );

    Ok(())
}

fn create_readable_error_response(error: &Errors) -> Option<String> {
    match error {
        Errors::LuaError(e) => Some(e.to_string().clone().split('\r').next()?.to_string()),
        Errors::InvalidRequest(e) => Some(e.to_string()),
        Errors::Connection(_) => None,
    }
}
