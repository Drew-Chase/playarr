import {createContext, ReactNode, useContext, useState} from "react";
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
}

interface PlayerContextType extends PlayerState {
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
