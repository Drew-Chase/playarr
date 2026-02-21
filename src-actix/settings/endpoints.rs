use actix_web::{get, post, put, web, HttpRequest, HttpResponse, Responder};
use serde::Deserialize;
use crate::config::{save_config, SharedConfig};
use crate::config::models::*;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

/// Verify the requesting user is the admin. Returns Err(Unauthorized) if not.
fn require_admin(req: &HttpRequest, config: &SharedConfig) -> Result<()> {
    let (user_id, _) = PlexClient::user_from_request(req)
        .ok_or_else(|| crate::http_error::Error::Unauthorized("Not signed in".to_string()))?;
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    if user_id != cfg.plex.admin_user_id {
        return Err(crate::http_error::Error::Unauthorized("Admin access required".to_string()));
    }
    Ok(())
}

#[get("")]
async fn get_settings(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    require_admin(&req, &config)?;
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/plex")]
async fn update_plex(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    body: web::Json<serde_json::Value>,
) -> Result<impl Responder> {
    require_admin(&req, &config)?;
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let updates = body.into_inner();
    if let Some(url) = updates["url"].as_str() {
        cfg.plex.url = url.to_string();
    }
    if let Some(token) = updates["token"].as_str() {
        cfg.plex.token = token.to_string();
    }
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/sonarr")]
async fn update_sonarr(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    body: web::Json<SonarrConfig>,
) -> Result<impl Responder> {
    require_admin(&req, &config)?;
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.sonarr = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/radarr")]
async fn update_radarr(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    body: web::Json<RadarrConfig>,
) -> Result<impl Responder> {
    require_admin(&req, &config)?;
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.radarr = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/download-clients")]
async fn update_download_clients(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    body: web::Json<Vec<DownloadClientConfig>>,
) -> Result<impl Responder> {
    require_admin(&req, &config)?;
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.download_clients = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[put("/opensubtitles")]
async fn update_opensubtitles(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    body: web::Json<OpenSubtitlesConfig>,
) -> Result<impl Responder> {
    require_admin(&req, &config)?;
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.opensubtitles = body.into_inner();
    save_config(&cfg)?;
    Ok(HttpResponse::Ok().json(cfg.redacted()))
}

#[derive(Deserialize)]
struct TestServicePath {
    service: String,
}

#[derive(Deserialize, Default)]
struct TestConnectionBody {
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    token: Option<String>,
    #[serde(default)]
    api_key: Option<String>,
    #[serde(default, rename = "type")]
    client_type: Option<String>,
    #[serde(default)]
    username: Option<String>,
    #[serde(default)]
    password: Option<String>,
}

/// Return `override_val` if non-empty, otherwise `saved_val`.
fn pick(override_val: &Option<String>, saved_val: &str) -> String {
    match override_val {
        Some(v) if !v.is_empty() => v.clone(),
        _ => saved_val.to_string(),
    }
}

pub async fn test_download_client_connection(
    client: &reqwest::Client,
    client_type: &str,
    url: &str,
    api_key: &str,
    username: &str,
    password: &str,
) -> Result<HttpResponse> {
    let base = url.trim_end_matches('/');
    let result = match client_type {
        "sabnzbd" => {
            let api_url = format!("{}/api?mode=version&output=json&apikey={}", base, api_key);
            client.get(&api_url).send().await
        }
        "nzbget" => {
            let api_url = if !username.is_empty() {
                let authed = base.replacen("://", &format!("://{}:{}@", username, password), 1);
                format!("{}/jsonrpc", authed)
            } else {
                format!("{}/jsonrpc", base)
            };
            client
                .post(&api_url)
                .json(&serde_json::json!({"method": "version", "params": []}))
                .send()
                .await
        }
        "qbittorrent" => {
            let api_url = format!("{}/api/v2/app/version", base);
            client.get(&api_url).send().await
        }
        "transmission" => {
            let api_url = format!("{}/transmission/rpc", base);
            let mut req = client
                .post(&api_url)
                .json(&serde_json::json!({"method": "session-get"}));
            if !username.is_empty() {
                req = req.basic_auth(username, Some(password));
            }
            let resp = req.send().await;
            // Transmission returns 409 with session ID header on first request - that counts as reachable
            match resp {
                Ok(r) if r.status().as_u16() == 409 => {
                    return Ok(HttpResponse::Ok().json(serde_json::json!({
                        "success": true,
                        "message": "Connection successful"
                    })));
                }
                other => other,
            }
        }
        _ => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "success": false,
                "message": format!("Unknown client type: {}", client_type)
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

#[post("/test/{service}")]
async fn test_connection(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    path: web::Path<TestServicePath>,
    body: web::Json<TestConnectionBody>,
) -> Result<impl Responder> {
    require_admin(&req, &config)?;
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let body = body.into_inner();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;

    let result = match path.service.as_str() {
        "plex" => {
            let plex_url = pick(&body.url, &cfg.plex.url);
            let plex_token = pick(&body.token, &cfg.plex.token);
            if plex_url.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "Plex URL is not configured"
                })));
            }
            let mut url = plex_url.trim_end_matches('/').to_string();
            url.push_str("/identity");
            let mut req = client.get(&url);
            if !plex_token.is_empty() {
                req = req.header("X-Plex-Token", &plex_token);
            }
            req.send().await
        }
        "sonarr" => {
            let sonarr_url = pick(&body.url, &cfg.sonarr.url);
            let sonarr_key = pick(&body.api_key, &cfg.sonarr.api_key);
            if sonarr_url.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "Sonarr URL is not configured"
                })));
            }
            let url = format!("{}/api/v3/system/status", sonarr_url.trim_end_matches('/'));
            client
                .get(&url)
                .header("X-Api-Key", &sonarr_key)
                .send()
                .await
        }
        "radarr" => {
            let radarr_url = pick(&body.url, &cfg.radarr.url);
            let radarr_key = pick(&body.api_key, &cfg.radarr.api_key);
            if radarr_url.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "Radarr URL is not configured"
                })));
            }
            let url = format!("{}/api/v3/system/status", radarr_url.trim_end_matches('/'));
            client
                .get(&url)
                .header("X-Api-Key", &radarr_key)
                .send()
                .await
        }
        "opensubtitles" => {
            let api_key = pick(&body.api_key, &cfg.opensubtitles.api_key);
            if api_key.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "OpenSubtitles API key is not configured"
                })));
            }
            client
                .get("https://api.opensubtitles.com/api/v1/infos/user")
                .header("Api-Key", &api_key)
                .header("User-Agent", format!("Playarr v{}", env!("CARGO_PKG_VERSION")))
                .send()
                .await
        }
        "download-client" => {
            let dc_url = body.url.unwrap_or_default();
            let dc_type = body.client_type.unwrap_or_default();
            if dc_url.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "URL is required"
                })));
            }
            if dc_type.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "message": "Client type is required"
                })));
            }
            let dc_api_key = body.api_key.unwrap_or_default();
            let dc_username = body.username.unwrap_or_default();
            let dc_password = body.password.unwrap_or_default();
            return test_download_client_connection(&client, &dc_type, &dc_url, &dc_api_key, &dc_username, &dc_password).await;
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
            .service(update_download_clients)
            .service(update_opensubtitles)
            .service(test_connection),
    );
}
