import {Button, Slider} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {formatTimestamp} from "../../lib/utils.ts";
import type {PlexStream, BifData, WatchPartyParticipant} from "../../lib/types.ts";
import SubtitleSelector from "./SubtitleSelector.tsx";
import AudioSelector from "./AudioSelector.tsx";
import QualitySelector from "./QualitySelector.tsx";
import SeekBar from "./SeekBar.tsx";
import ParticipantsPopover from "./ParticipantsPopover.tsx";

interface PlayerControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    visible: boolean;
    subtitleStreams: PlexStream[];
    audioStreams: PlexStream[];
    quality: string;
    bifData: BifData | null;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (vol: number) => void;
    onMuteToggle: () => void;
    onToggleFullscreen: () => void;
    onQualityChange: (q: string) => void;
    isInParty?: boolean;
    participants?: WatchPartyParticipant[];
    hostUserId?: number;
    bufferingUsers?: Set<number>;
    onToggleQueue?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    hasNext?: boolean;
    hasPrevious?: boolean;
    syncStatus?: "in_sync" | "syncing" | "disconnected";
    displayRate?: number;
    onDragChange?: (isDragging: boolean) => void;
}

export default function PlayerControls({
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    visible,
    subtitleStreams,
    audioStreams,
    quality,
    bifData,
    onTogglePlay,
    onSeek,
    onVolumeChange,
    onMuteToggle,
    onToggleFullscreen,
    onQualityChange,
    isInParty,
    participants,
    hostUserId,
    bufferingUsers,
    onToggleQueue,
    onNext,
    onPrevious,
    hasNext,
    hasPrevious,
    syncStatus,
    displayRate,
    onDragChange,
}: PlayerControlsProps) {
    return (
        <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        >
            {/* Seek bar with hover previews */}
            <SeekBar
                currentTime={currentTime}
                duration={duration}
                bifData={bifData}
                onSeek={onSeek}
                onDragChange={onDragChange}
            />

            <div className="flex items-center justify-between">
                {/* Left controls */}
                <div className="flex items-center gap-1">
                    {hasPrevious !== undefined && (
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={onPrevious}
                            isDisabled={!hasPrevious}
                            className="text-white"
                        >
                            <Icon icon="mdi:skip-previous" width="24"/>
                        </Button>
                    )}
                    <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={onTogglePlay}
                        className="text-white"
                    >
                        <Icon icon={isPlaying ? "mdi:pause" : "mdi:play"} width="24"/>
                    </Button>
                    {hasNext !== undefined && (
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={onNext}
                            isDisabled={!hasNext}
                            className="text-white"
                        >
                            <Icon icon="mdi:skip-next" width="24"/>
                        </Button>
                    )}

                    {/* Volume */}
                    <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={onMuteToggle}
                        className="text-white"
                    >
                        <Icon
                            icon={
                                isMuted || volume === 0
                                    ? "mdi:volume-off"
                                    : volume < 0.5
                                        ? "mdi:volume-low"
                                        : "mdi:volume-high"
                            }
                            width="20"
                        />
                    </Button>
                    <Slider
                        size="sm"
                        color="foreground"
                        step={0.01}
                        minValue={0}
                        maxValue={1}
                        value={isMuted ? 0 : volume}
                        onChange={(val) => onVolumeChange(val as number)}
                        className="w-24"
                        classNames={{
                            track: "h-1",
                            thumb: "w-3 h-3 after:w-2.5 after:h-2.5",
                        }}
                        aria-label="Volume"
                    />

                    <span className="text-white text-xs ml-2">
                        {formatTimestamp(currentTime * 1000)} / {formatTimestamp(duration * 1000)}
                    </span>
                    {isInParty && syncStatus && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                syncStatus === "in_sync" ? "bg-green-500/20 text-green-400" :
                                syncStatus === "syncing" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-red-500/20 text-red-400"
                            }`}>
                                {syncStatus === "in_sync" ? "In sync" :
                                 syncStatus === "syncing" ? "Syncing..." :
                                 "Connecting..."}
                            </span>
                            {displayRate !== undefined && displayRate !== 1 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                    {displayRate.toFixed(2)}x
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1">
                    {subtitleStreams.length > 0 && (
                        <SubtitleSelector streams={subtitleStreams}/>
                    )}
                    {audioStreams.length > 1 && (
                        <AudioSelector streams={audioStreams}/>
                    )}
                    <QualitySelector quality={quality} onQualityChange={onQualityChange}/>
                    {isInParty && participants && hostUserId !== undefined && (
                        <ParticipantsPopover participants={participants} hostUserId={hostUserId} bufferingUsers={bufferingUsers}/>
                    )}
                    {onToggleQueue && (
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={onToggleQueue}
                            className="text-white"
                        >
                            <Icon icon="mdi:playlist-play" width="20"/>
                        </Button>
                    )}
                    <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={onToggleFullscreen}
                        className="text-white"
                    >
                        <Icon icon={isFullscreen ? "mdi:fullscreen-exit" : "mdi:fullscreen"} width="20"/>
                    </Button>
                </div>
            </div>
        </div>
    );
}
