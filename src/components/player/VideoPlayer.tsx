import {useCallback, useEffect, useRef, useState} from "react";
import Hls from "hls.js";
import {useNavigate} from "react-router-dom";
import {plexApi} from "../../lib/plex.ts";
import {checkDirectPlayability} from "../../lib/codec-support.ts";
import {parseBif} from "../../lib/bif-parser.ts";
import type {PlexMediaItem, StreamInfo, PlexStream, BifData, WsMessage} from "../../lib/types.ts";
import {useAuth} from "../../providers/AuthProvider.tsx";
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
    const {isGuest} = useAuth();
    const watchParty = useWatchPartyContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const timelineIntervalRef = useRef<number | null>(null);
    const savedPositionRef = useRef<number>(0);
    const lastReportTimeRef = useRef<number>(0);
    const scrobbledRef = useRef(false);
    const isTransitioningRef = useRef(false);
    const syncFromPartyRef = useRef(false);
    const remoteRef = useRef({ t: 0, playing: false, m: performance.now() });
    const rateTimerRef = useRef<number | null>(null);
    const prevRatingKeyRef = useRef<string>("");
    const currentRatingKeyRef = useRef<string>(item.ratingKey);
    const bufferingUsersRef = useRef<Set<number>>(new Set());
    const bufferingTimerRef = useRef<number | null>(null);
    const localBufferingRef = useRef(false);
    // True once the video has played at least one frame (onTimeUpdate fired).
    // Prevents sending buffering/play messages during initial load.
    const hasPlayedRef = useRef(false);

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
    const [isSeeking, setIsSeeking] = useState(false);
    const [bufferingUsers, setBufferingUsers] = useState<Set<number>>(new Set());
    const [syncStatus, setSyncStatus] = useState<"in_sync" | "syncing" | "disconnected">("in_sync");
    const [displayRate, setDisplayRate] = useState(1);

    const isInParty = watchParty?.isInParty ?? false;
    const isHost = watchParty?.isHost ?? false;

    // Refs for unmount-only cleanup (avoid stale closures)
    const watchPartyRef = useRef(watchParty);
    watchPartyRef.current = watchParty;
    const isInPartyRef = useRef(isInParty);
    isInPartyRef.current = isInParty;

    // Get available streams
    const subtitleStreams: PlexStream[] = [];
    const audioStreams: PlexStream[] = [];

    if (streamInfo?.part?.Stream) {
        for (const s of streamInfo.part.Stream) {
            if (s.streamType === 3) subtitleStreams.push(s);
            if (s.streamType === 2) audioStreams.push(s);
        }
    }

    // Report timeline to Plex (skip for guest users)
    const reportTimeline = useCallback((state: "playing" | "paused" | "stopped") => {
        if (isGuest) return;
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
    }, [item.ratingKey, item.key, isGuest]);

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

    // Keep current ratingKey ref in sync
    currentRatingKeyRef.current = item.ratingKey;

    // Reset state when item changes
    useEffect(() => {
        savedPositionRef.current = 0;
        scrobbledRef.current = false;
        hasPlayedRef.current = false;
        setCurrentTime(0);
        setDuration(0);
        remoteRef.current = { t: 0, playing: false, m: performance.now() };
        bufferingUsersRef.current = new Set();
        setBufferingUsers(new Set());
        localBufferingRef.current = false;
        if (bufferingTimerRef.current) {
            clearTimeout(bufferingTimerRef.current);
            bufferingTimerRef.current = null;
        }
    }, [item.ratingKey]);

    // Load stream
    useEffect(() => {
        const isQualityChange = prevRatingKeyRef.current === item.ratingKey && prevRatingKeyRef.current !== "";
        prevRatingKeyRef.current = item.ratingKey;
        const abortController = new AbortController();
        loadStream(abortController.signal, isQualityChange);
        return () => {
            isTransitioningRef.current = true;
            abortController.abort();
            cleanup();
        };
    }, [item.ratingKey, quality]);

    const loadStream = async (signal?: AbortSignal, isQualityChange = false) => {
        const video = videoRef.current;

        // Use saved position for quality changes; for party members joining mid-stream,
        // start at the room's current position so we don't reset everyone.
        // Only use activeRoom.position_ms if the room is playing the SAME media
        // (joining mid-stream). For new episodes, start at 0.
        const resumePosition = savedPositionRef.current > 0
            ? savedPositionRef.current
            : (isInParty
                ? (watchParty?.activeRoom?.media_id === item.ratingKey
                    ? (watchParty?.activeRoom?.position_ms ?? 0) / 1000
                    : 0)
                : (item.viewOffset ? item.viewOffset / 1000 : 0));

        let info: StreamInfo;

        try {
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
        } catch (err) {
            console.warn("Failed to get stream URL, falling back to transcode:", err);
            if (quality === "original") {
                setQuality("1080p");
            }
            return;
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

        // Decide whether to auto-play after loading:
        // - Not in a party: always auto-play
        // - Quality change in a party: respect current remote play/pause state
        // - Joining mid-stream (watching): auto-play, heartbeat will sync position
        // - Room paused/buffering: don't auto-play, wait for explicit play
        // - Room idle (new episode): auto-play to kick off playback
        const shouldAutoPlay = () => {
            if (!isInParty) return true;
            if (isQualityChange) return remoteRef.current.playing;
            const roomStatus = watchParty?.activeRoom?.status;
            return roomStatus === "watching" || roomStatus === "idle";
        };

        // After auto-playing a new episode in a party, notify the server
        // so the room transitions from Idle to Watching and heartbeat starts.
        // Only send when room is idle (fresh episode start). For any other
        // status, the joiner just syncs via heartbeat — sending Play here
        // would reset everyone because video.currentTime is still 0 at
        // MANIFEST_PARSED time (HLS hasn't loaded segments yet).
        const notifyPartyPlay = () => {
            if (isInParty && watchParty && isHost && !isQualityChange) {
                const roomStatus = watchParty?.activeRoom?.status;
                if (roomStatus !== "idle") return;
                watchParty.sendPlay(Math.floor((video?.currentTime ?? 0) * 1000));
            }
        };

        if ((info.type === "hls" || info.type === "directstream") && Hls.isSupported()) {
            const hls = new Hls({
                startPosition: resumePosition,
            });
            hlsRef.current = hls;
            hls.loadSource(info.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                isTransitioningRef.current = false;
                if (shouldAutoPlay()) {
                    video.play().then(notifyPartyPlay).catch(() => {});
                }
                // Request authoritative position when joining mid-stream.
                // Skip for new episodes (resumePosition 0) — the room is Idle
                // and the sync response would incorrectly pause the video.
                if (isInParty && watchParty && !isQualityChange && resumePosition > 0) {
                    watchParty.sendSyncRequest();
                }
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
            if (shouldAutoPlay()) {
                video.play().then(notifyPartyPlay).catch(() => {});
            }
            // Request authoritative position from server after load (only when joining mid-stream)
            if (isInParty && watchParty && !isQualityChange && resumePosition > 0) {
                watchParty.sendSyncRequest();
            }
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

    // Send stop signal on unmount (SPA navigation) using sendBeacon for reliability (skip for guests)
    useEffect(() => {
        return () => {
            if (!isGuest && savedPositionRef.current > 0) {
                plexApi.sendStopBeacon(
                    item.ratingKey,
                    item.key,
                    Math.floor(savedPositionRef.current * 1000),
                    Math.floor(durationRef.current * 1000),
                );
            }
        };
    }, [item.ratingKey, item.key, isGuest]);

    // Pause watch party on true component unmount only (not on episode transitions).
    // Guard: only send if we have a real position (> 0) to avoid resetting the room.
    useEffect(() => {
        return () => {
            if (isInPartyRef.current && watchPartyRef.current && savedPositionRef.current > 0) {
                watchPartyRef.current.sendPause(Math.floor(savedPositionRef.current * 1000));
            }
        };
    }, []);

    // Send stop signal on browser close/refresh (skip for guests)
    useEffect(() => {
        if (isGuest) return;
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
    }, [item.ratingKey, item.key, isGuest]);

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

    // Compute expected remote position accounting for elapsed time
    const rTarget = useCallback(() => {
        const r = remoteRef.current;
        return r.playing ? r.t + (performance.now() - r.m) / 1000 : r.t;
    }, []);

    // Apply sync: proportional rate correction or hard seek
    const applySync = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        // If anyone is buffering, keep video paused and don't sync
        if (bufferingUsersRef.current.size > 0) {
            if (!video.paused) video.pause();
            setSyncStatus("syncing");
            return;
        }

        const target = rTarget();
        const diff = target - video.currentTime;

        video.preservesPitch = true;

        if (Math.abs(diff) > 0.5) {
            // Hard seek for large drift
            if (video.readyState >= 1) {
                video.currentTime = target;
                setCurrentTime(target);
            }
            video.playbackRate = 1;
        } else if (remoteRef.current.playing) {
            // Proportional rate correction for small drift
            video.playbackRate = Math.max(0.5, Math.min(1.5, 1 + diff * 0.2));
            if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
            rateTimerRef.current = window.setTimeout(() => { video.playbackRate = 1; }, 800);
        }

        // Match play/pause state
        if (remoteRef.current.playing !== !video.paused) {
            if (remoteRef.current.playing) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        }

        setSyncStatus(Math.abs(diff) <= 0.2 ? "in_sync" : "syncing");
        setDisplayRate(video.playbackRate);
    }, [rTarget]);

    // Watch party: subscribe to player events from provider
    useEffect(() => {
        if (!watchParty || !isInParty) return;

        // Seed remoteRef from current room state so applySync has a valid target
        // even before the first heartbeat/room_state arrives
        const room = watchParty.activeRoom;
        if (room) {
            remoteRef.current.t = (room.position_ms ?? 0) / 1000;
            remoteRef.current.playing = room.status === "watching";
            remoteRef.current.m = performance.now();
        }

        const handlePartyEvent = (msg: WsMessage) => {
            const video = videoRef.current;
            if (!video) return;

            syncFromPartyRef.current = true;
            switch (msg.type) {
                case "heartbeat":
                    // Check media_id: if we're on the wrong episode, navigate
                    if (msg.media_id && msg.media_id !== currentRatingKeyRef.current) {
                        navigate(`/player/${msg.media_id}`, {replace: true});
                        break;
                    }
                    remoteRef.current.t = msg.server_time;
                    remoteRef.current.m = performance.now();
                    remoteRef.current.playing = true;
                    applySync();
                    break;
                case "play": {
                    // Clear this user from buffering set if they were buffering
                    const uid = msg.user_id;
                    if (uid && bufferingUsersRef.current.has(uid)) {
                        bufferingUsersRef.current.delete(uid);
                        setBufferingUsers(new Set(bufferingUsersRef.current));
                    }
                    remoteRef.current.t = msg.position_ms / 1000;
                    remoteRef.current.playing = true;
                    remoteRef.current.m = performance.now();
                    applySync();
                    break;
                }
                case "pause":
                    remoteRef.current.t = msg.position_ms / 1000;
                    remoteRef.current.playing = false;
                    remoteRef.current.m = performance.now();
                    applySync();
                    break;
                case "seek":
                    remoteRef.current.t = msg.position_ms / 1000;
                    remoteRef.current.m = performance.now();
                    applySync();
                    break;
                case "room_state":
                    remoteRef.current.t = msg.position_ms / 1000;
                    remoteRef.current.playing = !msg.is_paused;
                    remoteRef.current.m = performance.now();
                    applySync();
                    // Tell the server we've synced — unblocks state-changing messages
                    watchParty?.sendSyncAck();
                    break;
                case "sync_response":
                    remoteRef.current.t = msg.position_ms / 1000;
                    remoteRef.current.playing = !msg.is_paused;
                    remoteRef.current.m = performance.now();
                    applySync();
                    // Tell the server we've synced — unblocks state-changing messages
                    watchParty?.sendSyncAck();
                    break;
                case "buffering": {
                    // Another user is buffering: pause our video, show who's buffering
                    const buid = msg.user_id;
                    if (buid) {
                        bufferingUsersRef.current.add(buid);
                        setBufferingUsers(new Set(bufferingUsersRef.current));
                    }
                    if (!video.paused) video.pause();
                    break;
                }
                case "leave": {
                    // Clear this user from buffering set when they disconnect
                    const luid = msg.user_id;
                    if (luid && bufferingUsersRef.current.has(luid)) {
                        bufferingUsersRef.current.delete(luid);
                        setBufferingUsers(new Set(bufferingUsersRef.current));
                    }
                    break;
                }
                case "all_ready":
                    // Legacy: still handle in case server sends it
                    video.currentTime = 0;
                    video.play().catch(() => {});
                    break;
            }
            setTimeout(() => { syncFromPartyRef.current = false; }, 100);
        };

        watchParty.onPlayerEvent.current = handlePartyEvent;
        return () => {
            watchParty.onPlayerEvent.current = null;
        };
    }, [watchParty, isInParty, applySync, navigate]);

    // Watch party: notify room of current media (host only).
    // Only the host should tell the server about media changes to avoid
    // newly joining clients accidentally resetting room state.
    useEffect(() => {
        if (isInParty && watchParty && isHost) {
            watchParty.sendMediaChange(item.ratingKey, item.title, item.duration);
        }
    }, [item.ratingKey]);

    // Watch party: detect connection loss (no heartbeat for 2.5s)
    useEffect(() => {
        if (!isInParty) return;
        const interval = window.setInterval(() => {
            if (performance.now() - remoteRef.current.m > 2500) {
                setSyncStatus("disconnected");
            }
        }, 1000);
        return () => {
            clearInterval(interval);
            const video = videoRef.current;
            if (video) video.playbackRate = 1.0;
        };
    }, [isInParty]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            if (isInParty && watchParty) {
                watchParty.sendPlay(Math.floor(video.currentTime * 1000));
            }
        } else {
            video.pause();
            if (isInParty && watchParty) {
                watchParty.sendPause(Math.floor(video.currentTime * 1000));
            }
        }
    }, [isInParty, watchParty]);

    const handleSeek = useCallback((time: number) => {
        const video = videoRef.current;
        if (!video) return;

        setCurrentTime(time);
        video.currentTime = time;
        reportTimeline(video.paused ? "paused" : "playing");

        if (isInParty && watchParty) {
            watchParty.sendSeek(Math.floor(time * 1000));
        }
    }, [reportTimeline, isInParty, watchParty]);

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
                    handleSeek(Math.max(0, video.currentTime - 10));
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    handleSeek(Math.min(video.duration, video.currentTime + 10));
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
    }, [volume, isPlaying, isFullscreen, handleSeek, togglePlay, toggleFullscreen, handleMuteToggle, handleVolumeChange]);

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        if (!hasPlayedRef.current) hasPlayedRef.current = true;
        setCurrentTime(video.currentTime);
        savedPositionRef.current = video.currentTime;

        // Mark as watched at 90% through (once, skip for guests)
        if (!isGuest && !scrobbledRef.current && video.duration && video.currentTime / video.duration > 0.9) {
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
                onSeeking={() => setIsSeeking(true)}
                onSeeked={() => setIsSeeking(false)}
                onCanPlay={() => {
                    setIsSeeking(false);
                    // Cancel pending buffering send
                    if (bufferingTimerRef.current) {
                        clearTimeout(bufferingTimerRef.current);
                        bufferingTimerRef.current = null;
                    }
                    // If we sent a buffering message, notify recovery.
                    // Skip during initial load (hasPlayedRef false) to avoid sending Play with wrong position.
                    // Also skip if the buffering was caused by a party-initiated sync seek.
                    if (isInParty && watchParty && localBufferingRef.current && hasPlayedRef.current && !syncFromPartyRef.current) {
                        localBufferingRef.current = false;
                        const video = videoRef.current;
                        if (video) {
                            watchParty.sendPlay(Math.floor(video.currentTime * 1000));
                        }
                    } else if (localBufferingRef.current) {
                        localBufferingRef.current = false;
                    }
                }}
                onWaiting={() => {
                    setIsSeeking(true);
                    // Only send buffering after 1s of continuous waiting (avoid spam from seeks).
                    // Skip during initial load (hasPlayedRef false) to avoid pausing others while loading.
                    // Skip if the waiting was caused by a party-initiated sync seek (syncFromPartyRef).
                    if (isInParty && watchParty && !isTransitioningRef.current && !localBufferingRef.current && hasPlayedRef.current && !syncFromPartyRef.current) {
                        if (!bufferingTimerRef.current) {
                            bufferingTimerRef.current = window.setTimeout(() => {
                                watchParty.sendBuffering();
                                localBufferingRef.current = true;
                                bufferingTimerRef.current = null;
                            }, 1000);
                        }
                    }
                }}
                onEnded={() => {
                    if (!isGuest) {
                        plexApi.scrobble(item.ratingKey).catch(() => {});
                        plexApi.updateTimeline({
                            ratingKey: item.ratingKey,
                            key: item.key,
                            state: "stopped",
                            time: Math.floor(duration * 1000),
                            duration: Math.floor(duration * 1000),
                        }).catch(() => {});
                    }
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
                bufferingUsernames={isInParty
                    ? [...bufferingUsers].map(uid =>
                        watchParty?.activeRoom?.participants.find(p => p.user_id === uid)?.username ?? "Someone"
                    )
                    : []
                }
                isSeeking={isSeeking}
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
                bufferingUsers={isInParty ? bufferingUsers : undefined}
                onToggleQueue={(episodes?.length || isInParty) ? () => setShowQueue(q => !q) : undefined}
                onNext={onNext}
                onPrevious={onPrevious}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                syncStatus={isInParty ? syncStatus : undefined}
                displayRate={isInParty ? displayRate : undefined}
            />

            {isInParty && watchParty?.activeRoom && (
                <WatchQueuePanel
                    isOpen={showQueue && !(episodes && episodes.length > 0)}
                    onClose={() => setShowQueue(false)}
                    queue={watchParty.activeRoom.episode_queue}
                    isHost={isHost}
                    onRemoveItem={watchParty.removeFromQueue}
                    onPlayNext={watchParty.nextInQueue}
                />
            )}

            {episodes && episodes.length > 0 && (
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
