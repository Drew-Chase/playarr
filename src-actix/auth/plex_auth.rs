use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use actix_web::cookie::{Cookie, SameSite};
use log::debug;
use serde::{Deserialize, Serialize};
use crate::config::{save_config, SharedConfig};
use crate::config::models::*;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[derive(Serialize, Deserialize)]
struct PinResponse {
    id: u64,
    code: String,
}

#[post("/pin")]
async fn request_pin(
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let resp = plex
        .plex_tv_post("/api/v2/pins")
        .form(&[("strong", "false")])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to request PIN: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse PIN response: {}", e))?;

    debug!("PIN created: id={}, code={}", body["id"], body["code"]);

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "id": body["id"],
        "code": body["code"]
    })))
}

#[get("/pin/{id}")]
async fn poll_pin(
    plex: web::Data<PlexClient>,
    path: web::Path<u64>,
) -> Result<HttpResponse> {
    let pin_id = path.into_inner();
    let resp = plex
        .plex_tv_get(&format!("/api/v2/pins/{}", pin_id))
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to poll PIN: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse PIN poll response: {}", e))?;

    let auth_token = body["authToken"].as_str().unwrap_or("");
    debug!("PIN {} poll: claimed={}", pin_id, !auth_token.is_empty());

    if !auth_token.is_empty() {
        // Fetch user info to get the Plex user ID for the cookie
        let user_resp = plex
            .plex_tv_get("/api/v2/user")
            .header("X-Plex-Token", auth_token)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get user info: {}", e))?;

        let user: serde_json::Value = user_resp
            .json()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to parse user response: {}", e))?;

        let user_id = user["id"].as_i64().unwrap_or(0);

        // Set HttpOnly cookie with format "{user_id}:{token}"
        let cookie_value = format!("{}:{}", user_id, auth_token);
        let cookie = Cookie::build("plex_user_token", cookie_value)
            .path("/")
            .http_only(true)
            .same_site(SameSite::Lax)
            .max_age(actix_web::cookie::time::Duration::days(365))
            .finish();

        debug!("Plex user {} authenticated via PIN, cookie set", user_id);

        Ok(HttpResponse::Ok()
            .cookie(cookie)
            .json(serde_json::json!({ "claimed": true })))
    } else {
        Ok(HttpResponse::Ok().json(serde_json::json!({ "claimed": false })))
    }
}

#[get("/user")]
async fn get_user(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    config: web::Data<SharedConfig>,
) -> Result<HttpResponse> {
    let (user_id, token) = PlexClient::user_from_request(&req)
        .ok_or_else(|| crate::http_error::Error::Unauthorized(
            "Not signed in".to_string(),
        ))?;

    let resp = plex
        .plex_tv_get("/api/v2/user")
        .header("X-Plex-Token", &token)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to get user info: {}", e))?;

    let status = resp.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err(crate::http_error::Error::Unauthorized(
            "Plex token expired. Please sign in again.".to_string(),
        ));
    }

    let mut body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse user response: {}", e))?;

    // Check if this user is the admin
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    body["isAdmin"] = serde_json::json!(user_id == cfg.plex.admin_user_id);

    Ok(HttpResponse::Ok().json(body))
}

#[post("/logout")]
async fn logout() -> HttpResponse {
    let cookie = Cookie::build("plex_user_token", "")
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(actix_web::cookie::time::Duration::ZERO)
        .finish();

    HttpResponse::Ok()
        .cookie(cookie)
        .json(serde_json::json!({ "success": true }))
}

// --- Setup & Status endpoints ---

#[get("/status")]
async fn server_status(
    config: web::Data<SharedConfig>,
) -> HttpResponse {
    let cfg = config.read().unwrap();
    let setup_complete = !cfg.plex.url.is_empty() && !cfg.plex.token.is_empty();
    HttpResponse::Ok().json(serde_json::json!({
        "setup_complete": setup_complete
    }))
}

#[derive(Deserialize)]
struct SetupRequest {
    plex_url: String,
    #[serde(default)]
    sonarr: Option<SonarrConfig>,
    #[serde(default)]
    radarr: Option<RadarrConfig>,
    #[serde(default)]
    download_clients: Option<Vec<DownloadClientConfig>>,
}

#[post("/setup")]
async fn initial_setup(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    body: web::Json<SetupRequest>,
) -> Result<HttpResponse> {
    let (user_id, token) = PlexClient::user_from_request(&req)
        .ok_or_else(|| crate::http_error::Error::Unauthorized(
            "Sign in first".to_string(),
        ))?;

    // Prevent re-setup if already configured
    {
        let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
        if !cfg.plex.url.is_empty() && !cfg.plex.token.is_empty() {
            return Err(crate::http_error::Error::BadRequest(
                "Server is already configured".to_string(),
            ));
        }
    }

    let body = body.into_inner();
    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.plex.url = body.plex_url.trim_end_matches('/').to_string();
    cfg.plex.token = token;
    cfg.plex.admin_user_id = user_id;
    if let Some(sonarr) = body.sonarr {
        cfg.sonarr = sonarr;
    }
    if let Some(radarr) = body.radarr {
        cfg.radarr = radarr;
    }
    if let Some(download_clients) = body.download_clients {
        cfg.download_clients = download_clients;
    }
    save_config(&cfg)?;

    debug!("Initial setup complete: url={}, admin_user_id={}", cfg.plex.url, user_id);

    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true })))
}

#[derive(Deserialize)]
struct SetupTestPath {
    service: String,
}

#[derive(Deserialize, Default)]
struct SetupTestBody {
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    api_key: Option<String>,
    #[serde(default, rename = "type")]
    client_type: Option<String>,
    #[serde(default)]
    username: Option<String>,
    #[serde(default)]
    password: Option<String>,
}

#[post("/setup/test/{service}")]
async fn setup_test_connection(
    config: web::Data<SharedConfig>,
    path: web::Path<SetupTestPath>,
    body: web::Json<SetupTestBody>,
) -> Result<HttpResponse> {
    // Only allow during setup phase
    {
        let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
        if !cfg.plex.url.is_empty() && !cfg.plex.token.is_empty() {
            return Err(crate::http_error::Error::BadRequest(
                "Setup is already complete. Use /api/settings/test instead.".to_string(),
            ));
        }
    }

    let body = body.into_inner();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;

    let url = body.url.unwrap_or_default();
    if url.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "message": "URL is required"
        })));
    }

    let result = match path.service.as_str() {
        "sonarr" => {
            let key = body.api_key.unwrap_or_default();
            let test_url = format!("{}/api/v3/system/status", url.trim_end_matches('/'));
            client.get(&test_url).header("X-Api-Key", &key).send().await
        }
        "radarr" => {
            let key = body.api_key.unwrap_or_default();
            let test_url = format!("{}/api/v3/system/status", url.trim_end_matches('/'));
            client.get(&test_url).header("X-Api-Key", &key).send().await
        }
        "download-client" => {
            let dc_type = body.client_type.unwrap_or_default();
            let dc_api_key = body.api_key.unwrap_or_default();
            let dc_username = body.username.unwrap_or_default();
            let dc_password = body.password.unwrap_or_default();
            return crate::settings::endpoints::test_download_client_connection(
                &client, &dc_type, &url, &dc_api_key, &dc_username, &dc_password,
            ).await;
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
        web::scope("/auth")
            .service(request_pin)
            .service(poll_pin)
            .service(get_user)
            .service(logout),
    );
}

pub fn configure_setup(cfg: &mut web::ServiceConfig) {
    cfg.service(server_status)
        .service(initial_setup)
        .service(setup_test_connection);
}
