use std::collections::{HashMap, HashSet};
use actix_ws::Session;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::websocket::WsMessage;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RoomAccessMode {
    Everyone,
    InviteOnly,
    ByUser,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RoomStatus {
    Idle,
    Watching,
    Paused,
    Buffering,
}

#[derive(Debug, Clone, Serialize)]
pub struct Participant {
    pub user_id: i64,
    pub username: String,
    pub thumb: String,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RoomState {
    pub id: Uuid,
    pub name: Option<String>,
    pub host_user_id: i64,
    pub host_username: String,
    pub media_id: String,
    pub media_title: Option<String>,
    pub position_ms: u64,
    pub duration_ms: u64,
    pub status: RoomStatus,
    pub access_mode: RoomAccessMode,
    pub invite_code: Option<String>,
    pub allowed_user_ids: Vec<i64>,
    pub participants: Vec<Participant>,
    pub episode_queue: Vec<String>,
    pub ready_users: HashSet<i64>,
    pub buffering_users: HashSet<i64>,
    pub last_update_ms: u64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub struct RoomManager {
    pub rooms: DashMap<Uuid, RoomState>,
    connections: DashMap<Uuid, HashMap<i64, Session>>,
    /// Tracks which users have completed their initial sync after joining.
    /// Users not in this set are blocked from sending state-changing messages.
    synced_users: DashMap<Uuid, HashSet<i64>>,
    invite_codes: DashMap<String, Uuid>,
}

fn generate_invite_code() -> String {
    Uuid::new_v4().simple().to_string()[..8].to_uppercase()
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: DashMap::new(),
            connections: DashMap::new(),
            synced_users: DashMap::new(),
            invite_codes: DashMap::new(),
        }
    }

    pub fn create_room(
        &self,
        name: Option<String>,
        host_user_id: i64,
        host_username: String,
        host_thumb: String,
        access_mode: RoomAccessMode,
        allowed_user_ids: Vec<i64>,
    ) -> RoomState {
        let id = Uuid::new_v4();
        let invite_code = if access_mode == RoomAccessMode::InviteOnly {
            let code = generate_invite_code();
            self.invite_codes.insert(code.clone(), id);
            Some(code)
        } else {
            None
        };

        let host = Participant {
            user_id: host_user_id,
            username: host_username.clone(),
            thumb: host_thumb,
            joined_at: chrono::Utc::now(),
        };

        let room = RoomState {
            id,
            name,
            host_user_id,
            host_username,
            media_id: String::new(),
            media_title: None,
            position_ms: 0,
            duration_ms: 0,
            status: RoomStatus::Idle,
            access_mode,
            invite_code,
            allowed_user_ids,
            participants: vec![host],
            episode_queue: Vec::new(),
            ready_users: HashSet::new(),
            buffering_users: HashSet::new(),
            last_update_ms: chrono::Utc::now().timestamp_millis() as u64,
            created_at: chrono::Utc::now(),
        };

        self.rooms.insert(id, room.clone());
        self.connections.insert(id, HashMap::new());
        room
    }

    pub fn get_room(&self, id: &Uuid) -> Option<RoomState> {
        self.rooms.get(id).map(|r| r.clone())
    }

    pub fn room_id_by_invite_code(&self, code: &str) -> Option<Uuid> {
        self.invite_codes.get(code).map(|r| *r)
    }

    pub fn can_user_join(&self, room_id: &Uuid, user_id: i64) -> bool {
        let Some(room) = self.rooms.get(room_id) else {
            return false;
        };

        if room.host_user_id == user_id {
            return true;
        }

        match &room.access_mode {
            RoomAccessMode::Everyone => true,
            RoomAccessMode::InviteOnly => {
                room.participants.iter().any(|p| p.user_id == user_id)
                    || room.allowed_user_ids.contains(&user_id)
            }
            RoomAccessMode::ByUser => {
                room.allowed_user_ids.contains(&user_id)
            }
        }
    }

    /// Grant a user access (used when they join via invite code).
    pub fn grant_access(&self, room_id: &Uuid, user_id: i64) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            if !room.allowed_user_ids.contains(&user_id) {
                room.allowed_user_ids.push(user_id);
            }
        }
    }

    pub fn is_host(&self, room_id: &Uuid, user_id: i64) -> bool {
        self.rooms.get(room_id)
            .map(|r| r.host_user_id == user_id)
            .unwrap_or(false)
    }

    /// Returns true if the user has completed initial sync (sent a SyncAck).
    /// Unsynced users are blocked from sending state-changing messages.
    pub fn is_synced(&self, room_id: &Uuid, user_id: i64) -> bool {
        self.synced_users
            .get(room_id)
            .map(|users| users.contains(&user_id))
            .unwrap_or(false)
    }

    /// Mark a user as synced after they acknowledge receiving the room state.
    pub fn mark_synced(&self, room_id: &Uuid, user_id: i64) {
        self.synced_users
            .entry(*room_id)
            .or_insert_with(HashSet::new)
            .insert(user_id);
    }

    pub fn add_connection(&self, room_id: &Uuid, user_id: i64, session: Session) {
        self.connections
            .entry(*room_id)
            .or_insert_with(HashMap::new)
            .insert(user_id, session);
        // New connections start as unsynced — they must send SyncAck after
        // receiving and applying the room state snapshot.
    }

    pub fn remove_connection(&self, room_id: &Uuid, user_id: i64) {
        if let Some(mut conns) = self.connections.get_mut(room_id) {
            conns.remove(&user_id);
        }
        if let Some(mut users) = self.synced_users.get_mut(room_id) {
            users.remove(&user_id);
        }
    }

    pub fn add_participant(&self, room_id: &Uuid, participant: Participant) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            if !room.participants.iter().any(|p| p.user_id == participant.user_id) {
                room.participants.push(participant);
            }
        }
    }

    pub fn remove_participant(&self, room_id: &Uuid, user_id: i64) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            room.participants.retain(|p| p.user_id != user_id);
            if room.participants.is_empty() {
                let invite_code = room.invite_code.clone();
                drop(room);
                self.rooms.remove(room_id);
                self.connections.remove(room_id);
                self.synced_users.remove(room_id);
                if let Some(code) = invite_code {
                    self.invite_codes.remove(&code);
                }
            }
        }
    }

    pub fn update_position(&self, room_id: &Uuid, position_ms: u64) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            room.position_ms = position_ms;
            room.last_update_ms = chrono::Utc::now().timestamp_millis() as u64;
        }
    }

    pub fn set_status(&self, room_id: &Uuid, status: RoomStatus) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            // Snapshot current computed position before changing status
            if room.status == RoomStatus::Watching && status != RoomStatus::Watching {
                let now = chrono::Utc::now().timestamp_millis() as u64;
                let elapsed = now.saturating_sub(room.last_update_ms);
                room.position_ms += elapsed;
            }
            room.status = status;
            room.last_update_ms = chrono::Utc::now().timestamp_millis() as u64;
        }
    }

    pub fn set_media(&self, room_id: &Uuid, media_id: String, title: Option<String>, duration_ms: u64) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            room.media_id = media_id;
            room.media_title = title;
            room.duration_ms = duration_ms;
            room.position_ms = 0;
            room.status = RoomStatus::Idle;
            room.ready_users.clear();
            room.buffering_users.clear();
            room.last_update_ms = chrono::Utc::now().timestamp_millis() as u64;
        }
    }

    /// Like set_media but only applies if the media_id actually changed.
    /// Returns true if the media was changed, false if it was already the same.
    pub fn set_media_if_changed(&self, room_id: &Uuid, media_id: String, title: Option<String>, duration_ms: u64) -> bool {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            if room.media_id == media_id {
                return false;
            }
            room.media_id = media_id;
            room.media_title = title;
            room.duration_ms = duration_ms;
            room.position_ms = 0;
            room.status = RoomStatus::Idle;
            room.ready_users.clear();
            room.buffering_users.clear();
            room.last_update_ms = chrono::Utc::now().timestamp_millis() as u64;
            return true;
        }
        false
    }

    pub fn add_to_queue(&self, room_id: &Uuid, media_id: String) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            room.episode_queue.push(media_id);
        }
    }

    pub fn remove_from_queue(&self, room_id: &Uuid, index: usize) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            if index < room.episode_queue.len() {
                room.episode_queue.remove(index);
            }
        }
    }

    pub fn next_in_queue(&self, room_id: &Uuid) -> Option<String> {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            if !room.episode_queue.is_empty() {
                let next = room.episode_queue.remove(0);
                room.media_id = next.clone();
                room.position_ms = 0;
                room.status = RoomStatus::Idle;
                room.ready_users.clear();
                room.buffering_users.clear();
                room.last_update_ms = chrono::Utc::now().timestamp_millis() as u64;
                return Some(next);
            }
        }
        None
    }

    /// List rooms visible to a given user.
    pub fn list_rooms_for_user(&self, user_id: i64) -> Vec<RoomState> {
        self.rooms.iter().filter_map(|entry| {
            let room = entry.value();
            let visible = room.host_user_id == user_id
                || room.access_mode == RoomAccessMode::Everyone
                || (room.access_mode == RoomAccessMode::InviteOnly
                    && (room.participants.iter().any(|p| p.user_id == user_id)
                        || room.allowed_user_ids.contains(&user_id)))
                || (room.access_mode == RoomAccessMode::ByUser
                    && room.allowed_user_ids.contains(&user_id));
            if visible { Some(room.clone()) } else { None }
        }).collect()
    }

    /// Mark a user as ready. Returns true if all connected users are now ready.
    pub fn mark_ready(&self, room_id: &Uuid, user_id: i64) -> bool {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            room.ready_users.insert(user_id);
            let ready = room.ready_users.clone();
            drop(room);
            if let Some(conns) = self.connections.get(room_id) {
                return conns.len() > 0 && conns.keys().all(|uid| ready.contains(uid));
            }
        }
        false
    }

    /// Clear all ready states.
    pub fn clear_ready(&self, room_id: &Uuid) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            room.ready_users.clear();
        }
    }

    /// Add a user to the buffering set.
    pub fn add_buffering_user(&self, room_id: &Uuid, user_id: i64) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            room.buffering_users.insert(user_id);
        }
    }

    /// Remove a user from the buffering set.
    pub fn remove_buffering_user(&self, room_id: &Uuid, user_id: i64) {
        if let Some(mut room) = self.rooms.get_mut(room_id) {
            room.buffering_users.remove(&user_id);
        }
    }

    /// Check if any users are currently buffering.
    pub fn has_buffering_users(&self, room_id: &Uuid) -> bool {
        self.rooms.get(room_id)
            .map(|r| !r.buffering_users.is_empty())
            .unwrap_or(false)
    }

    /// Check if all connected users are ready (used after disconnect to re-check).
    pub fn check_all_ready(&self, room_id: &Uuid) -> bool {
        if let Some(room) = self.rooms.get(room_id) {
            if room.status != RoomStatus::Idle || room.ready_users.is_empty() {
                return false;
            }
            let ready = room.ready_users.clone();
            drop(room);
            if let Some(conns) = self.connections.get(room_id) {
                return conns.len() > 0 && conns.keys().all(|uid| ready.contains(uid));
            }
        }
        false
    }

    /// Compute the current playback position in seconds for a room.
    /// For Watching rooms, accounts for elapsed time since last update.
    pub fn compute_position_secs(&self, room_id: &Uuid) -> Option<f64> {
        let room = self.rooms.get(room_id)?;
        if room.status == RoomStatus::Watching {
            let now = chrono::Utc::now().timestamp_millis() as u64;
            let elapsed = now.saturating_sub(room.last_update_ms);
            Some((room.position_ms + elapsed) as f64 / 1000.0)
        } else {
            Some(room.position_ms as f64 / 1000.0)
        }
    }

    /// Called every 500ms by the heartbeat task.
    /// Returns (room_id, computed_position_secs, media_id) for all rooms currently playing.
    /// Also snapshots position_ms to prevent drift accumulation.
    pub fn heartbeat_tick(&self) -> Vec<(Uuid, f64, String)> {
        let now = chrono::Utc::now().timestamp_millis() as u64;
        let mut results = Vec::new();
        for mut entry in self.rooms.iter_mut() {
            let room_id = *entry.key();
            let room = entry.value_mut();
            if room.status != RoomStatus::Watching {
                continue;
            }
            let elapsed = now.saturating_sub(room.last_update_ms);
            let position_ms = room.position_ms + elapsed;
            // Snapshot to prevent accumulation drift
            room.position_ms = position_ms;
            room.last_update_ms = now;
            let media_id = room.media_id.clone();
            results.push((room_id, position_ms as f64 / 1000.0, media_id));
        }
        // Filter to rooms that have connections
        results.retain(|(id, _, _)| {
            self.connections.get(id).is_some_and(|c| !c.is_empty())
        });
        results
    }

    /// Broadcast a message to ALL connected sessions in a room.
    pub async fn broadcast(&self, room_id: &Uuid, msg: &WsMessage) {
        let json = match serde_json::to_string(msg) {
            Ok(j) => j,
            Err(_) => return,
        };
        let sessions: Vec<(i64, Session)> = self.connections
            .get(room_id)
            .map(|conns| conns.iter().map(|(k, v)| (*k, v.clone())).collect())
            .unwrap_or_default();
        for (user_id, mut session) in sessions {
            if session.text(json.clone()).await.is_err() {
                self.remove_connection(room_id, user_id);
            }
        }
    }

    /// Broadcast to all EXCEPT the specified user.
    pub async fn broadcast_except(&self, room_id: &Uuid, msg: &WsMessage, exclude_user_id: i64) {
        let json = match serde_json::to_string(msg) {
            Ok(j) => j,
            Err(_) => return,
        };
        let sessions: Vec<(i64, Session)> = self.connections
            .get(room_id)
            .map(|conns| conns.iter()
                .filter(|(k, _)| **k != exclude_user_id)
                .map(|(k, v)| (*k, v.clone()))
                .collect())
            .unwrap_or_default();
        for (user_id, mut session) in sessions {
            if session.text(json.clone()).await.is_err() {
                self.remove_connection(room_id, user_id);
            }
        }
    }

    /// Send a message to a single user in a room.
    pub async fn send_to_user(&self, room_id: &Uuid, user_id: i64, msg: &WsMessage) {
        let json = match serde_json::to_string(msg) {
            Ok(j) => j,
            Err(_) => return,
        };
        let session = self.connections
            .get(room_id)
            .and_then(|conns| conns.get(&user_id).cloned());
        if let Some(mut session) = session {
            if session.text(json).await.is_err() {
                self.remove_connection(room_id, user_id);
            }
        }
    }

    /// Host closes room: broadcast close message, remove all connections, delete room.
    pub async fn close_room(&self, room_id: &Uuid) {
        self.broadcast(room_id, &WsMessage::RoomClosed).await;

        let sessions: Vec<(i64, Session)> = self.connections
            .get(room_id)
            .map(|conns| conns.iter().map(|(k, v)| (*k, v.clone())).collect())
            .unwrap_or_default();
        for (_, session) in sessions {
            let _ = session.close(None).await;
        }

        if let Some(room) = self.rooms.get(room_id) {
            if let Some(code) = &room.invite_code {
                self.invite_codes.remove(code);
            }
        }

        self.connections.remove(room_id);
        self.synced_users.remove(room_id);
        self.rooms.remove(room_id);
    }

    /// Host kicks a user: send kicked message, close their session, remove participant.
    pub async fn kick_user(&self, room_id: &Uuid, user_id: i64, reason: Option<String>) {
        self.send_to_user(room_id, user_id, &WsMessage::Kicked { reason }).await;

        let session = self.connections
            .get(room_id)
            .and_then(|conns| conns.get(&user_id).cloned());
        if let Some(session) = session {
            let _ = session.close(None).await;
        }

        self.remove_connection(room_id, user_id);

        let username = self.rooms.get(room_id)
            .and_then(|r| r.participants.iter().find(|p| p.user_id == user_id).map(|p| p.username.clone()))
            .unwrap_or_default();

        self.remove_participant(room_id, user_id);

        self.broadcast(room_id, &WsMessage::Leave { user_id, username }).await;
    }
}
