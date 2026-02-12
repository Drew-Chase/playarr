use actix_web::{get, post, web, HttpResponse, Responder};
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

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "id": body["id"],
        "code": body["code"]
    })))
}

#[get("/pin/{id}")]
async fn poll_pin(
    plex: web::Data<PlexClient>,
    config: web::Data<SharedConfig>,
    path: web::Path<u64>,
) -> Result<impl Responder> {
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

    if !auth_token.is_empty() {
        // Store the token in config
        let mut cfg = config
            .write()
            .map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
        cfg.plex.token = auth_token.to_string();
        save_config(&cfg)?;

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "claimed": true,
            "auth_token": auth_token
        })))
    } else {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "claimed": false
        })))
    }
}

#[get("/user")]
async fn get_user(
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let token = plex.token();
    if token.is_empty() {
        return Err(crate::http_error::Error::Unauthorized(
            "No Plex token configured".to_string(),
        ));
    }

    let resp = plex
        .plex_tv_get("/api/v2/user")
        .header("X-Plex-Token", &token)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to get user info: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse user response: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

#[post("/logout")]
async fn logout(
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    let mut cfg = config
        .write()
        .map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    cfg.plex.token.clear();
    save_config(&cfg)?;
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
