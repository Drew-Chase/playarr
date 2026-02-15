use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use actix_web::cookie::{Cookie, SameSite};
use log::{debug, warn};
use serde::{Deserialize, Serialize};
use crate::config::{save_config, SharedConfig};
use crate::config::models::*;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

/// Extract an XML attribute value like `name="value"` from a string.
fn extract_xml_attr(xml: &str, attr: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr);
    let start = xml.find(&pattern)? + pattern.len();
    let end = start + xml[start..].find('"')?;
    Some(xml[start..end].to_string())
}

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

        // For non-admin users, resolve a server-specific access token.
        // A friend's plex.tv token doesn't work directly against the local PMS;
        // they need the accessToken from the plex.tv resources API.
        let cfg = plex.config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
        let is_admin = user_id == cfg.plex.admin_user_id;
        drop(cfg);

        let server_token = if is_admin {
            auth_token.to_string()
        } else {
            match plex.resolve_server_access_token(auth_token).await {
                Some(token) => {
                    debug!("Resolved server access token for user {}", user_id);
                    token
                }
                None => {
                    warn!("Could not resolve server access token for user {}; falling back to plex.tv token", user_id);
                    auth_token.to_string()
                }
            }
        };

        // Set HttpOnly cookie: "{user_id}:{plex_tv_token}:{server_access_token}"
        let cookie_value = format!("{}:{}:{}", user_id, auth_token, server_token);
        let cookie = Cookie::build("plex_user_token", cookie_value)
            .path("/")
            .http_only(true)
            .same_site(SameSite::Lax)
            .max_age(actix_web::cookie::time::Duration::days(365))
            .finish();

        debug!("Plex user {} authenticated via PIN, cookie set (admin={})", user_id, is_admin);

        Ok(HttpResponse::Ok()
            .cookie(cookie)
            .json(serde_json::json!({ "claimed": true })))
    } else {
        Ok(HttpResponse::Ok().json(serde_json::json!({ "claimed": false })))
    }
}

#[get("/guest")]
async fn check_guest_available(
    plex: web::Data<PlexClient>,
    config: web::Data<SharedConfig>,
) -> Result<HttpResponse> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let admin_token = cfg.plex.token.clone();
    drop(cfg);

    if admin_token.is_empty() {
        return Ok(HttpResponse::Ok().json(serde_json::json!({ "available": false })));
    }

    let resp = plex
        .plex_tv_get("/api/v2/home")
        .header("X-Plex-Token", &admin_token)
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => {
            let body: serde_json::Value = r.json().await
                .map_err(|e| anyhow::anyhow!("Failed to parse home response: {}", e))?;

            let guest_enabled = body["guestEnabled"].as_bool().unwrap_or(false)
                || body["guestEnabled"].as_i64() == Some(1);
            let guest_user_id = body["guestUserID"].as_i64().unwrap_or(0);

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "available": guest_enabled && guest_user_id > 0
            })))
        }
        _ => Ok(HttpResponse::Ok().json(serde_json::json!({ "available": false }))),
    }
}

#[post("/guest-login")]
async fn guest_login(
    plex: web::Data<PlexClient>,
    config: web::Data<SharedConfig>,
) -> Result<HttpResponse> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let admin_token = cfg.plex.token.clone();
    drop(cfg);

    if admin_token.is_empty() {
        return Err(crate::http_error::Error::ServiceUnavailable(
            "Server not configured".to_string(),
        ));
    }

    // Get home info to find guest user ID
    let home_resp = plex
        .plex_tv_get("/api/v2/home")
        .header("X-Plex-Token", &admin_token)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to get home info: {}", e))?;

    let home: serde_json::Value = home_resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse home response: {}", e))?;

    let guest_enabled = home["guestEnabled"].as_bool().unwrap_or(false)
        || home["guestEnabled"].as_i64() == Some(1);
    let guest_user_id = home["guestUserID"].as_i64().unwrap_or(0);

    if !guest_enabled || guest_user_id == 0 {
        return Err(crate::http_error::Error::BadRequest(
            "Guest access is not enabled on this Plex Home".to_string(),
        ));
    }

    // Switch to guest user
    let switch_resp = plex
        .plex_tv_post(&format!("/api/home/users/{}/switch", guest_user_id))
        .header("X-Plex-Token", &admin_token)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to switch to guest user: {}", e))?;

    if !switch_resp.status().is_success() {
        let status = switch_resp.status();
        return Err(anyhow::anyhow!(
            "Plex returned HTTP {} when switching to guest user",
            status.as_u16()
        ).into());
    }

    // The v1 switch endpoint returns XML, so read as text and extract the token
    let switch_text = switch_resp.text().await
        .map_err(|e| anyhow::anyhow!("Failed to read switch response: {}", e))?;

    debug!("Guest switch response: {}", &switch_text[..switch_text.len().min(500)]);

    // Try JSON first, fall back to XML attribute extraction
    let guest_token = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&switch_text) {
        json["authToken"].as_str()
            .or(json["authenticationToken"].as_str())
            .map(|s| s.to_string())
    } else {
        // Extract authenticationToken="..." from XML
        extract_xml_attr(&switch_text, "authenticationToken")
            .or_else(|| extract_xml_attr(&switch_text, "authToken"))
    }
    .ok_or_else(|| anyhow::anyhow!("No auth token in switch response"))?;

    // Resolve server access token for guest user
    let server_token = match plex.resolve_server_access_token(&guest_token).await {
        Some(token) => {
            debug!("Resolved server access token for guest user {}", guest_user_id);
            token
        }
        None => {
            warn!("Could not resolve server access token for guest user; falling back to admin token");
            admin_token.clone()
        }
    };

    let cookie_value = format!("{}:{}:{}", guest_user_id, guest_token, server_token);
    let cookie = Cookie::build("plex_user_token", cookie_value)
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(actix_web::cookie::time::Duration::days(365))
        .finish();

    debug!("Guest user {} authenticated, cookie set", guest_user_id);

    Ok(HttpResponse::Ok()
        .cookie(cookie)
        .json(serde_json::json!({ "success": true })))
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

    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let is_admin = user_id == cfg.plex.admin_user_id;
    let admin_token = cfg.plex.token.clone();
    drop(cfg);

    // Non-admin users might be guest/managed users. Check the home endpoint
    // to definitively identify them, since plex.tv /api/v2/user may return
    // the home owner's info for managed user tokens.
    if !is_admin {
        if let Ok(home_resp) = plex
            .plex_tv_get("/api/v2/home")
            .header("X-Plex-Token", &admin_token)
            .send()
            .await
        {
            if let Ok(home) = home_resp.json::<serde_json::Value>().await {
                let guest_enabled = home["guestEnabled"].as_bool().unwrap_or(false)
                    || home["guestEnabled"].as_i64() == Some(1);
                let guest_user_id = home["guestUserID"].as_i64().unwrap_or(0);

                if guest_enabled && guest_user_id == user_id {
                    debug!("Identified guest user {} from home endpoint", user_id);
                    return Ok(HttpResponse::Ok().json(serde_json::json!({
                        "id": user_id,
                        "uuid": home["guestUserUUID"].as_str().unwrap_or(""),
                        "username": "Guest",
                        "title": "Guest",
                        "email": "",
                        "thumb": "",
                        "isAdmin": false,
                        "isGuest": true,
                    })));
                }
            }
        }
    }

    // Admin or regular shared user — fetch info from plex.tv
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

    body["isAdmin"] = serde_json::json!(is_admin);
    body["isGuest"] = serde_json::json!(false);

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
            .service(logout)
            .service(check_guest_available)
            .service(guest_login),
    );
}

pub fn configure_setup(cfg: &mut web::ServiceConfig) {
    cfg.service(server_status)
        .service(initial_setup)
        .service(setup_test_connection);
}
