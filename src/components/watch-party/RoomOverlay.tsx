import {Chip} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {WatchRoom} from "../../lib/types.ts";
import EpisodeQueue from "./EpisodeQueue.tsx";

interface RoomOverlayProps {
    room: WatchRoom;
}

export default function RoomOverlay({room}: RoomOverlayProps) {
    return (
        <div className="max-w-2xl mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Watch Party</h1>
                    <p className="text-sm text-default-400">Room: {room.id}</p>
                </div>
                <Chip
                    startContent={<Icon icon={room.is_paused ? "mdi:pause" : "mdi:play"} width="14"/>}
                    color={room.is_paused ? "warning" : "success"}
                    variant="flat"
                >
                    {room.is_paused ? "Paused" : "Playing"}
                </Chip>
            </div>

            {/* Participants */}
            <div className="bg-content2 rounded-xl p-4 mb-4">
                <h2 className="text-sm font-semibold mb-2">
                    Participants ({room.participants.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                    {room.participants.map((name, i) => (
                        <Chip
                            key={i}
                            startContent={<Icon icon="mdi:account" width="14"/>}
                            variant="flat"
                            size="sm"
                        >
                            {name}
                            {i === 0 && " (Host)"}
                        </Chip>
                    ))}
                </div>
            </div>

            {/* Current media */}
            {room.media_id && (
                <div className="bg-content2 rounded-xl p-4 mb-4">
                    <h2 className="text-sm font-semibold mb-2">Now Playing</h2>
                    <p className="text-default-400">Media ID: {room.media_id}</p>
                </div>
            )}

            {/* Episode queue */}
            <EpisodeQueue queue={room.episode_queue}/>
        </div>
    );
}
