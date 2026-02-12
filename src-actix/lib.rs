use actix_web::{middleware, web, App, HttpResponse, HttpServer};
use serde_json::json;
use log::*;
use anyhow::Result;
use vite_actix::proxy_vite_options::ProxyViteOptions;
use crate::asset_endpoint::AssetsAppConfig;
use vite_actix::start_vite_server;

mod asset_endpoint;
mod http_error;
pub mod config;
mod settings;
mod auth;
mod plex;
mod sonarr;
mod radarr;
mod discover;
mod downloads;
mod watch_party;

#[cfg(test)]
mod tests;

pub static DEBUG: bool = cfg!(debug_assertions);
const PORT: u16 = 8080;


pub async fn run() -> Result<()> {
	pretty_env_logger::env_logger::builder()
		.filter_level(if DEBUG {
			LevelFilter::Debug
		} else {
			LevelFilter::Info
		})
		.format_timestamp(None)
		.init();

	// Initialize shared state
	let shared_config = config::init_shared_config();
	let plex_client = web::Data::new(plex::client::PlexClient::new(shared_config.clone()));
	let sonarr_client = web::Data::new(sonarr::client::SonarrClient::new(shared_config.clone()));
	let radarr_client = web::Data::new(radarr::client::RadarrClient::new(shared_config.clone()));
	let room_manager = web::Data::new(watch_party::room::RoomManager::new());
	let config_data = web::Data::new(shared_config);

	let server = HttpServer::new(move || {
		App::new()
			.wrap(middleware::Logger::default())
			.app_data(
				web::JsonConfig::default()
					.limit(4096)
					.error_handler(|err, _req| {
						let error = json!({ "error": format!("{}", err) });
						actix_web::error::InternalError::from_response(
							err,
							HttpResponse::BadRequest().json(error),
						).into()
					})
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
						);
					})
					.configure(|cfg: &mut web::ServiceConfig| {
						cfg.service(
							web::scope("/radarr")
								.configure(radarr::movies::configure)
								.configure(radarr::calendar::configure)
								.configure(radarr::queue::configure)
						);
					})
					.configure(discover::tmdb::configure)
					.configure(downloads::configure)
					.configure(watch_party::configure)
			)
			.configure_frontend_routes()
	})
		.workers(4)
		.bind(format!("0.0.0.0:{port}", port = PORT))?
		.run();

	info!(
        "Starting {} server at http://127.0.0.1:{}...",
        if DEBUG { "development" } else { "production" },
        PORT
    );



	if DEBUG {
		start_vite_server().expect("Failed to start vite server");
	}


	let stop_result = server.await;
	debug!("Server stopped");

	Ok(stop_result?)
}
