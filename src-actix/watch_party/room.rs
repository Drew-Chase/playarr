use dashmap::DashMap;
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct RoomState {
    pub id: Uuid,
    pub host_name: String,
    pub media_id: String,
    pub position_ms: u64,
    pub is_paused: bool,
    pub participants: Vec<String>,
    pub episode_queue: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub struct RoomManager {
    pub rooms: DashMap<Uuid, RoomState>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: DashMap::new(),
        }
    }

    pub fn create_room(&self, media_id: String, host_name: String) -> RoomState {
        let id = Uuid::new_v4();
        let room = RoomState {
            id,
            host_name: host_name.clone(),
            media_id,
            position_ms: 0,
            is_paused: true,
            participants: vec![host_name],
            episode_queue: Vec::new(),
            created_at: chrono::Utc::now(),
        };
        self.rooms.insert(id, room.clone());
        room
    }

    pub fn get_room(&self, id: &Uuid) -> Option<RoomState> {
        self.rooms.get(id).map(|r| r.clone())
    }

    pub fn update_position(&self, id: &Uuid, position_ms: u64) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            room.position_ms = position_ms;
        }
    }

    pub fn set_paused(&self, id: &Uuid, paused: bool) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            room.is_paused = paused;
        }
    }

    pub fn add_participant(&self, id: &Uuid, name: String) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            if !room.participants.contains(&name) {
                room.participants.push(name);
            }
        }
    }

    pub fn remove_participant(&self, id: &Uuid, name: &str) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            room.participants.retain(|p| p != name);
            // Clean up empty rooms
            if room.participants.is_empty() {
                drop(room);
                self.rooms.remove(id);
            }
        }
    }

    pub fn set_media(&self, id: &Uuid, media_id: String) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            room.media_id = media_id;
            room.position_ms = 0;
            room.is_paused = true;
        }
    }

    pub fn add_to_queue(&self, id: &Uuid, media_id: String) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            room.episode_queue.push(media_id);
        }
    }

    pub fn remove_from_queue(&self, id: &Uuid, index: usize) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            if index < room.episode_queue.len() {
                room.episode_queue.remove(index);
            }
        }
    }

    pub fn next_in_queue(&self, id: &Uuid) -> Option<String> {
        if let Some(mut room) = self.rooms.get_mut(id) {
            if !room.episode_queue.is_empty() {
                let next = room.episode_queue.remove(0);
                room.media_id = next.clone();
                room.position_ms = 0;
                room.is_paused = true;
                return Some(next);
            }
        }
        None
    }
}
