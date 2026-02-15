use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use crate::config::SharedConfig;
use crate::http_error::{self, Result};
use super::client::PlexClient;

#[get("")]
async fn list_plex_users(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    let (user_id, _) = PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    if user_id != cfg.plex.admin_user_id {
        return Err(http_error::Error::Forbidden("Admin access required".to_string()));
    }
    drop(cfg);

    let friends = plex.fetch_friends().await?;

    let users: Vec<serde_json::Value> = friends.iter().map(|f| {
        serde_json::json!({
            "id": f["id"],
            "username": f["username"].as_str().or(f["title"].as_str()).unwrap_or(""),
            "title": f["title"].as_str().unwrap_or(""),
            "email": f["email"].as_str().unwrap_or(""),
            "thumb": f["thumb"].as_str().unwrap_or(""),
        })
    }).collect();

    Ok(HttpResponse::Ok().json(users))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/plex/users").service(list_plex_users));
}
