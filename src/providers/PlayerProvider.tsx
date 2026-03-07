import {createContext, ReactNode, useCallback, useContext, useMemo, useState} from "react";
import type {PlexMediaItem, StreamInfo} from "../lib/types.ts";

interface PlayerState {
    currentItem: PlexMediaItem | null;
    streamInfo: StreamInfo | null;
    isPlaying: boolean;
    position: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    selectedSubtitleId: number | null;
    selectedAudioId: number | null;
    quality: string;
    isDrawerOpen: boolean;
}

interface QueueContextType {
    queue: PlexMediaItem[];
    queueIndex: number;
    isQueueActive: boolean;
    addToQueue: (items: PlexMediaItem[]) => void;
    playNext: (items: PlexMediaItem[]) => void;
    removeFromQueue: (index: number) => void;
    clearQueue: () => void;
    playFromQueue: (index: number) => void;
    advanceQueue: () => PlexMediaItem | null;
    retreatQueue: () => PlexMediaItem | null;
    syncQueueIndex: (ratingKey: string) => void;
}

interface PlayerContextType extends PlayerState, QueueContextType {
    setCurrentItem: (item: PlexMediaItem | null) => void;
    setStreamInfo: (info: StreamInfo | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setPosition: (pos: number) => void;
    setDuration: (dur: number) => void;
    setVolume: (vol: number) => void;
    setIsMuted: (muted: boolean) => void;
    setIsFullscreen: (fs: boolean) => void;
    setSelectedSubtitleId: (id: number | null) => void;
    setSelectedAudioId: (id: number | null) => void;
    setQuality: (q: string) => void;
    setIsDrawerOpen: (open: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({children}: { children: ReactNode }) {
    const [currentItem, setCurrentItem] = useState<PlexMediaItem | null>(null);
    const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedSubtitleId, setSelectedSubtitleId] = useState<number | null>(null);
    const [selectedAudioId, setSelectedAudioId] = useState<number | null>(null);
    const [quality, setQuality] = useState("original");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Queue state
    const [queue, setQueue] = useState<PlexMediaItem[]>([]);
    const [queueIndex, setQueueIndex] = useState(-1);

    const isQueueActive = useMemo(() => queue.length > 0, [queue.length]);

    const addToQueue = useCallback((items: PlexMediaItem[]) => {
        setQueue(prev => [...prev, ...items]);
    }, []);

    const playNext = useCallback((items: PlexMediaItem[]) => {
        setQueue(prev => {
            const insertAt = queueIndex >= 0 ? queueIndex + 1 : 0;
            return [...prev.slice(0, insertAt), ...items, ...prev.slice(insertAt)];
        });
    }, [queueIndex]);

    const removeFromQueue = useCallback((index: number) => {
        setQueue(prev => prev.filter((_, i) => i !== index));
        setQueueIndex(prev => {
            if (index < prev) return prev - 1;
            if (index === prev && prev >= queue.length - 1) return prev - 1;
            return prev;
        });
    }, [queue.length]);

    const clearQueue = useCallback(() => {
        setQueue([]);
        setQueueIndex(-1);
    }, []);

    const playFromQueue = useCallback((index: number) => {
        setQueueIndex(index);
    }, []);

    const advanceQueue = useCallback((): PlexMediaItem | null => {
        const nextIdx = queueIndex + 1;
        if (nextIdx < queue.length) {
            setQueueIndex(nextIdx);
            return queue[nextIdx];
        }
        return null;
    }, [queue, queueIndex]);

    const retreatQueue = useCallback((): PlexMediaItem | null => {
        const prevIdx = queueIndex - 1;
        if (prevIdx >= 0) {
            setQueueIndex(prevIdx);
            return queue[prevIdx];
        }
        return null;
    }, [queue, queueIndex]);

    const syncQueueIndex = useCallback((ratingKey: string) => {
        if (queue.length === 0) return;
        const idx = queue.findIndex(item => item.ratingKey === ratingKey);
        if (idx >= 0) setQueueIndex(idx);
    }, [queue]);

    return (
        <PlayerContext.Provider
            value={{
                currentItem,
                streamInfo,
                isPlaying,
                position,
                duration,
                volume,
                isMuted,
                isFullscreen,
                selectedSubtitleId,
                selectedAudioId,
                quality,
                isDrawerOpen,
                setCurrentItem,
                setStreamInfo,
                setIsPlaying,
                setPosition,
                setDuration,
                setVolume,
                setIsMuted,
                setIsFullscreen,
                setSelectedSubtitleId,
                setSelectedAudioId,
                setQuality,
                setIsDrawerOpen,
                // Queue
                queue,
                queueIndex,
                isQueueActive,
                addToQueue,
                playNext,
                removeFromQueue,
                clearQueue,
                playFromQueue,
                advanceQueue,
                retreatQueue,
                syncQueueIndex,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer(): PlayerContextType {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error("usePlayer must be used within a PlayerProvider");
    }
    return context;
}
