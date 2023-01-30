use futures_util::{Sink, SinkExt};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

use crate::{
    error::Errors,
    lua::load_ready_lua_state,
    types::{Channel, ListRequest},
};

use super::create_list_response;

pub async fn handle_request<Write>(request: ListRequest, mut write: Write) -> Result<(), Errors>
where
    Write: Sink<Message> + Send + Sync + Unpin,
    <Write as Sink<Message>>::Error: 'static + Send + Sync + std::error::Error,
{
    let (tx, _) = mpsc::channel(2);

    let channel = Channel::from_request(request.channel, tx);

    let state = load_ready_lua_state(channel, request.invoker)?;

    match create_list_response(state.list_commands()?) {
        Ok(response) => match write.send(Message::Text(response)).await {
            // TODO: clean up
            Ok(_) => (),
            Err(e) => {
                return Err(Errors::InvalidRequest(format!(
                    "Invalid request: {}",
                    e.to_string()
                )));
            }
        },
        Err(e) => {
            return Err(Errors::InvalidRequest(format!(
                "Invalid request: {}",
                e.to_string()
            )))
        }
    };

    Ok(())
}
