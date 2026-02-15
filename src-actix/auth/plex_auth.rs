use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use actix_web::cookie::{Cookie, SameSite};
use log::debug;
use serde::{Deserialize, Serialize};
use crate::config::{save_config, SharedConfig};
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

    let mut cfg = config.write().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.plex.url = body.plex_url.trim_end_matches('/').to_string();
    cfg.plex.token = token;
    cfg.plex.admin_user_id = user_id;
    save_config(&cfg)?;

    debug!("Initial setup complete: url={}, admin_user_id={}", cfg.plex.url, user_id);

    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true })))
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
        .service(initial_setup);
}
