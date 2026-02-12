import {Button, Slider} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {formatTimestamp} from "../../lib/utils.ts";
import type {PlexStream} from "../../lib/types.ts";
import SubtitleSelector from "./SubtitleSelector.tsx";
import AudioSelector from "./AudioSelector.tsx";
import QualitySelector from "./QualitySelector.tsx";

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
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (vol: number) => void;
    onMuteToggle: () => void;
    onToggleFullscreen: () => void;
    onQualityChange: (q: string) => void;
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
    onTogglePlay,
    onSeek,
    onVolumeChange,
    onMuteToggle,
    onToggleFullscreen,
    onQualityChange,
}: PlayerControlsProps) {
    return (
        <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        >
            {/* Seek bar */}
            <Slider
                size="sm"
                step={0.1}
                minValue={0}
                maxValue={duration || 1}
                value={currentTime}
                onChange={(val) => onSeek(val as number)}
                className="mb-2"
                classNames={{
                    track: "h-1 hover:h-2 transition-all",
                    filler: "bg-primary",
                    thumb: "w-3 h-3 bg-primary",
                }}
                aria-label="Seek"
            />

            <div className="flex items-center justify-between">
                {/* Left controls */}
                <div className="flex items-center gap-1">
                    <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={onTogglePlay}
                        className="text-white"
                    >
                        <Icon icon={isPlaying ? "mdi:pause" : "mdi:play"} width="24"/>
                    </Button>

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
                        step={0.01}
                        minValue={0}
                        maxValue={1}
                        value={isMuted ? 0 : volume}
                        onChange={(val) => onVolumeChange(val as number)}
                        className="w-24"
                        classNames={{
                            track: "h-1",
                            filler: "bg-white",
                            thumb: "w-2 h-2 bg-white",
                        }}
                        aria-label="Volume"
                    />

                    <span className="text-white text-xs ml-2">
                        {formatTimestamp(currentTime * 1000)} / {formatTimestamp(duration * 1000)}
                    </span>
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
