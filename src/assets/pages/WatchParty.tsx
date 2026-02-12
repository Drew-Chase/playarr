import {useParams} from "react-router-dom";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Spinner} from "@heroui/react";
import {api} from "../lib/api";
import type {WatchRoom} from "../lib/types";
import RoomCreate from "../components/watch-party/RoomCreate";
import RoomOverlay from "../components/watch-party/RoomOverlay";

export default function WatchParty() {
    const {roomId} = useParams<{ roomId?: string }>();
    const [activeRoomId, setActiveRoomId] = useState(roomId || "");

    const {data: room, isLoading} = useQuery({
        queryKey: ["watchParty", "room", activeRoomId],
        queryFn: () => api.get<WatchRoom>(`/watch-party/rooms/${activeRoomId}`),
        enabled: !!activeRoomId,
        refetchInterval: 5000,
    });

    if (!activeRoomId) {
        return <RoomCreate onRoomCreated={(id) => setActiveRoomId(id)}/>;
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="text-center py-12">
                <p className="text-default-400">Room not found</p>
                <RoomCreate onRoomCreated={(id) => setActiveRoomId(id)}/>
            </div>
        );
    }

    return <RoomOverlay room={room}/>;
}
