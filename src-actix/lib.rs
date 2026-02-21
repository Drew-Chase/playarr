use crate::asset_endpoint::AssetsAppConfig;
use actix_web::{App, HttpResponse, HttpServer, middleware, web};
use anyhow::Result;
use log::*;
use serde_json::json;
use vite_actix::proxy_vite_options::ProxyViteOptions;
use vite_actix::start_vite_server;

use watch_party::websocket::WsMessage;

mod asset_endpoint;
mod auth;
pub mod config;
mod discover;
mod downloads;
mod http_error;
mod plex;
mod radarr;
mod settings;
mod sonarr;
mod subtitles;
mod watch_party;

#[cfg(test)]
mod tests;

pub static DEBUG: bool = cfg!(debug_assertions);

pub async fn run() -> Result<()> {
    let port: u16 = std::env::var("PLAYARR_PORT")
        .unwrap_or("8080".to_string())
        .parse()
        .unwrap_or(8080);
    pretty_env_logger::env_logger::builder()
        .filter_level(if DEBUG {
            LevelFilter::Debug
        } else {
            LevelFilter::Info
        })
        .format_timestamp(None)
        .init();

    info!("Starting PlayServer v{}...", env!("CARGO_PKG_VERSION"));

    // Initialize shared state
    let shared_config = config::init_shared_config();
    let plex_client = web::Data::new(plex::client::PlexClient::new(shared_config.clone()));
    let sonarr_client = web::Data::new(sonarr::client::SonarrClient::new(shared_config.clone()));
    let radarr_client = web::Data::new(radarr::client::RadarrClient::new(shared_config.clone()));
    let room_manager = web::Data::new(watch_party::room::RoomManager::new());
    let config_data = web::Data::new(shared_config);

    // Spawn heartbeat task: every 500ms, broadcast server time + media_id to all playing rooms
    let hb_rooms = room_manager.clone();
    actix_web::rt::spawn(async move {
        let mut interval = actix_web::rt::time::interval(std::time::Duration::from_millis(500));
        loop {
            interval.tick().await;
            let ticks = hb_rooms.heartbeat_tick();
            let now = chrono::Utc::now().timestamp_millis() as u64;
            for (room_id, server_time, media_id) in ticks {
                hb_rooms.broadcast(&room_id, &WsMessage::Heartbeat {
                    server_time,
                    timestamp: now,
                    media_id,
                }).await;
            }
        }
    });

    let server = HttpServer::new(move || {
        App::new()
            .wrap(middleware::Logger::default())
            .app_data(
                web::JsonConfig::default()
                    .limit(262144)
                    .error_handler(|err, _req| {
                        let error = json!({ "error": format!("{}", err) });
                        actix_web::error::InternalError::from_response(
                            err,
                            HttpResponse::BadRequest().json(error),
                        )
                        .into()
                    }),
            )
            .app_data(config_data.clone())
            .app_data(plex_client.clone())
            .app_data(sonarr_client.clone())
            .app_data(radarr_client.clone())
            .app_data(room_manager.clone())
            .service(
                web::scope("api")
                    .configure(settings::endpoints::configure)
                    .configure(auth::plex_auth::configure)
                    .configure(auth::plex_auth::configure_setup)
                    .configure(plex::libraries::configure)
                    .configure(plex::media::configure)
                    .configure(plex::hub::configure)
                    .configure(plex::search::configure)
                    .configure(plex::timeline::configure)
                    .configure(|cfg: &mut web::ServiceConfig| {
                        cfg.service(
                            web::scope("/sonarr")
                                .configure(sonarr::series::configure)
                                .configure(sonarr::episodes::configure)
                                .configure(sonarr::calendar::configure)
                                .configure(sonarr::queue::configure)
                                .configure(sonarr::profiles::configure)
                                .configure(sonarr::commands::configure),
                        );
                    })
                    .configure(|cfg: &mut web::ServiceConfig| {
                        cfg.service(
                            web::scope("/radarr")
                                .configure(radarr::movies::configure)
                                .configure(radarr::calendar::configure)
                                .configure(radarr::queue::configure)
                                .configure(radarr::profiles::configure)
                                .configure(radarr::commands::configure),
                        );
                    })
                    .configure(discover::tmdb::configure)
                    .configure(downloads::configure)
                    .configure(subtitles::configure)
                    .configure(watch_party::configure)
                    .configure(plex::users::configure),
            )
            .configure_frontend_routes()
    })
    .workers(4)
    .bind(format!("0.0.0.0:{port}", port = port))?
    .run();

    info!(
        "Starting {} server at http://127.0.0.1:{}...",
        if DEBUG { "development" } else { "production" },
        port
    );

    if DEBUG {
	    ProxyViteOptions::default().disable_logging().build()?;
        start_vite_server().expect("Failed to start vite server");
    }

    let stop_result = server.await;
    debug!("Server stopped");

    Ok(stop_result?)
}
