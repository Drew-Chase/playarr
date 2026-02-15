import {useCallback, useEffect, useRef, useState} from "react";
import type {WsMessage} from "../lib/types.ts";

interface UseWatchPartyOptions {
    roomId: string | null;
    onMessage: (msg: WsMessage) => void;
}

interface UseWatchPartyReturn {
    connected: boolean;
    send: (msg: WsMessage) => void;
    disconnect: () => void;
}

export function useWatchParty({roomId, onMessage}: UseWatchPartyOptions): UseWatchPartyReturn {
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;
    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;

    const connect = useCallback(() => {
        if (!roomIdRef.current) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${protocol}//${window.location.host}/api/watch-party/rooms/${roomIdRef.current}/ws`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data) as WsMessage;
                onMessageRef.current(msg);
            } catch {
                // ignore malformed messages
            }
        };

        ws.onclose = () => {
            setConnected(false);
            wsRef.current = null;

            // Exponential backoff reconnect (only if we still have a roomId)
            if (roomIdRef.current) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                reconnectAttemptsRef.current++;
                reconnectTimeoutRef.current = window.setTimeout(connect, delay);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        reconnectAttemptsRef.current = 0;
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnected(false);
    }, []);

    const send = useCallback((msg: WsMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);

    useEffect(() => {
        if (roomId) {
            connect();
        } else {
            disconnect();
        }
        return () => {
            disconnect();
        };
    }, [roomId, connect, disconnect]);

    return {connected, send, disconnect};
}
