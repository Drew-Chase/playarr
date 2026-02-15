use actix_web::{post, put, web, HttpRequest, HttpResponse, Responder};
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
    let session_client_id = plex.playback_client_id(&req);
    let time_str = body.time.to_string();
    let duration_str = body.duration.to_string();
    let resp = plex
        .send_for_session("/:/timeline", &user_token, &session_client_id, &[
            ("ratingKey", body.rating_key.as_str()),
            ("key", body.key.as_str()),
            ("state", body.state.as_str()),
            ("time", &time_str),
            ("duration", &duration_str),
            ("hasMDE", "1"),
        ])
        .await?;

    if resp.status().is_success() {
        Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true })))
    } else {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": false,
            "status": resp.status().as_u16()
        })))
    }
}

/// Stop endpoint for navigator.sendBeacon (POST, no custom headers).
/// The session ID comes from the request body since sendBeacon cannot set headers.
#[derive(Deserialize)]
struct StopRequest {
    #[serde(rename = "ratingKey")]
    rating_key: String,
    key: String,
    time: u64,
    duration: u64,
    #[serde(rename = "sessionId")]
    session_id: Option<String>,
}

#[post("/stop")]
async fn stop_playback(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    body: web::Json<StopRequest>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let session_client_id = plex.session_to_client_id(body.session_id.as_deref());
    let time_str = body.time.to_string();
    let duration_str = body.duration.to_string();
    let _ = plex
        .send_for_session("/:/timeline", &user_token, &session_client_id, &[
            ("ratingKey", body.rating_key.as_str()),
            ("key", body.key.as_str()),
            ("state", "stopped"),
            ("time", &time_str),
            ("duration", &duration_str),
            ("hasMDE", "1"),
        ])
        .await;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true })))
}

#[put("/scrobble/{id}")]
async fn scrobble(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let session_client_id = plex.playback_client_id(&req);
    let resp = plex
        .send_for_session("/:/scrobble", &user_token, &session_client_id, &[
            ("identifier", "com.plexapp.plugins.library"),
            ("key", id.as_str()),
        ])
        .await?;

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
    let session_client_id = plex.playback_client_id(&req);
    let resp = plex
        .send_for_session("/:/unscrobble", &user_token, &session_client_id, &[
            ("identifier", "com.plexapp.plugins.library"),
            ("key", id.as_str()),
        ])
        .await?;

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
            .service(stop_playback)
            .service(scrobble)
            .service(unscrobble),
    );
}
