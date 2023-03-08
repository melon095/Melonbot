use simplelog::{ColorChoice, LevelFilter, TermLogger};
use tokio::{
    select,
    sync::{broadcast, mpsc},
};

extern crate simplelog;

fn create_logger() {
    let simple_log_config = simplelog::ConfigBuilder::new()
        .set_location_level(LevelFilter::Error)
        .set_time_level(LevelFilter::Error)
        .build();

    TermLogger::init(
        LevelFilter::Debug,
        simple_log_config,
        simplelog::TerminalMode::Mixed,
        ColorChoice::Always,
    )
    .unwrap();
}

fn get_config_path() -> String {
    let env_var = "TWITCH_FIREHOSE_CONFIG_PATH";
    let default_path = "config.json";

    match std::env::var(env_var) {
        Ok(path) => path,
        Err(_) => default_path.to_string(),
    }
}

#[tokio::main]
async fn main() {
    create_logger();

    let config = twitch_firehose_server::Config::create(get_config_path()).unwrap();

    let (tx_twitch_request, rx_twitch_request) = mpsc::channel(100);

    let (tx_twitch_event, _) = broadcast::channel(1000);

    let websocket_listener = twitch_firehose_server::websocket::listen(
        config.listening_port,
        tx_twitch_request,
        tx_twitch_event.clone(),
    );

    let twitch_connection = twitch_firehose_server::twitch::connect(
        config.twitch_oauth,
        config.twitch_username,
        rx_twitch_request,
        tx_twitch_event,
    );

    select! {
        _ = websocket_listener => {
            log::info!("Websocket listener exited")
        }
        _ = twitch_connection => {
            log::info!("Twitch connection exited")
        }
        _ = tokio::signal::ctrl_c() => {
            log::info!("Ctrl-C received")
        }
    }
}

// TODO:
// Create a connection to twitch
// Create a websocket server

// Accept websocket connections
// Listen for events from websocket

// Send events to twitch

// Receive events from twitch
// Broadcast to all websocket clients
