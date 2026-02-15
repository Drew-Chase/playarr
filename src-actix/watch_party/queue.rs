// Additional queue utilities for RoomManager.

use super::room::RoomManager;
use uuid::Uuid;

impl RoomManager {
    /// Get the current queue for a room.
    pub fn get_queue(&self, id: &Uuid) -> Vec<String> {
        self.rooms
            .get(id)
            .map(|r| r.episode_queue.clone())
            .unwrap_or_default()
    }

    /// Clear the entire queue for a room.
    pub fn clear_queue(&self, id: &Uuid) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            room.episode_queue.clear();
        }
    }

    /// Reorder a queue item from one index to another.
    pub fn reorder_queue(&self, id: &Uuid, from: usize, to: usize) {
        if let Some(mut room) = self.rooms.get_mut(id) {
            if from < room.episode_queue.len() && to < room.episode_queue.len() {
                let item = room.episode_queue.remove(from);
                room.episode_queue.insert(to, item);
            }
        }
    }
}
