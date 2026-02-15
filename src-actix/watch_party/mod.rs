pub mod room;
pub mod websocket;
pub mod queue;

use actix_web::{delete, get, post, web, HttpRequest, HttpResponse, Responder};
use serde::Deserialize;
use crate::http_error::{self, Result};
use crate::plex::client::PlexClient;
use room::{RoomAccessMode, RoomManager};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateRoomRequest {
    #[serde(default)]
    name: Option<String>,
    access_mode: RoomAccessMode,
    #[serde(default)]
    allowed_user_ids: Vec<i64>,
}

#[post("/rooms")]
async fn create_room(
    req: HttpRequest,
    rooms: web::Data<RoomManager>,
    plex: web::Data<PlexClient>,
    body: web::Json<CreateRoomRequest>,
) -> Result<impl Responder> {
    let (user_id, token) = PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let user_info = plex.fetch_user_info(&token).await
        .unwrap_or_else(|_| crate::plex::client::PlexUserInfo {
            user_id,
            username: format!("User {}", user_id),
            thumb: String::new(),
        });

    let room = rooms.create_room(
        body.name.clone(),
        user_id,
        user_info.username,
        user_info.thumb,
        body.access_mode.clone(),
        body.allowed_user_ids.clone(),
    );

    Ok(HttpResponse::Ok().json(room))
}

#[get("/rooms")]
async fn list_rooms(
    req: HttpRequest,
    rooms: web::Data<RoomManager>,
) -> Result<impl Responder> {
    let (user_id, _) = PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let visible_rooms = rooms.list_rooms_for_user(user_id);
    Ok(HttpResponse::Ok().json(visible_rooms))
}

#[get("/rooms/{id}")]
async fn get_room(
    req: HttpRequest,
    rooms: web::Data<RoomManager>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let _ = PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let room_id: uuid::Uuid = path.into_inner()
        .parse()
        .map_err(|_| http_error::Error::BadRequest("Invalid room ID".to_string()))?;

    match rooms.get_room(&room_id) {
        Some(room) => Ok(HttpResponse::Ok().json(room)),
        None => Err(http_error::Error::NotFound("Room not found".to_string())),
    }
}

#[delete("/rooms/{id}")]
async fn delete_room(
    req: HttpRequest,
    rooms: web::Data<RoomManager>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let (user_id, _) = PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let room_id: uuid::Uuid = path.into_inner()
        .parse()
        .map_err(|_| http_error::Error::BadRequest("Invalid room ID".to_string()))?;

    if !rooms.is_host(&room_id, user_id) {
        return Err(http_error::Error::Forbidden("Only the host can close this room".to_string()));
    }

    rooms.close_room(&room_id).await;
    Ok(HttpResponse::Ok().json(serde_json::json!({"success": true})))
}

#[derive(Deserialize)]
struct KickRequest {
    user_id: i64,
    #[serde(default)]
    reason: Option<String>,
}

#[post("/rooms/{id}/kick")]
async fn kick_user(
    req: HttpRequest,
    rooms: web::Data<RoomManager>,
    path: web::Path<String>,
    body: web::Json<KickRequest>,
) -> Result<impl Responder> {
    let (host_user_id, _) = PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let room_id: uuid::Uuid = path.into_inner()
        .parse()
        .map_err(|_| http_error::Error::BadRequest("Invalid room ID".to_string()))?;

    if !rooms.is_host(&room_id, host_user_id) {
        return Err(http_error::Error::Forbidden("Only the host can kick users".to_string()));
    }

    rooms.kick_user(&room_id, body.user_id, body.reason.clone()).await;
    Ok(HttpResponse::Ok().json(serde_json::json!({"success": true})))
}

#[get("/join/{code}")]
async fn join_by_invite_code(
    req: HttpRequest,
    rooms: web::Data<RoomManager>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let (user_id, _) = PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let code = path.into_inner().to_uppercase();

    let room_id = rooms.room_id_by_invite_code(&code)
        .ok_or_else(|| http_error::Error::NotFound("Invalid or expired invite code".to_string()))?;

    // Grant access so they can join via WebSocket
    rooms.grant_access(&room_id, user_id);

    let room = rooms.get_room(&room_id)
        .ok_or_else(|| http_error::Error::NotFound("Room no longer exists".to_string()))?;

    Ok(HttpResponse::Ok().json(room))
}

#[get("/rooms/{id}/ws")]
async fn room_websocket(
    req: HttpRequest,
    stream: web::Payload,
    rooms: web::Data<RoomManager>,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> std::result::Result<HttpResponse, actix_web::Error> {
    let room_id: uuid::Uuid = path.into_inner().parse().map_err(|_| {
        actix_web::error::ErrorBadRequest("Invalid room ID")
    })?;

    websocket::ws_handler(req, stream, rooms, plex, room_id).await
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/watch-party")
            .service(create_room)
            .service(list_rooms)
            .service(get_room)
            .service(delete_room)
            .service(kick_user)
            .service(join_by_invite_code)
            .service(room_websocket),
    );
}
