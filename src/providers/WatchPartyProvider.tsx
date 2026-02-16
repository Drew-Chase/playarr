import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {useDisclosure} from "@heroui/react";
import {toast} from "sonner";
import {useAuth} from "./AuthProvider.tsx";
import {useWatchParty} from "../hooks/useWatchParty.ts";
import {api} from "../lib/api.ts";
import type {WatchRoom, WsMessage, CreateWatchPartyRequest, WatchPartyParticipant} from "../lib/types.ts";
import CreatePartyModal from "../components/watch-party/CreatePartyModal.tsx";
import JoinPartyModal from "../components/watch-party/JoinPartyModal.tsx";
import WatchPartyOverlay from "../components/watch-party/WatchPartyOverlay.tsx";

interface WatchPartyContextType {
    activeRoom: WatchRoom | null;
    isInParty: boolean;
    isHost: boolean;
    connected: boolean;
    createParty: (req: CreateWatchPartyRequest) => Promise<WatchRoom>;
    joinParty: (roomId: string) => Promise<void>;
    leaveParty: () => void;
    closeParty: () => void;
    sendPlay: (positionMs: number) => void;
    sendPause: (positionMs: number) => void;
    sendSeek: (positionMs: number) => void;
    sendNavigate: (mediaId: string) => void;
    sendMediaChange: (mediaId: string, title?: string, durationMs?: number) => void;
    sendSyncResponse: (positionMs: number, isPaused: boolean, mediaId: string) => void;
    sendBuffering: () => void;
    sendReady: () => void;
    addToQueue: (mediaId: string) => void;
    removeFromQueue: (index: number) => void;
    nextInQueue: () => void;
    openCreateModal: () => void;
    openJoinModal: () => void;
    // For player sync
    onPlayerEvent: React.MutableRefObject<((msg: WsMessage) => void) | null>;
}

const WatchPartyContext = createContext<WatchPartyContextType | null>(null);

export function useWatchPartyContext() {
    return useContext(WatchPartyContext);
}

export default function WatchPartyProvider({children}: { children: React.ReactNode }) {
    const {user} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeRoom, setActiveRoom] = useState<WatchRoom | null>(null);
    const roomIdRef = useRef<string | null>(null);

    const {isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose} = useDisclosure();
    const {isOpen: isJoinOpen, onOpen: onJoinOpen, onClose: onJoinClose} = useDisclosure();

    // Ref for player to subscribe to playback events
    const onPlayerEvent = useRef<((msg: WsMessage) => void) | null>(null);

    const isInParty = activeRoom !== null;
    const isHost = activeRoom !== null && user !== null && activeRoom.host_user_id === user.id;

    // Restore session from sessionStorage
    useEffect(() => {
        const savedRoomId = sessionStorage.getItem("watchPartyRoomId");
        if (savedRoomId && !activeRoom) {
            api.get<WatchRoom>(`/watch-party/rooms/${savedRoomId}`)
                .then(room => {
                    setActiveRoom(room);
                    roomIdRef.current = room.id;
                })
                .catch(() => {
                    sessionStorage.removeItem("watchPartyRoomId");
                });
        }
    }, []);

    const handleWsMessage = useCallback((msg: WsMessage) => {
        switch (msg.type) {
            case "room_state":
                setActiveRoom(prev => prev ? {
                    ...prev,
                    media_id: msg.media_id,
                    media_title: msg.media_title ?? null,
                    position_ms: msg.position_ms,
                    status: msg.is_paused ? "paused" : "watching",
                    participants: msg.participants.map(p => ({
                        user_id: p.user_id,
                        username: p.username,
                        thumb: p.thumb,
                        joined_at: "",
                    })),
                    episode_queue: msg.episode_queue,
                } : prev);
                break;
            case "join": {
                setActiveRoom(prev => {
                    if (!prev) return prev;
                    const exists = prev.participants.some(p => p.user_id === msg.user_id);
                    if (exists) return prev;
                    const newP: WatchPartyParticipant = {
                        user_id: msg.user_id,
                        username: msg.username,
                        thumb: msg.thumb,
                        joined_at: new Date().toISOString(),
                    };
                    return {...prev, participants: [...prev.participants, newP]};
                });
                toast.info(`${msg.username} joined the watch party`);
                break;
            }
            case "leave":
                setActiveRoom(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        participants: prev.participants.filter(p => p.user_id !== msg.user_id),
                    };
                });
                toast.info(`${msg.username} left the watch party`);
                break;
            case "navigate":
                navigate(msg.route);
                break;
            case "room_closed":
                setActiveRoom(null);
                roomIdRef.current = null;
                sessionStorage.removeItem("watchPartyRoomId");
                toast.warning("The watch party has ended");
                break;
            case "kicked":
                setActiveRoom(null);
                roomIdRef.current = null;
                sessionStorage.removeItem("watchPartyRoomId");
                toast.error(msg.reason || "You have been removed from the watch party");
                break;
            case "play":
            case "pause":
            case "seek":
            case "sync_response":
                // Update room state
                if (msg.type === "play") {
                    setActiveRoom(prev => prev ? {...prev, position_ms: msg.position_ms, status: "watching"} : prev);
                } else if (msg.type === "pause") {
                    setActiveRoom(prev => prev ? {...prev, position_ms: msg.position_ms, status: "paused"} : prev);
                } else if (msg.type === "seek") {
                    setActiveRoom(prev => prev ? {...prev, position_ms: msg.position_ms} : prev);
                }
                // Forward to player
                onPlayerEvent.current?.(msg);
                break;
            case "media_change":
                setActiveRoom(prev => prev ? {
                    ...prev,
                    media_id: msg.media_id,
                    media_title: msg.title ?? null,
                    duration_ms: msg.duration_ms ?? 0,
                    position_ms: 0,
                    status: "idle",
                } : prev);
                break;
            case "buffering":
            case "all_ready":
            case "heartbeat":
                onPlayerEvent.current?.(msg);
                break;
            case "error":
                toast.error(msg.message);
                break;
        }
    }, [navigate]);

    const {connected, send, disconnect} = useWatchParty({
        roomId: roomIdRef.current,
        onMessage: handleWsMessage,
    });

    const createParty = useCallback(async (req: CreateWatchPartyRequest): Promise<WatchRoom> => {
        const room = await api.post<WatchRoom>("/watch-party/rooms", {
            name: req.name || null,
            accessMode: req.accessMode,
            allowedUserIds: req.allowedUserIds || [],
        });
        setActiveRoom(room);
        roomIdRef.current = room.id;
        sessionStorage.setItem("watchPartyRoomId", room.id);
        toast.success("Watch party created!");
        return room;
    }, []);

    const joinParty = useCallback(async (roomId: string) => {
        const room = await api.get<WatchRoom>(`/watch-party/rooms/${roomId}`);
        setActiveRoom(room);
        roomIdRef.current = room.id;
        sessionStorage.setItem("watchPartyRoomId", room.id);
        toast.success("Joined watch party!");
    }, []);

    const leaveParty = useCallback(() => {
        disconnect();
        setActiveRoom(null);
        roomIdRef.current = null;
        sessionStorage.removeItem("watchPartyRoomId");
        toast.info("Left the watch party");
    }, [disconnect]);

    const closeParty = useCallback(async () => {
        if (!activeRoom) return;
        await api.delete(`/watch-party/rooms/${activeRoom.id}`);
        disconnect();
        setActiveRoom(null);
        roomIdRef.current = null;
        sessionStorage.removeItem("watchPartyRoomId");
        toast.success("Watch party closed");
    }, [activeRoom, disconnect]);

    const sendPlay = useCallback((positionMs: number) => {
        send({type: "play", position_ms: positionMs});
    }, [send]);

    const sendPause = useCallback((positionMs: number) => {
        send({type: "pause", position_ms: positionMs});
    }, [send]);

    const sendSeek = useCallback((positionMs: number) => {
        send({type: "seek", position_ms: positionMs});
    }, [send]);

    const sendNavigate = useCallback((mediaId: string) => {
        send({type: "navigate", media_id: mediaId, route: `/player/${mediaId}`});
    }, [send]);

    const sendMediaChange = useCallback((mediaId: string, title?: string, durationMs?: number) => {
        send({type: "media_change", media_id: mediaId, title, duration_ms: durationMs ?? 0});
    }, [send]);

    const sendSyncResponse = useCallback((positionMs: number, isPaused: boolean, mediaId: string) => {
        send({type: "sync_response", position_ms: positionMs, is_paused: isPaused, media_id: mediaId});
    }, [send]);

    const sendBuffering = useCallback(() => {
        send({type: "buffering", user_id: 0});
    }, [send]);

    const sendReady = useCallback(() => {
        send({type: "ready", user_id: 0});
    }, [send]);

    const addToQueue = useCallback((mediaId: string) => {
        send({type: "queue_add", media_id: mediaId});
    }, [send]);

    const removeFromQueue = useCallback((index: number) => {
        send({type: "queue_remove", index});
    }, [send]);

    const nextInQueue = useCallback(() => {
        send({type: "next_episode"});
    }, [send]);

    const showOverlay = isInParty && !location.pathname.startsWith("/player");

    return (
        <WatchPartyContext.Provider value={{
            activeRoom,
            isInParty,
            isHost,
            connected,
            createParty,
            joinParty,
            leaveParty,
            closeParty,
            sendPlay,
            sendPause,
            sendSeek,
            sendNavigate,
            sendMediaChange,
            sendSyncResponse,
            sendBuffering,
            sendReady,
            addToQueue,
            removeFromQueue,
            nextInQueue,
            openCreateModal: onCreateOpen,
            openJoinModal: onJoinOpen,
            onPlayerEvent,
        }}>
            {children}
            {showOverlay && <WatchPartyOverlay/>}
            <CreatePartyModal isOpen={isCreateOpen} onClose={onCreateClose}/>
            <JoinPartyModal isOpen={isJoinOpen} onClose={onJoinClose}/>
        </WatchPartyContext.Provider>
    );
}
