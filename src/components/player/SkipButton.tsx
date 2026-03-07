import {useEffect, useRef, useState} from "react";
import {Button, Progress} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {PlexMarker} from "../../lib/types.ts";

interface SkipButtonProps {
    markers: PlexMarker[] | undefined;
    currentTime: number;
    onSkip: (time: number) => void;
}

const AUTO_SKIP_DURATION = 3; // seconds

export default function SkipButton({markers, currentTime, onSkip}: SkipButtonProps) {
    const [autoSkip, setAutoSkip] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const animRef = useRef<number | null>(null);
    const startRef = useRef(0);

    const activeMarker = markers?.find(
        (m) => m.type === "intro"
            && currentTime >= m.startTimeOffset / 1000
            && currentTime < m.endTimeOffset / 1000
    );

    // Reset auto-skip state when marker disappears
    useEffect(() => {
        if (!activeMarker) {
            setAutoSkip(false);
            setCountdown(0);
            if (animRef.current != null) {
                cancelAnimationFrame(animRef.current);
                animRef.current = null;
            }
        }
    }, [activeMarker]);

    // Run countdown when auto-skip is active
    useEffect(() => {
        if (!autoSkip || !activeMarker) return;

        startRef.current = performance.now();

        const tick = (now: number) => {
            const elapsed = (now - startRef.current) / 1000;
            if (elapsed >= AUTO_SKIP_DURATION) {
                setAutoSkip(false);
                setCountdown(0);
                onSkip(activeMarker.endTimeOffset / 1000);
                return;
            }
            setCountdown(elapsed);
            animRef.current = requestAnimationFrame(tick);
        };

        animRef.current = requestAnimationFrame(tick);

        return () => {
            if (animRef.current != null) {
                cancelAnimationFrame(animRef.current);
                animRef.current = null;
            }
        };
    }, [autoSkip, activeMarker, onSkip]);

    if (!activeMarker) return null;

    const progress = autoSkip ? (countdown / AUTO_SKIP_DURATION) * 100 : 0;

    return (
        <div className="absolute bottom-24 right-6 z-20 flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
                <Button
                    isIconOnly
                    size="sm"
                    variant="bordered"
                    className={`border-white/50 backdrop-blur-sm ${
                        autoSkip
                            ? "bg-primary/30 text-primary border-primary/50"
                            : "bg-black/70 text-white hover:bg-white/20"
                    }`}
                    onPress={() => setAutoSkip(!autoSkip)}
                >
                    <Icon icon={autoSkip ? "mdi:timer-off" : "mdi:timer"} width="18"/>
                </Button>
                <Button
                    variant="bordered"
                    className="bg-black/70 text-white border-white/50 hover:bg-white/20 backdrop-blur-sm font-medium"
                    endContent={<Icon icon="mdi:skip-next" width="20"/>}
                    onPress={() => onSkip(activeMarker.endTimeOffset / 1000)}
                >
                    Skip Intro
                </Button>
            </div>
            {autoSkip && (
                <Progress
                    size="sm"
                    value={progress}
                    className="w-full max-w-[200px]"
                    classNames={{
                        indicator: "bg-primary",
                        track: "bg-white/20"
                    }}
                    aria-label="Auto-skip countdown"
                />
            )}
        </div>
    );
}
