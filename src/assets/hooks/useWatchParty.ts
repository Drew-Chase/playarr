import {useCallback, useEffect, useRef, useState} from "react";
import type {WatchRoom, WsMessage} from "../lib/types";

interface UseWatchPartyOptions {
    roomId: string;
    userName: string;
    onMessage?: (msg: WsMessage) => void;
}

export function useWatchParty({roomId, userName, onMessage}: UseWatchPartyOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [room, setRoom] = useState<WatchRoom | null>(null);

    useEffect(() => {
        if (!roomId) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/watch-party/rooms/${roomId}/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            send({type: "join", name: userName});
            send({type: "sync_request"});
        };

        ws.onmessage = (event) => {
            const msg: WsMessage = JSON.parse(event.data);
            onMessage?.(msg);

            if (msg.type === "sync_response") {
                setRoom((prev) => prev ? {
                    ...prev,
                    position_ms: msg.position_ms,
                    is_paused: msg.is_paused,
                    media_id: msg.media_id,
                } : prev);
            }
        };

        ws.onclose = () => {
            setConnected(false);
        };

        return () => {
            send({type: "leave", name: userName});
            ws.close();
        };
    }, [roomId, userName]);

    const send = useCallback((msg: WsMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);

    return {connected, room, send};
}
