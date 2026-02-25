use actix_web::{web, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::plex::client::{PlexClient, PlexUserInfo};
use super::room::{RoomManager, RoomStatus, Participant};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsMessage {
    #[serde(rename = "play")]
    Play { position_ms: u64, #[serde(default)] user_id: i64 },
    #[serde(rename = "pause")]
    Pause { position_ms: u64, #[serde(default)] user_id: i64 },
    #[serde(rename = "seek")]
    Seek { position_ms: u64, #[serde(default)] user_id: i64 },
    #[serde(rename = "sync_request")]
    SyncRequest,
    #[serde(rename = "sync_response")]
    SyncResponse {
        position_ms: u64,
        is_paused: bool,
        media_id: String,
    },
    #[serde(rename = "heartbeat")]
    Heartbeat { server_time: f64, timestamp: u64, media_id: String },
    #[serde(rename = "next_episode")]
    NextEpisode,
    #[serde(rename = "queue_add")]
    QueueAdd { media_id: String },
    #[serde(rename = "queue_remove")]
    QueueRemove { index: usize },
    #[serde(rename = "chat")]
    ChatMessage {
        from: String,
        #[serde(default)]
        user_id: i64,
        message: String,
    },
    #[serde(rename = "join")]
    Join {
        #[serde(default)]
        user_id: i64,
        #[serde(alias = "name", default)]
        username: String,
        #[serde(default)]
        thumb: String,
    },
    #[serde(rename = "leave")]
    Leave {
        #[serde(default)]
        user_id: i64,
        #[serde(alias = "name", default)]
        username: String,
    },
    #[serde(rename = "media_change")]
    MediaChange {
        media_id: String,
        #[serde(default)]
        title: Option<String>,
        #[serde(default)]
        duration_ms: u64,
    },
    #[serde(rename = "navigate")]
    Navigate { media_id: String, route: String },
    #[serde(rename = "kicked")]
    Kicked { reason: Option<String> },
    #[serde(rename = "room_closed")]
    RoomClosed,
    #[serde(rename = "room_state")]
    RoomStateSnapshot {
        media_id: String,
        media_title: Option<String>,
        position_ms: u64,
        is_paused: bool,
        participants: Vec<ParticipantInfo>,
        episode_queue: Vec<String>,
    },
    #[serde(rename = "buffering")]
    Buffering { #[serde(default)] user_id: i64 },
    #[serde(rename = "ready")]
    Ready { #[serde(default)] user_id: i64 },
    #[serde(rename = "all_ready")]
    AllReady,
    #[serde(rename = "sync_ack")]
    SyncAck,
    /// Client-side keepalive ping.
    #[serde(rename = "ping")]
    Ping,
    /// Server response to client ping — keeps the connection alive during pause.
    #[serde(rename = "pong")]
    Pong,
    #[serde(rename = "error")]
    Error { message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticipantInfo {
    pub user_id: i64,
    pub username: String,
    pub thumb: String,
    pub is_host: bool,
}

pub async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    rooms: web::Data<RoomManager>,
    plex: web::Data<PlexClient>,
    room_id: Uuid,
) -> std::result::Result<HttpResponse, actix_web::Error> {
    // Authenticate from cookie
    let (user_id, token) = PlexClient::user_from_request(&req)
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Not signed in"))?;

    // Verify room exists
    let _room = rooms.get_room(&room_id)
        .ok_or_else(|| actix_web::error::ErrorNotFound("Room not found"))?;

    // Check access permission
    if !rooms.can_user_join(&room_id, user_id) {
        return Err(actix_web::error::ErrorForbidden("You are not allowed to join this room"));
    }

    // Fetch user info from Plex
    let user_info = plex.fetch_user_info(&token).await
        .unwrap_or_else(|_| PlexUserInfo {
            user_id,
            username: format!("User {}", user_id),
            thumb: String::new(),
        });

    // Perform WS upgrade
    let (resp, session, msg_stream) = actix_ws::handle(&req, stream)?;

    // Register session for broadcasting
    rooms.add_connection(&room_id, user_id, session.clone());

    // The host is auto-synced (they are the authority); non-hosts must send
    // a SyncAck after receiving and applying the room state snapshot.
    if rooms.is_host(&room_id, user_id) {
        rooms.mark_synced(&room_id, user_id);
    }

    // Add participant to room state
    rooms.add_participant(&room_id, Participant {
        user_id,
        username: user_info.username.clone(),
        thumb: user_info.thumb.clone(),
        joined_at: chrono::Utc::now(),
    });

    // Broadcast join to others
    let join_msg = WsMessage::Join {
        user_id,
        username: user_info.username.clone(),
        thumb: user_info.thumb.clone(),
    };
    rooms.broadcast_except(&room_id, &join_msg, user_id).await;

    // Send room state snapshot to the joining client (fresh read for accurate position)
    if let Some(fresh_room) = rooms.get_room(&room_id) {
        let computed_ms = if fresh_room.status == RoomStatus::Watching {
            let now = chrono::Utc::now().timestamp_millis() as u64;
            fresh_room.position_ms + now.saturating_sub(fresh_room.last_update_ms)
        } else {
            fresh_room.position_ms
        };
        let snapshot = WsMessage::RoomStateSnapshot {
            media_id: fresh_room.media_id.clone(),
            media_title: fresh_room.media_title.clone(),
            position_ms: computed_ms,
            is_paused: fresh_room.status != RoomStatus::Watching,
            participants: fresh_room.participants.iter().map(|p| ParticipantInfo {
                user_id: p.user_id,
                username: p.username.clone(),
                thumb: p.thumb.clone(),
                is_host: p.user_id == fresh_room.host_user_id,
            }).collect(),
            episode_queue: fresh_room.episode_queue.clone(),
        };
        rooms.send_to_user(&room_id, user_id, &snapshot).await;
    }

    // Spawn message handling loop
    let rooms_clone = rooms.into_inner();
    actix_web::rt::spawn(async move {
        handle_ws_messages(rooms_clone, room_id, user_id, user_info, session, msg_stream).await;
    });

    Ok(resp)
}

async fn handle_ws_messages(
    rooms: std::sync::Arc<RoomManager>,
    room_id: Uuid,
    user_id: i64,
    user_info: PlexUserInfo,
    mut session: actix_ws::Session,
    mut msg_stream: actix_ws::MessageStream,
) {
    while let Some(Ok(msg)) = msg_stream.next().await {
        match msg {
            Message::Text(text) => {
                if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                    match ws_msg {
                        WsMessage::Play { position_ms, .. } => {
                            if !rooms.is_synced(&room_id, user_id) {
                                continue;
                            }
                            rooms.remove_buffering_user(&room_id, user_id);
                            rooms.update_position(&room_id, position_ms);
                            if !rooms.has_buffering_users(&room_id) {
                                rooms.set_status(&room_id, RoomStatus::Watching);
                            }
                            rooms.broadcast_except(&room_id, &WsMessage::Play { position_ms, user_id }, user_id).await;
                        }
                        WsMessage::Pause { position_ms, .. } => {
                            if !rooms.is_synced(&room_id, user_id) {
                                continue;
                            }
                            rooms.update_position(&room_id, position_ms);
                            rooms.set_status(&room_id, RoomStatus::Paused);
                            rooms.broadcast_except(&room_id, &WsMessage::Pause { position_ms, user_id }, user_id).await;
                        }
                        WsMessage::Seek { position_ms, .. } => {
                            if !rooms.is_synced(&room_id, user_id) {
                                continue;
                            }
                            rooms.update_position(&room_id, position_ms);
                            rooms.broadcast_except(&room_id, &WsMessage::Seek { position_ms, user_id }, user_id).await;
                        }
                        WsMessage::SyncRequest => {
                            if let Some(room) = rooms.get_room(&room_id) {
                                let computed_ms = if room.status == RoomStatus::Watching {
                                    let now = chrono::Utc::now().timestamp_millis() as u64;
                                    room.position_ms + now.saturating_sub(room.last_update_ms)
                                } else {
                                    room.position_ms
                                };
                                let resp = WsMessage::SyncResponse {
                                    position_ms: computed_ms,
                                    is_paused: room.status != RoomStatus::Watching,
                                    media_id: room.media_id.clone(),
                                };
                                rooms.send_to_user(&room_id, user_id, &resp).await;
                            }
                        }
                        WsMessage::SyncResponse { position_ms, is_paused, media_id } => {
                            // Host sending authoritative sync - broadcast to others
                            if rooms.is_host(&room_id, user_id) {
                                rooms.update_position(&room_id, position_ms);
                                rooms.broadcast_except(&room_id, &WsMessage::SyncResponse {
                                    position_ms, is_paused, media_id,
                                }, user_id).await;
                            }
                        }
                        WsMessage::MediaChange { media_id, title, duration_ms } => {
                            if !rooms.is_synced(&room_id, user_id) {
                                continue;
                            }
                            // Only process if the media actually changed (prevents duplicate resets)
                            if rooms.set_media_if_changed(&room_id, media_id.clone(), title.clone(), duration_ms) {
                                rooms.broadcast(&room_id, &WsMessage::MediaChange {
                                    media_id: media_id.clone(), title, duration_ms,
                                }).await;
                                rooms.broadcast(&room_id, &WsMessage::Navigate {
                                    media_id: media_id.clone(),
                                    route: format!("/player/{}", media_id),
                                }).await;
                            }
                        }
                        WsMessage::NextEpisode => {
                            if rooms.is_host(&room_id, user_id) {
                                if let Some(next_media) = rooms.next_in_queue(&room_id) {
                                    rooms.broadcast(&room_id, &WsMessage::MediaChange {
                                        media_id: next_media.clone(), title: None, duration_ms: 0,
                                    }).await;
                                    rooms.broadcast(&room_id, &WsMessage::Navigate {
                                        media_id: next_media.clone(),
                                        route: format!("/player/{}", next_media),
                                    }).await;
                                }
                            }
                        }
                        WsMessage::QueueAdd { media_id } => {
                            rooms.add_to_queue(&room_id, media_id);
                        }
                        WsMessage::QueueRemove { index } => {
                            rooms.remove_from_queue(&room_id, index);
                        }
                        WsMessage::ChatMessage { message, .. } => {
                            let chat = WsMessage::ChatMessage {
                                from: user_info.username.clone(),
                                user_id,
                                message,
                            };
                            rooms.broadcast(&room_id, &chat).await;
                        }
                        // Navigate is server-to-client only
                        WsMessage::Navigate { media_id, .. } => {
                            if rooms.is_host(&room_id, user_id) {
                                rooms.broadcast(&room_id, &WsMessage::Navigate {
                                    media_id: media_id.clone(),
                                    route: format!("/player/{}", media_id),
                                }).await;
                            }
                        }
                        WsMessage::Buffering { .. } => {
                            if !rooms.is_synced(&room_id, user_id) {
                                continue;
                            }
                            rooms.add_buffering_user(&room_id, user_id);
                            rooms.set_status(&room_id, RoomStatus::Buffering);
                            rooms.broadcast_except(&room_id, &WsMessage::Buffering { user_id }, user_id).await;
                        }
                        WsMessage::Ready { .. } => {
                            let all_ready = rooms.mark_ready(&room_id, user_id);
                            if all_ready {
                                rooms.clear_ready(&room_id);
                                rooms.set_status(&room_id, RoomStatus::Watching);
                                rooms.broadcast(&room_id, &WsMessage::AllReady).await;
                            }
                        }
                        WsMessage::SyncAck => {
                            rooms.mark_synced(&room_id, user_id);
                        }
                        WsMessage::Ping => {
                            rooms.send_to_user(&room_id, user_id, &WsMessage::Pong).await;
                        }
                        // Client-sent join/leave/all_ready are handled on connect/disconnect or server-only
                        _ => {}
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

    // Cleanup on disconnect
    rooms.remove_connection(&room_id, user_id);

    // Pause the room so remaining members don't continue without this user.
    // set_status snapshots the computed position (position_ms + elapsed) for
    // Watching→Paused transitions, so we must read position_ms AFTER it runs.
    if rooms.get_room(&room_id).is_some_and(|r| r.status == RoomStatus::Watching || r.status == RoomStatus::Buffering) {
        rooms.set_status(&room_id, RoomStatus::Paused);
        let position_ms = rooms.get_room(&room_id).map(|r| r.position_ms).unwrap_or(0);
        rooms.broadcast(&room_id, &WsMessage::Pause { position_ms, user_id }).await;
    }

    // Remove from buffering set
    rooms.remove_buffering_user(&room_id, user_id);

    // Re-check ready state: if the disconnecting user was the last holdout, trigger AllReady
    if rooms.check_all_ready(&room_id) {
        rooms.clear_ready(&room_id);
        rooms.set_status(&room_id, RoomStatus::Watching);
        rooms.broadcast(&room_id, &WsMessage::AllReady).await;
    }

    let username = user_info.username.clone();

    rooms.remove_participant(&room_id, user_id);

    let leave_msg = WsMessage::Leave { user_id, username };
    rooms.broadcast(&room_id, &leave_msg).await;
}
