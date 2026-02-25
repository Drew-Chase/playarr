import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {formatTimestamp} from "../../lib/utils.ts";
import {getBifImageAtTime} from "../../lib/bif-parser.ts";
import type {BifData} from "../../lib/types.ts";

interface SeekBarProps
{
    currentTime: number;
    bufferedTime: number;
    duration: number;
    bifData: BifData | null;
    onSeek: (time: number) => void;
    onDragChange?: (isDragging: boolean) => void;
}

const TOOLTIP_WIDTH = 160; // w-40 = 10rem = 160px

export default function SeekBar({currentTime, bufferedTime, duration, bifData, onSeek, onDragChange}: SeekBarProps)
{
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const [hoverPosition, setHoverPosition] = useState<number | null>(null);
    const [hoverTime, setHoverTime] = useState(0);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferedPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;

    const fractionFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
        const container = containerRef.current;
        if (!container || duration <= 0) return 0;
        const rect = container.getBoundingClientRect();
        return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    }, [duration]);

    const handleMouseMove = useCallback((e: React.MouseEvent) =>
    {
        const fraction = fractionFromEvent(e);
        setHoverPosition(fraction * 100);
        setHoverTime(fraction * duration);
    }, [duration, fractionFromEvent]);

    const handleMouseLeave = useCallback(() =>
    {
        if (!isDraggingRef.current) {
            setHoverPosition(null);
        }
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRef.current = true;
        onDragChange?.(true);
        const fraction = fractionFromEvent(e);
        onSeek(fraction * duration);

        const handleDragMove = (ev: MouseEvent) => {
            const container = containerRef.current;
            if (!container || duration <= 0) return;
            const rect = container.getBoundingClientRect();
            const f = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
            setHoverPosition(f * 100);
            setHoverTime(f * duration);
            onSeek(f * duration);
        };

        const handleDragEnd = () => {
            isDraggingRef.current = false;
            onDragChange?.(false);
            window.removeEventListener("mousemove", handleDragMove);
            window.removeEventListener("mouseup", handleDragEnd);
        };

        window.addEventListener("mousemove", handleDragMove);
        window.addEventListener("mouseup", handleDragEnd);
    }, [duration, fractionFromEvent, onSeek, onDragChange]);

    // Clamp tooltip left so it stays within the container bounds
    const tooltipStyle = useMemo(() =>
    {
        if (hoverPosition === null) return {};
        const container = containerRef.current;
        if (!container) return {left: `${hoverPosition}%`, transform: "translateX(-50%)"};

        const containerWidth = container.offsetWidth;
        const halfTooltip = TOOLTIP_WIDTH / 2;
        const pxPosition = (hoverPosition / 100) * containerWidth;

        // Clamp: ensure tooltip doesn't overflow left or right
        const clampedPx = Math.max(halfTooltip, Math.min(containerWidth - halfTooltip, pxPosition));

        return {left: `${clampedPx}px`, transform: "translateX(-50%)"};
    }, [hoverPosition]);

    // Generate thumbnail blob URL on hover
    useEffect(() =>
    {
        if (hoverPosition === null || !bifData)
        {
            setThumbnailUrl(null);
            return;
        }

        const blob = getBifImageAtTime(bifData, hoverTime * 1000);
        if (!blob)
        {
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
            className="relative mb-2 group cursor-pointer select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
        >
            {/* Hover tooltip */}
            {hoverPosition !== null && (
                <div
                    className="absolute bottom-full mb-2 pointer-events-none z-10 flex flex-col items-center"
                    style={tooltipStyle}
                >
                    {thumbnailUrl && (
                        <img
                            src={thumbnailUrl}
                            alt=""
                            className="w-40 min-w-40 h-auto rounded border border-white/20 mb-1 shrink-0"
                        />
                    )}
                    <div className="bg-black/80 text-white text-xs px-2 py-1 rounded text-center whitespace-nowrap">
                        {formatTimestamp(hoverTime * 1000)}
                    </div>
                </div>
            )}

            {/* Track with padding for easier click/hover target */}
            <div className="py-1.5">
                <div className="relative h-1 group-hover:h-3 transition-all rounded-full">
                    {/* Track background */}
                    <div className="absolute inset-0 bg-white/20 rounded-full"/>
                    {/* Buffer bar */}
                    <div
                        className="absolute top-0 left-0 h-full bg-white/40 rounded-full transition-[width] duration-300"
                        style={{width: `${Math.min(bufferedPercent, 100)}%`}}
                    />
                    {/* Progress bar */}
                    <div
                        className="absolute top-0 left-0 h-full bg-primary rounded-full"
                        style={{width: `${Math.min(progressPercent, 100)}%`}}
                    />
                </div>
            </div>
        </div>
    );
}
