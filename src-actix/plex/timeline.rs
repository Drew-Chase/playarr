use actix_web::{put, web, HttpRequest, HttpResponse, Responder};
use serde::Deserialize;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[derive(Deserialize)]
struct TimelineUpdate {
    #[serde(rename = "ratingKey")]
    rating_key: String,
    key: String,
    state: String,
    time: u64,
    duration: u64,
}

#[put("/timeline")]
async fn update_timeline(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    body: web::Json<TimelineUpdate>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let request = plex
        .get_as_user("/:/timeline", &user_token)?
        .query(&[
            ("ratingKey", body.rating_key.as_str()),
            ("key", body.key.as_str()),
            ("state", body.state.as_str()),
            ("time", &body.time.to_string()),
            ("duration", &body.duration.to_string()),
            ("hasMDE", "1"),
        ]);

    let resp = request.send().await
        .map_err(|e| anyhow::anyhow!("Failed to update timeline: {}", e))?;

    if resp.status().is_success() {
        Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true })))
    } else {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": false,
            "status": resp.status().as_u16()
        })))
    }
}

#[put("/scrobble/{id}")]
async fn scrobble(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let request = plex
        .get_as_user("/:/scrobble", &user_token)?
        .query(&[("identifier", "com.plexapp.plugins.library"), ("key", id.as_str())]);

    let resp = request.send().await
        .map_err(|e| anyhow::anyhow!("Failed to scrobble: {}", e))?;

    if resp.status().is_success() {
        Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true })))
    } else {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": false,
            "status": resp.status().as_u16()
        })))
    }
}

#[put("/unscrobble/{id}")]
async fn unscrobble(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let request = plex
        .get_as_user("/:/unscrobble", &user_token)?
        .query(&[("identifier", "com.plexapp.plugins.library"), ("key", id.as_str())]);

    let resp = request.send().await
        .map_err(|e| anyhow::anyhow!("Failed to unscrobble: {}", e))?;

    if resp.status().is_success() {
        Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true })))
    } else {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": false,
            "status": resp.status().as_u16()
        })))
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/player")
            .service(update_timeline)
            .service(scrobble)
            .service(unscrobble),
    );
}
