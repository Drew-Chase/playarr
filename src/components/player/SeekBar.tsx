import {useCallback, useEffect, useRef, useState} from "react";
import {Slider} from "@heroui/react";
import {formatTimestamp} from "../../lib/utils.ts";
import {getBifImageAtTime} from "../../lib/bif-parser.ts";
import type {BifData} from "../../lib/types.ts";

interface SeekBarProps {
    currentTime: number;
    duration: number;
    bifData: BifData | null;
    onSeek: (time: number) => void;
}

export default function SeekBar({currentTime, duration, bifData, onSeek}: SeekBarProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoverPosition, setHoverPosition] = useState<number | null>(null);
    const [hoverTime, setHoverTime] = useState(0);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const container = containerRef.current;
        if (!container || duration <= 0) return;
        const rect = container.getBoundingClientRect();
        const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverPosition(fraction * 100);
        setHoverTime(fraction * duration);
    }, [duration]);

    const handleMouseLeave = useCallback(() => {
        setHoverPosition(null);
    }, []);

    // Generate thumbnail blob URL on hover
    useEffect(() => {
        if (hoverPosition === null || !bifData) {
            setThumbnailUrl(null);
            return;
        }

        const blob = getBifImageAtTime(bifData, hoverTime * 1000);
        if (!blob) {
            setThumbnailUrl(null);
            return;
        }

        const url = URL.createObjectURL(blob);
        setThumbnailUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [hoverTime, bifData, hoverPosition]);

    return (
        <div
            ref={containerRef}
            className="relative mb-2 group"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Hover tooltip */}
            {hoverPosition !== null && (
                <div
                    className="absolute bottom-full mb-2 -translate-x-1/2 pointer-events-none z-10 flex flex-col items-center"
                    style={{left: `${hoverPosition}%`}}
                >
                    {thumbnailUrl && (
                        <img
                            src={thumbnailUrl}
                            alt=""
                            className="w-40 h-auto rounded border border-white/20 mb-1"
                        />
                    )}
                    <div className="bg-black/80 text-white text-xs px-2 py-1 rounded text-center whitespace-nowrap">
                        {formatTimestamp(hoverTime * 1000)}
                    </div>
                </div>
            )}

            <Slider
                size="sm"
                color="primary"
                step={0.1}
                minValue={0}
                maxValue={duration || 1}
                value={currentTime}
                onChange={(val) => onSeek(val as number)}
                classNames={{
                    track: "h-1 group-hover:h-2 transition-all",
                    thumb: "w-3 h-3 after:w-2.5 after:h-2.5 opacity-0 group-hover:opacity-100 transition-opacity",
                }}
                aria-label="Seek"
            />
        </div>
    );
}
