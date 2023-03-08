use tokio::{
    sync::{broadcast, mpsc},
    time::Instant,
};
use twitch_irc::{
    login::StaticLoginCredentials, message::ServerMessage, ClientConfig, SecureTCPTransport,
};

use crate::{MessageRequest, MessageResponse};

type TwitchClient = twitch_irc::TwitchIRCClient<SecureTCPTransport, StaticLoginCredentials>;

fn clean_oauth<Oauth: AsRef<str>>(oauth: Oauth) -> String {
    let oauth = oauth.as_ref();
    if oauth.starts_with("oauth:") {
        oauth[6..].to_string()
    } else {
        oauth.to_string()
    }
}

pub async fn connect(
    oauth: String,
    username: String,
    mut tmi_request: mpsc::Receiver<MessageRequest>,
    event_sender: broadcast::Sender<MessageResponse>,
) -> anyhow::Result<()> {
    log::info!("Connecting to Twitch IRC");
    let credentials = StaticLoginCredentials::new(username, Some(clean_oauth(oauth)));
    let (mut incoming_messages, client) = TwitchClient::new(ClientConfig::new_simple(credentials));
    client.connect().await;

    let mut tmi_delay: Option<Instant> = None;

    loop {
        tokio::select! {
            tmi_msg = incoming_messages.recv() => {
                let tmi_msg = match tmi_msg {
                    Some(msg) => msg,
                    None => {
                        log::warn!("TMI connection closed. should not happen ?");
                        return Ok(());
                    }
                };

                if let ServerMessage::Ping(_) = tmi_msg {
                    if let Some(intermediate_delay_time) = tmi_delay {
                        let delay = intermediate_delay_time.elapsed();
                        log::info!("TMI ping delay: {:?}", delay);
                        tmi_delay = Some(Instant::now());
                    }
                }

                 let _ = event_sender.send(MessageResponse::Irc(tmi_msg));
            },
            request_msg = tmi_request.recv() => {
                log::info!("Received request: {:?}", request_msg);

                match request_msg {
                    Some(MessageRequest::Join(channel)) => {
                        if let Err(err) = client.join(channel) {
                            log::error!("Error joining channel: {}", err);
                        }
                    },
                    Some(MessageRequest::Leave(channel)) => {
                        client.part(channel);
                    },
                    Some(MessageRequest::Privmsg(channel, message)) => {
                        if let Err(err) = client.say(channel, message).await {
                            log::error!("Error sending message: {}", err);
                        }
                    },
                    Some(MessageRequest::Reply(repl_ctx, message)) => {
                       if let Err(err) = client.say_in_reply_to(&repl_ctx, message).await {
                            log::error!("Error sending reply: {}", err);
                       }
                    },
                    Some(MessageRequest::TmiDelay) => {
                        if let Some(tmi_delay) = tmi_delay {
                            event_sender.send(MessageResponse::TmiDelay(tmi_delay.elapsed().as_secs())).unwrap();
                        }
                    },
                    None => {
                        log::info!("TMI request channel closed");
                    }
                }
            },
        }
    }
}
