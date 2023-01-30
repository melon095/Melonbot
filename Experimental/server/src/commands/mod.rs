use crate::types::{CommandResponse, ListResponse, ResponseType};

pub mod list;
pub mod request;

pub fn create_request_response<'a>(
    msg: &'a str,
    channel_id: &'a str,
    reply_id: Option<String>,
) -> serde_json::Result<String> {
    let response = ResponseType::Command(CommandResponse {
        channel_id: channel_id.to_string(),
        reply_id: reply_id,
        response: msg.to_string(),
    });

    serde_json::to_string(&response)
}

pub fn create_list_response(inner: ListResponse) -> serde_json::Result<String> {
    let response = ResponseType::List(inner);

    serde_json::to_string(&response)
}
