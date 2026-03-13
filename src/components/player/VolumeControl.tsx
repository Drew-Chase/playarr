import {useCallback, useEffect, useRef, useState} from "react";
import {Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";

interface VolumeControlProps
{
    volume: number; // 0 to 6 (0% to 600%)
    isMuted: boolean;
    onVolumeChange: (vol: number) => void;
    onMuteToggle: () => void;
    onDragChange?: (isDragging: boolean) => void;
}

// Layout: two physically separated bars with a gap
const NORMAL_H = 80;  // px – 0–100%
const BOOST_H = 120;  // px – 100–600%
const GAP = 10;        // px – visible gap between bars
const TOTAL_H = NORMAL_H + GAP + BOOST_H;
const TRACK_W = 10;   // px – bar width

// Convert volume (0-6) → pixel offset from bottom of the full layout
function volumeToPixel(vol: number): number
{
    if (vol <= 1) return vol * NORMAL_H;
    return NORMAL_H + GAP + ((vol - 1) / 5) * BOOST_H;
}

// Convert pixel offset from bottom → volume (0-6)
function pixelToVolume(px: number): number
{
    if (px <= NORMAL_H) return Math.max(0, px / NORMAL_H);
    if (px <= NORMAL_H + GAP) return 1; // in the gap → snap to 100%
    return 1 + ((px - NORMAL_H - GAP) / BOOST_H) * 5;
}

const SNAP_POINTS = [0, 0.25, 0.5, 0.75, 1, 2, 3, 4, 5, 6];

function snapVolume(vol: number): number
{
    for (const sp of SNAP_POINTS)
    {
        const threshold = sp <= 1 ? 0.06 : 0.2;
        if (Math.abs(vol - sp) <= threshold) return sp;
    }
    return Math.round(vol * 100) / 100;
}

export default function VolumeControl({volume, isMuted, onVolumeChange, onMuteToggle, onDragChange}: VolumeControlProps)
{
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const hitAreaRef = useRef<HTMLDivElement>(null);

    const displayVolume = isMuted ? 0 : volume;

    // Fill percentages within each bar
    const normalFillPct = Math.min(displayVolume, 1) * 100;          // 0–100% of normal bar
    const boostFillPct = displayVolume > 1 ? ((displayVolume - 1) / 5) * 100 : 0; // 0–100% of boost bar

    // Hide popover instantly when window loses focus
    useEffect(() =>
    {
        const handleBlur = () => setIsHovered(false);
        window.addEventListener("blur", handleBlur);
        return () => window.removeEventListener("blur", handleBlur);
    }, []);

    const handleMouseEnter = useCallback(() =>
    {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() =>
    {
        if (!isDragging)
        {
            setIsHovered(false);
        }
    }, [isDragging]);

    const getVolumeFromY = useCallback((clientY: number): number =>
    {
        const el = hitAreaRef.current;
        if (!el) return volume;
        const rect = el.getBoundingClientRect();
        const pxFromBottom = rect.bottom - clientY;
        const clamped = Math.max(0, Math.min(TOTAL_H, pxFromBottom));
        return snapVolume(pixelToVolume(clamped));
    }, [volume]);

    const handleMouseDown = useCallback((e: React.MouseEvent) =>
    {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        onDragChange?.(true);
        onVolumeChange(getVolumeFromY(e.clientY));

        const handleMove = (ev: MouseEvent) =>
        {
            onVolumeChange(getVolumeFromY(ev.clientY));
        };
        const handleUp = (ev: MouseEvent) =>
        {
            setIsDragging(false);
            onDragChange?.(false);
            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("mouseup", handleUp);
            // If mouse released outside the component, hide popover
            const container = hitAreaRef.current?.closest("[data-volume-root]");
            if (container && !container.contains(ev.target as Node))
            {
                setIsHovered(false);
            }
        };
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
    }, [getVolumeFromY, onVolumeChange, onDragChange]);

    const handleWheel = useCallback((e: React.WheelEvent) =>
    {
        e.stopPropagation();
        const step = volume >= 1 ? 0.25 : 0.05;
        const delta = e.deltaY > 0 ? -step : step;
        onVolumeChange(snapVolume(Math.max(0, Math.min(6, volume + delta))));
    }, [volume, onVolumeChange]);

    // Thumb position: pixel offset from bottom of full layout
    const thumbPx = volumeToPixel(displayVolume);
    const inBoost = displayVolume > 1;

    return (
        <div
            data-volume-root
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
        >
            <Button isIconOnly variant="light" size="sm" onPress={onMuteToggle} className="text-white">
                <Icon
                    icon={
                        isMuted || volume === 0
                            ? "mdi:volume-off"
                            : volume <= 0.5
                                ? "mdi:volume-low"
                                : volume <= 1
                                    ? "mdi:volume-high"
                                    : "mdi:volume-vibrate"
                    }
                    width="20"
                />
            </Button>

            {/* Popover */}
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-all duration-200 z-50 ${
                isHovered || isDragging ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95"
            }`}>
                <div className="bg-black/90 backdrop-blur-md rounded-2xl px-3 pb-3 flex flex-col items-center border border-white/10 shadow-2xl">
                    {/* Current volume readout */}
                    <div className={`w-full text-center text-[11px] font-bold tabular-nums py-2 border-b border-white/10 mb-3 ${inBoost ? "text-red-400" : "text-white"}`}>
                        {Math.round(displayVolume * 100)}%
                    </div>

                    {/* Interactive track area */}
                    <div
                        ref={hitAreaRef}
                        className="relative cursor-pointer select-none"
                        style={{height: TOTAL_H, width: TRACK_W + 8}}
                        onMouseDown={handleMouseDown}
                    >
                        {/* ─── BOOST BAR (top) ─── */}
                        <div
                            className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden"
                            style={{top: 0, height: BOOST_H, width: TRACK_W}}
                        >
                            <div className="absolute inset-0 bg-red-500/10"/>
                            <div
                                className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-red-600 to-red-400 transition-[height] duration-75"
                                style={{height: `${boostFillPct}%`}}
                            />
                        </div>

                        {/* ─── NORMAL BAR (bottom) ─── */}
                        <div
                            className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden"
                            style={{bottom: 0, height: NORMAL_H, width: TRACK_W}}
                        >
                            <div className="absolute inset-0 bg-white/10"/>
                            <div
                                className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-green-600 to-green-400 transition-[height] duration-75"
                                style={{height: `${normalFillPct}%`}}
                            />
                        </div>

                        {/* ─── THUMB ─── */}
                        <div
                            className={`absolute left-1/2 -translate-x-1/2 rounded-full shadow-lg pointer-events-none transition-[bottom] duration-75 border-2 ${
                                inBoost
                                    ? "bg-red-500 border-red-300 shadow-red-500/40"
                                    : "bg-green-400 border-green-200 shadow-green-400/40"
                            }`}
                            style={{
                                bottom: `calc(${(thumbPx / TOTAL_H) * 100}% - 7px)`,
                                width: TRACK_W + 6,
                                height: TRACK_W + 6,
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
