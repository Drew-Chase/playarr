import {useCallback, useEffect, useRef, useState} from "react";
import Hls from "hls.js";
import {useNavigate} from "react-router-dom";
import {plexApi} from "../../lib/plex";
import type {PlexMediaItem, StreamInfo, PlexStream} from "../../lib/types";
import PlayerControls from "./PlayerControls";
import PlayerOverlay from "./PlayerOverlay";

interface VideoPlayerProps {
    item: PlexMediaItem;
}

export default function VideoPlayer({item}: VideoPlayerProps) {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const timelineIntervalRef = useRef<number | null>(null);

    const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [quality, setQuality] = useState("original");

    // Get available streams
    const subtitleStreams: PlexStream[] = [];
    const audioStreams: PlexStream[] = [];

    if (streamInfo?.part?.Stream) {
        for (const s of streamInfo.part.Stream) {
            if (s.streamType === 3) subtitleStreams.push(s);
            if (s.streamType === 2) audioStreams.push(s);
        }
    }

    // Load stream
    useEffect(() => {
        loadStream();
        return () => {
            cleanup();
        };
    }, [item.ratingKey, quality]);

    const loadStream = async () => {
        const directPlay = quality === "original";
        const info = await plexApi.getStreamUrl(item.ratingKey, quality, directPlay);
        setStreamInfo(info);

        const video = videoRef.current;
        if (!video) return;

        cleanup();

        if (info.type === "hls" && Hls.isSupported()) {
            const hls = new Hls({
                startPosition: item.viewOffset ? item.viewOffset / 1000 : 0,
            });
            hlsRef.current = hls;
            hls.loadSource(info.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
            });
        } else {
            video.src = info.url;
            if (item.viewOffset) {
                video.currentTime = item.viewOffset / 1000;
            }
            video.play().catch(() => {});
        }
    };

    const cleanup = () => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (timelineIntervalRef.current) {
            clearInterval(timelineIntervalRef.current);
            timelineIntervalRef.current = null;
        }
    };

    // Timeline reporting every 10 seconds
    useEffect(() => {
        timelineIntervalRef.current = window.setInterval(() => {
            const video = videoRef.current;
            if (!video || video.paused) return;

            plexApi.updateTimeline({
                ratingKey: item.ratingKey,
                key: item.key,
                state: "playing",
                time: Math.floor(video.currentTime * 1000),
                duration: Math.floor(video.duration * 1000),
            }).catch(() => {});
        }, 10000);

        return () => {
            if (timelineIntervalRef.current) {
                clearInterval(timelineIntervalRef.current);
            }
        };
    }, [item]);

    // Auto-hide controls
    useEffect(() => {
        let timeout: number;
        const handleMouseMove = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                if (isPlaying) setShowControls(false);
            }, 3000);
        };

        document.addEventListener("mousemove", handleMouseMove);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            clearTimeout(timeout);
        };
    }, [isPlaying]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;

            switch (e.key) {
                case " ":
                case "k":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "f":
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case "m":
                    e.preventDefault();
                    handleMuteToggle();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    handleVolumeChange(Math.min(1, volume + 0.1));
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    handleVolumeChange(Math.max(0, volume - 0.1));
                    break;
                case "Escape":
                    if (isFullscreen) {
                        document.exitFullscreen();
                    } else {
                        navigate(-1);
                    }
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [volume, isPlaying, isFullscreen]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }, []);

    const handleSeek = useCallback((time: number) => {
        const video = videoRef.current;
        if (video) video.currentTime = time;
    }, []);

    const handleVolumeChange = useCallback((vol: number) => {
        const video = videoRef.current;
        if (video) {
            video.volume = vol;
            setVolume(vol);
            setIsMuted(vol === 0);
        }
    }, []);

    const handleMuteToggle = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            video.muted = !video.muted;
            setIsMuted(video.muted);
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleFsChange);
        return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    // Auto-scrobble when near end
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        setCurrentTime(video.currentTime);
        // Mark as watched at 90% through
        if (video.duration && video.currentTime / video.duration > 0.9) {
            plexApi.scrobble(item.ratingKey).catch(() => {});
        }
    };

    return (
        <div
            className="relative w-screen h-screen bg-black"
            style={{cursor: showControls ? "default" : "none"}}
        >
            <video
                ref={videoRef}
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    plexApi.scrobble(item.ratingKey).catch(() => {});
                    plexApi.updateTimeline({
                        ratingKey: item.ratingKey,
                        key: item.key,
                        state: "stopped",
                        time: Math.floor(duration * 1000),
                        duration: Math.floor(duration * 1000),
                    }).catch(() => {});
                }}
                onClick={togglePlay}
            />

            <PlayerOverlay
                item={item}
                visible={showControls}
                onBack={() => navigate(-1)}
            />

            <PlayerControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                isMuted={isMuted}
                isFullscreen={isFullscreen}
                visible={showControls}
                subtitleStreams={subtitleStreams}
                audioStreams={audioStreams}
                quality={quality}
                onTogglePlay={togglePlay}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={handleMuteToggle}
                onToggleFullscreen={toggleFullscreen}
                onQualityChange={setQuality}
            />
        </div>
    );
}
