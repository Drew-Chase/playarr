pub mod room;
pub mod websocket;
pub mod queue;

use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use crate::http_error::Result;
use room::RoomManager;

#[post("/rooms")]
async fn create_room(
    rooms: web::Data<RoomManager>,
    body: web::Json<serde_json::Value>,
) -> Result<impl Responder> {
    let media_id = body["mediaId"].as_str().unwrap_or("").to_string();
    let host_name = body["hostName"].as_str().unwrap_or("Host").to_string();
    let room = rooms.create_room(media_id, host_name);
    Ok(HttpResponse::Ok().json(room))
}

#[get("/rooms/{id}")]
async fn get_room(
    rooms: web::Data<RoomManager>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let room_id: uuid::Uuid = id
        .parse()
        .map_err(|_| crate::http_error::Error::BadRequest("Invalid room ID".to_string()))?;

    match rooms.get_room(&room_id) {
        Some(room) => Ok(HttpResponse::Ok().json(room)),
        None => Err(crate::http_error::Error::NotFound("Room not found".to_string())),
    }
}

#[get("/rooms/{id}/ws")]
async fn room_websocket(
    req: HttpRequest,
    stream: web::Payload,
    rooms: web::Data<RoomManager>,
    path: web::Path<String>,
) -> std::result::Result<HttpResponse, actix_web::Error> {
    let id = path.into_inner();
    let room_id: uuid::Uuid = id.parse().map_err(|_| {
        actix_web::error::ErrorBadRequest("Invalid room ID")
    })?;

    websocket::ws_handler(req, stream, rooms, room_id).await
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/watch-party")
            .service(create_room)
            .service(get_room)
            .service(room_websocket),
    );
}
