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

/** How often to send a keepalive ping (ms). */
const PING_INTERVAL = 20_000;
/** If no message is received within this window, assume the connection is dead (ms). */
const DEAD_TIMEOUT = 35_000;

export function useWatchParty({roomId, onMessage}: UseWatchPartyOptions): UseWatchPartyReturn {
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;
    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;

    const pingIntervalRef = useRef<number | null>(null);
    const lastMessageRef = useRef<number>(0);
    const deadCheckRef = useRef<number | null>(null);

    const clearTimers = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
        if (deadCheckRef.current) {
            clearInterval(deadCheckRef.current);
            deadCheckRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        if (!roomIdRef.current) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${protocol}//${window.location.host}/api/watch-party/rooms/${roomIdRef.current}/ws`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            reconnectAttemptsRef.current = 0;
            lastMessageRef.current = Date.now();

            // Start keepalive ping
            clearTimers();
            pingIntervalRef.current = window.setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({type: "ping"}));
                }
            }, PING_INTERVAL);

            // Start dead-connection checker
            deadCheckRef.current = window.setInterval(() => {
                if (Date.now() - lastMessageRef.current > DEAD_TIMEOUT) {
                    console.warn("[WatchParty] No message received in", DEAD_TIMEOUT, "ms — forcing reconnect");
                    ws.close();
                }
            }, 5_000);
        };

        ws.onmessage = (event) => {
            lastMessageRef.current = Date.now();
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
            clearTimers();

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
    }, [clearTimers]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        reconnectAttemptsRef.current = 0;
        clearTimers();
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnected(false);
    }, [clearTimers]);

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
