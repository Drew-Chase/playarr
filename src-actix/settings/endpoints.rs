use actix_web::{get, post, put, web, HttpResponse, Responder};
use serde::Deserialize;
use crate::config::{save_config, SharedConfig};
use crate::config::models::*;
use crate::http_error::Result;

#[get("")]
async fn get_settings(config: web::Data<SharedConfig>) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/plex")]
async fn update_plex(
    config: web::Data<SharedConfig>,
    body: web::Json<PlexConfig>,
) -> Result<impl Responder> {
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.plex = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/sonarr")]
async fn update_sonarr(
    config: web::Data<SharedConfig>,
    body: web::Json<SonarrConfig>,
) -> Result<impl Responder> {
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.sonarr = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/radarr")]
async fn update_radarr(
    config: web::Data<SharedConfig>,
    body: web::Json<RadarrConfig>,
) -> Result<impl Responder> {
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.radarr = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/tmdb")]
async fn update_tmdb(
    config: web::Data<SharedConfig>,
    body: web::Json<TmdbConfig>,
) -> Result<impl Responder> {
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.tmdb = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/download-clients")]
async fn update_download_clients(
    config: web::Data<SharedConfig>,
    body: web::Json<Vec<DownloadClientConfig>>,
) -> Result<impl Responder> {
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.download_clients = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[derive(Deserialize)]
struct TestServicePath {
    service: String,
}

#[post("/test/{service}")]
async fn test_connection(
    config: web::Data<SharedConfig>,
    path: web::Path<TestServicePath>,
) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;

    let result = match path.service.as_str() {
        "plex" => {
            if cfg.plex.url.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "Plex URL is not configured"
                })));
            }
            let mut url = cfg.plex.url.trim_end_matches('/').to_string();
            url.push_str("/identity");
            let mut req = client.get(&url);
            if !cfg.plex.token.is_empty() {
                req = req.header("X-Plex-Token", &cfg.plex.token);
            }
            req.send().await
        }
        "sonarr" => {
            if cfg.sonarr.url.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "Sonarr URL is not configured"
                })));
            }
            let url = format!("{}/api/v3/system/status", cfg.sonarr.url.trim_end_matches('/'));
            client
                .get(&url)
                .header("X-Api-Key", &cfg.sonarr.api_key)
                .send()
                .await
        }
        "radarr" => {
            if cfg.radarr.url.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "Radarr URL is not configured"
                })));
            }
            let url = format!("{}/api/v3/system/status", cfg.radarr.url.trim_end_matches('/'));
            client
                .get(&url)
                .header("X-Api-Key", &cfg.radarr.api_key)
                .send()
                .await
        }
        "tmdb" => {
            if cfg.tmdb.api_key.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "TMDB API key is not configured"
                })));
            }
            let url = format!(
                "https://api.themoviedb.org/3/configuration?api_key={}",
                cfg.tmdb.api_key
            );
            client.get(&url).send().await
        }
        _ => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "success": false,
                "message": format!("Unknown service: {}", path.service)
            })));
        }
    };

    match result {
        Ok(resp) if resp.status().is_success() => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "message": "Connection successful"
            })))
        }
        Ok(resp) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": false,
                "message": format!("Service returned status {}", resp.status())
            })))
        }
        Err(e) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": false,
                "message": format!("Connection failed: {}", e)
            })))
        }
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/settings")
            .service(get_settings)
            .service(update_plex)
            .service(update_sonarr)
            .service(update_radarr)
            .service(update_tmdb)
            .service(update_download_clients)
            .service(test_connection),
    );
}
