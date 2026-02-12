use actix_web::{web, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::room::RoomManager;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsMessage {
    #[serde(rename = "play")]
    Play { position_ms: u64 },
    #[serde(rename = "pause")]
    Pause { position_ms: u64 },
    #[serde(rename = "seek")]
    Seek { position_ms: u64 },
    #[serde(rename = "sync_request")]
    SyncRequest,
    #[serde(rename = "sync_response")]
    SyncResponse {
        position_ms: u64,
        is_paused: bool,
        media_id: String,
    },
    #[serde(rename = "next_episode")]
    NextEpisode,
    #[serde(rename = "queue_add")]
    QueueAdd { media_id: String },
    #[serde(rename = "queue_remove")]
    QueueRemove { index: usize },
    #[serde(rename = "chat")]
    ChatMessage { from: String, message: String },
    #[serde(rename = "join")]
    Join { name: String },
    #[serde(rename = "leave")]
    Leave { name: String },
    #[serde(rename = "media_change")]
    MediaChange { media_id: String },
}

pub async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    rooms: web::Data<RoomManager>,
    room_id: Uuid,
) -> std::result::Result<HttpResponse, actix_web::Error> {
    let (resp, mut session, mut msg_stream) = actix_ws::handle(&req, stream)?;

    let rooms_clone = rooms.clone();
    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                        handle_message(&rooms_clone, &room_id, &ws_msg);

                        // Echo the message back (in a full impl, broadcast to all clients)
                        let response = match &ws_msg {
                            WsMessage::SyncRequest => {
                                if let Some(room) = rooms_clone.get_room(&room_id) {
                                    Some(WsMessage::SyncResponse {
                                        position_ms: room.position_ms,
                                        is_paused: room.is_paused,
                                        media_id: room.media_id,
                                    })
                                } else {
                                    None
                                }
                            }
                            WsMessage::NextEpisode => {
                                if let Some(media_id) = rooms_clone.next_in_queue(&room_id) {
                                    Some(WsMessage::MediaChange { media_id })
                                } else {
                                    None
                                }
                            }
                            _ => Some(ws_msg),
                        };

                        if let Some(resp_msg) = response {
                            if let Ok(json) = serde_json::to_string(&resp_msg) {
                                let _ = session.text(json).await;
                            }
                        }
                    }
                }
                Message::Ping(bytes) => {
                    let _ = session.pong(&bytes).await;
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    Ok(resp)
}

fn handle_message(rooms: &RoomManager, room_id: &Uuid, msg: &WsMessage) {
    match msg {
        WsMessage::Play { position_ms } => {
            rooms.update_position(room_id, *position_ms);
            rooms.set_paused(room_id, false);
        }
        WsMessage::Pause { position_ms } => {
            rooms.update_position(room_id, *position_ms);
            rooms.set_paused(room_id, true);
        }
        WsMessage::Seek { position_ms } => {
            rooms.update_position(room_id, *position_ms);
        }
        WsMessage::Join { name } => {
            rooms.add_participant(room_id, name.clone());
        }
        WsMessage::Leave { name } => {
            rooms.remove_participant(room_id, name);
        }
        WsMessage::QueueAdd { media_id } => {
            rooms.add_to_queue(room_id, media_id.clone());
        }
        WsMessage::QueueRemove { index } => {
            rooms.remove_from_queue(room_id, *index);
        }
        _ => {}
    }
}
