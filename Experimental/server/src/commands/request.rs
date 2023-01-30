use futures_util::{Sink, SinkExt};
use tokio::sync::mpsc::{self, Receiver};
use tokio_tungstenite::tungstenite::Message;

use crate::{
    commands::create_request_response,
    error::Errors,
    lua::load_ready_lua_state,
    types::{Channel, CommandRequest},
};

pub async fn handle_request<Write>(request: CommandRequest, mut write: Write) -> Result<(), Errors>
where
    Write: Sink<Message> + Send + Sync + Unpin,
    <Write as Sink<Message>>::Error: 'static + Send + Sync + std::error::Error,
{
    let (tx, rx) = mpsc::channel(2);

    let channel = Channel::from_request(request.channel.clone(), tx);

    let state = load_ready_lua_state(channel, request.invoker)?;

    tokio::join!(
        wait_for_reply(&request.reply_id, &request.channel.0, rx, &mut write),
        async {
            let res = state
                .execute(&request.command, request.arguments.clone())
                .await;

            match res {
                Ok(_) => (),
                Err(e) => log::error!("Error executing command: {}", e),
            }
        }
    );

    Ok(())
}

async fn wait_for_reply<'reply, Write>(
    reply_id: &'reply str,
    channel_id: &'reply str,
    mut rx: Receiver<String>,
    write: &mut Write,
) -> ()
where
    Write: Sink<Message> + Send + Sync + Unpin,
    <Write as Sink<Message>>::Error: 'static + Send + Sync + std::error::Error,
{
    loop {
        let msg = rx.recv().await;
        if let None = msg {
            break;
        }
        let msg = msg.unwrap();

        log::info!("Sending reply to {}: {}", reply_id, msg);
        let json = match create_request_response(&msg, channel_id, reply_id) {
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
