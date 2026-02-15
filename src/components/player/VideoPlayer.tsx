import {useCallback, useEffect, useRef, useState} from "react";
import Hls from "hls.js";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";
import {plexApi} from "../../lib/plex.ts";
import {checkDirectPlayability} from "../../lib/codec-support.ts";
import {parseBif} from "../../lib/bif-parser.ts";
import type {PlexMediaItem, StreamInfo, PlexStream, BifData, WsMessage} from "../../lib/types.ts";
import {useWatchPartyContext} from "../../providers/WatchPartyProvider.tsx";
import PlayerControls from "./PlayerControls.tsx";
import PlayerOverlay from "./PlayerOverlay.tsx";
import WatchQueuePanel from "./WatchQueuePanel.tsx";
import EpisodeQueuePanel from "./EpisodeQueuePanel.tsx";

interface VideoPlayerProps {
    item: PlexMediaItem;
    onNext?: () => void;
    onPrevious?: () => void;
    hasNext?: boolean;
    hasPrevious?: boolean;
    episodes?: PlexMediaItem[];
}

export default function VideoPlayer({item, onNext, onPrevious, hasNext, hasPrevious, episodes}: VideoPlayerProps) {
    const navigate = useNavigate();
    const watchParty = useWatchPartyContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const timelineIntervalRef = useRef<number | null>(null);
    const savedPositionRef = useRef<number>(0);
    const lastReportTimeRef = useRef<number>(0);
    const scrobbledRef = useRef(false);
    const isTransitioningRef = useRef(false);
    const lastHostPositionRef = useRef<number>(0);
    const syncFromPartyRef = useRef(false);

    const durationRef = useRef<number>(0);

    const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [quality, setQuality] = useState("original");
    const [bifData, setBifData] = useState<BifData | null>(null);
    const [showQueue, setShowQueue] = useState(false);

    const isInParty = watchParty?.isInParty ?? false;
    const isHost = watchParty?.isHost ?? false;

    // Get available streams
    const subtitleStreams: PlexStream[] = [];
    const audioStreams: PlexStream[] = [];

    if (streamInfo?.part?.Stream) {
        for (const s of streamInfo.part.Stream) {
            if (s.streamType === 3) subtitleStreams.push(s);
            if (s.streamType === 2) audioStreams.push(s);
        }
    }

    // Report timeline to Plex
    const reportTimeline = useCallback((state: "playing" | "paused" | "stopped") => {
        const video = videoRef.current;
        if (!video) return;
        lastReportTimeRef.current = Date.now();

        plexApi.updateTimeline({
            ratingKey: item.ratingKey,
            key: item.key,
            state,
            time: Math.floor(video.currentTime * 1000),
            duration: Math.floor((video.duration || 0) * 1000),
        }).catch(() => {});
    }, [item.ratingKey, item.key]);

    // Load BIF data for timeline previews
    useEffect(() => {
        let cancelled = false;
        plexApi.getBifData(item.ratingKey).then((buffer) => {
            if (cancelled || !buffer) return;
            const parsed = parseBif(buffer);
            setBifData(parsed);
        });
        return () => { cancelled = true; };
    }, [item.ratingKey]);

    // Reset state when item changes
    useEffect(() => {
        savedPositionRef.current = 0;
        scrobbledRef.current = false;
    }, [item.ratingKey]);

    // Load stream
    useEffect(() => {
        const abortController = new AbortController();
        loadStream(abortController.signal);
        return () => {
            isTransitioningRef.current = true;
            abortController.abort();
            cleanup();
        };
    }, [item.ratingKey, quality]);

    const loadStream = async (signal?: AbortSignal) => {
        const video = videoRef.current;

        // Capture current position before cleanup (for quality switches)
        const resumePosition = savedPositionRef.current > 0
            ? savedPositionRef.current
            : (item.viewOffset ? item.viewOffset / 1000 : 0);

        let info: StreamInfo;

        if (quality === "original") {
            // Check codec compatibility before attempting direct play
            const media = item.Media?.[0];
            if (media) {
                const {recommendation, reason} = checkDirectPlayability(
                    media.videoCodec,
                    media.audioCodec,
                    media.container,
                );

                if (recommendation === "direct") {
                    info = await plexApi.getStreamUrl(item.ratingKey, quality, true);
                } else if (recommendation === "directstream") {
                    // Video OK, audio/container incompatible - use directstream
                    info = await plexApi.getStreamUrl(item.ratingKey, quality, false, true);
                    console.info(`DirectStream mode: ${reason}`);
                } else {
                    // Full transcode needed
                    info = await plexApi.getStreamUrl(item.ratingKey, "1080p", false);
                    console.info(`Auto-transcode: ${reason}`);
                }
            } else {
                info = await plexApi.getStreamUrl(item.ratingKey, quality, true);
            }
        } else {
            info = await plexApi.getStreamUrl(item.ratingKey, quality, false);
        }

        // Bail out if this effect was superseded by a newer quality change
        if (signal?.aborted) return;

        setStreamInfo(info);
        if (!video) return;

        // Guard against stale error events during transition
        isTransitioningRef.current = true;
        video.removeAttribute("src");
        video.load();
        cleanup();

        if ((info.type === "hls" || info.type === "directstream") && Hls.isSupported()) {
            const hls = new Hls({
                startPosition: resumePosition,
            });
            hlsRef.current = hls;
            hls.loadSource(info.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                isTransitioningRef.current = false;
                video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn("HLS network error, attempting recovery...");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn("HLS media error, attempting recovery...");
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error("Fatal HLS error, falling back to transcode");
                            handleVideoError();
                            break;
                    }
                }
            });
        } else {
            video.src = info.url;
            video.currentTime = resumePosition;
            isTransitioningRef.current = false;
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

    // Error fallback: if direct play fails, switch to transcode
    const handleVideoError = useCallback(() => {
        if (isTransitioningRef.current) return;
        console.warn("Video playback error, falling back to transcode");
        setQuality(prev => prev === "original" ? "1080p" : prev);
    }, []);

    // Timeline reporting every 10 seconds
    useEffect(() => {
        timelineIntervalRef.current = window.setInterval(() => {
            const video = videoRef.current;
            if (!video || video.paused) return;

            // Skip if we reported recently from a play/pause/seek event
            if (Date.now() - lastReportTimeRef.current < 5000) return;

            reportTimeline("playing");
        }, 10000);

        return () => {
            if (timelineIntervalRef.current) {
                clearInterval(timelineIntervalRef.current);
            }
        };
    }, [item.ratingKey, reportTimeline]);

    // Send stop signal on unmount (SPA navigation) using sendBeacon for reliability
    useEffect(() => {
        return () => {
            if (savedPositionRef.current > 0) {
                plexApi.sendStopBeacon(
                    item.ratingKey,
                    item.key,
                    Math.floor(savedPositionRef.current * 1000),
                    Math.floor(durationRef.current * 1000),
                );
            }
        };
    }, [item.ratingKey, item.key]);

    // Send stop signal on browser close/refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (savedPositionRef.current > 0) {
                plexApi.sendStopBeacon(
                    item.ratingKey,
                    item.key,
                    Math.floor(savedPositionRef.current * 1000),
                    Math.floor(durationRef.current * 1000),
                );
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [item.ratingKey, item.key]);

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
                    reportTimeline(video.paused ? "paused" : "playing");
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    reportTimeline(video.paused ? "paused" : "playing");
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    handleVolumeChange(Math.min(1, volume + 0.1));
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    handleVolumeChange(Math.max(0, volume - 0.1));
                    break;
                case "N":
                    if (e.shiftKey && onNext) {
                        e.preventDefault();
                        onNext();
                    }
                    break;
                case "P":
                    if (e.shiftKey && onPrevious) {
                        e.preventDefault();
                        onPrevious();
                    }
                    break;
                case "Escape":
                    if (isFullscreen) {
                        document.exitFullscreen();
                    } else {
                        navigate("/");
                    }
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [volume, isPlaying, isFullscreen, reportTimeline]);

    // Watch party: subscribe to player events from provider
    useEffect(() => {
        if (!watchParty || !isInParty) return;

        const handlePartyEvent = (msg: WsMessage) => {
            const video = videoRef.current;
            if (!video) return;

            syncFromPartyRef.current = true;
            switch (msg.type) {
                case "play":
                    video.currentTime = msg.position_ms / 1000;
                    video.play().catch(() => {});
                    break;
                case "pause":
                    video.currentTime = msg.position_ms / 1000;
                    video.pause();
                    break;
                case "seek":
                    video.currentTime = msg.position_ms / 1000;
                    break;
                case "sync_response":
                    lastHostPositionRef.current = msg.position_ms / 1000;
                    break;
            }
            setTimeout(() => { syncFromPartyRef.current = false; }, 100);
        };

        watchParty.onPlayerEvent.current = handlePartyEvent;
        return () => {
            watchParty.onPlayerEvent.current = null;
        };
    }, [watchParty, isInParty]);

    // Watch party: host sends periodic sync every 3 seconds
    useEffect(() => {
        if (!isInParty || !isHost || !watchParty) return;

        const interval = window.setInterval(() => {
            const video = videoRef.current;
            if (!video) return;
            watchParty.sendSyncResponse(
                Math.floor(video.currentTime * 1000),
                video.paused,
                item.ratingKey,
            );
        }, 3000);

        return () => clearInterval(interval);
    }, [isInParty, isHost, watchParty, item.ratingKey]);

    // Watch party: host sends navigate when entering player
    useEffect(() => {
        if (isInParty && isHost && watchParty) {
            watchParty.sendNavigate(item.ratingKey);
        }
    }, [item.ratingKey]);

    // Watch party: non-host adaptive sync (adjust playback rate)
    useEffect(() => {
        if (!isInParty || isHost) return;

        const interval = window.setInterval(() => {
            const video = videoRef.current;
            if (!video || video.paused) return;

            const drift = video.currentTime - lastHostPositionRef.current;
            if (Math.abs(drift) > 5) {
                // Hard seek if drift too large
                video.currentTime = lastHostPositionRef.current;
                video.playbackRate = 1.0;
            } else if (drift > 1.5) {
                video.playbackRate = 0.95;
            } else if (drift < -1.5) {
                video.playbackRate = 1.05;
            } else {
                video.playbackRate = 1.0;
            }
        }, 2000);

        return () => {
            clearInterval(interval);
            const video = videoRef.current;
            if (video) video.playbackRate = 1.0;
        };
    }, [isInParty, isHost]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        // Non-host in party: block play/pause
        if (isInParty && !isHost) {
            toast.info("Only the host can control playback");
            return;
        }

        if (video.paused) {
            video.play();
            if (isInParty && isHost && watchParty) {
                watchParty.sendPlay(Math.floor(video.currentTime * 1000));
            }
        } else {
            video.pause();
            if (isInParty && isHost && watchParty) {
                watchParty.sendPause(Math.floor(video.currentTime * 1000));
            }
        }
    }, [isInParty, isHost, watchParty]);

    const handleSeek = useCallback((time: number) => {
        const video = videoRef.current;
        if (!video) return;

        if (isInParty && !isHost) {
            toast.info("Only the host can control playback");
            return;
        }

        video.currentTime = time;
        reportTimeline(video.paused ? "paused" : "playing");

        if (isInParty && isHost && watchParty) {
            watchParty.sendSeek(Math.floor(time * 1000));
        }
    }, [reportTimeline, isInParty, isHost, watchParty]);

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

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        setCurrentTime(video.currentTime);
        savedPositionRef.current = video.currentTime;

        // Mark as watched at 90% through (once)
        if (!scrobbledRef.current && video.duration && video.currentTime / video.duration > 0.9) {
            scrobbledRef.current = true;
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
                onDurationChange={() => {
                    const d = videoRef.current?.duration || 0;
                    setDuration(d);
                    durationRef.current = d;
                }}
                onPlay={() => {
                    setIsPlaying(true);
                    reportTimeline("playing");
                }}
                onPause={() => {
                    setIsPlaying(false);
                    reportTimeline("paused");
                }}
                onError={handleVideoError}
                onEnded={() => {
                    plexApi.scrobble(item.ratingKey).catch(() => {});
                    plexApi.updateTimeline({
                        ratingKey: item.ratingKey,
                        key: item.key,
                        state: "stopped",
                        time: Math.floor(duration * 1000),
                        duration: Math.floor(duration * 1000),
                    }).catch(() => {});
                    // In a watch party, only the host auto-advances;
                    // members navigate via the host's "navigate" broadcast
                    if (!isInParty || isHost) {
                        onNext?.();
                    }
                }}
                onClick={togglePlay}
            />

            <PlayerOverlay
                item={item}
                visible={showControls}
                onBack={() => navigate("/")}
                isInParty={isInParty}
                participantCount={watchParty?.activeRoom?.participants.length ?? 0}
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
                bifData={bifData}
                onTogglePlay={togglePlay}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={handleMuteToggle}
                onToggleFullscreen={toggleFullscreen}
                onQualityChange={setQuality}
                isInParty={isInParty}
                participants={watchParty?.activeRoom?.participants}
                hostUserId={watchParty?.activeRoom?.host_user_id}
                onToggleQueue={(episodes?.length || isInParty) ? () => setShowQueue(q => !q) : undefined}
                onNext={onNext}
                onPrevious={onPrevious}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
            />

            {isInParty && watchParty?.activeRoom && (
                <WatchQueuePanel
                    isOpen={showQueue}
                    onClose={() => setShowQueue(false)}
                    queue={watchParty.activeRoom.episode_queue}
                    isHost={isHost}
                    onRemoveItem={watchParty.removeFromQueue}
                    onPlayNext={watchParty.nextInQueue}
                />
            )}

            {!isInParty && episodes && episodes.length > 0 && (
                <EpisodeQueuePanel
                    isOpen={showQueue}
                    onClose={() => setShowQueue(false)}
                    episodes={episodes}
                    currentRatingKey={item.ratingKey}
                    onSelectEpisode={(ratingKey) => navigate(`/player/${ratingKey}`, {replace: true})}
                />
            )}
        </div>
    );
}
