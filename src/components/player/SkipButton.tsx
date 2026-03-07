import {useEffect, useRef, useState} from "react";
import {Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {PlexMarker} from "../../lib/types.ts";

interface SkipButtonProps {
    markers: PlexMarker[] | undefined;
    currentTime: number;
    onSkip: (time: number) => void;
}

const AUTO_SKIP_DURATION = 5; // seconds
const AUTO_SKIP_KEY = "playarr-auto-skip-intro";

export default function SkipButton({markers, currentTime, onSkip}: SkipButtonProps) {
    const [autoSkipEnabled, setAutoSkipEnabled] = useState(() => localStorage.getItem(AUTO_SKIP_KEY) === "true");
    const [counting, setCounting] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onSkipRef = useRef(onSkip);
    onSkipRef.current = onSkip;

    const activeMarker = markers?.find(
        (m) => m.type === "intro"
            && currentTime >= m.startTimeOffset / 1000
            && currentTime < m.endTimeOffset / 1000
    );

    const markerEndRef = useRef(0);
    if (activeMarker) {
        markerEndRef.current = activeMarker.endTimeOffset / 1000;
    }

    const markerKey = activeMarker
        ? `${activeMarker.startTimeOffset}-${activeMarker.endTimeOffset}`
        : null;

    const toggleAutoSkip = () => {
        const next = !autoSkipEnabled;
        setAutoSkipEnabled(next);
        localStorage.setItem(AUTO_SKIP_KEY, String(next));
        if (!next) {
            setCounting(false);
        }
    };

    // Start/stop countdown based on marker presence and auto-skip setting
    useEffect(() => {
        if (markerKey && autoSkipEnabled) {
            setCounting(true);
        }
        if (!markerKey) {
            setCounting(false);
        }
    }, [markerKey, autoSkipEnabled]);

    // Fire skip after the duration — the progress bar is pure CSS
    useEffect(() => {
        if (!counting) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        timerRef.current = setTimeout(() => {
            setCounting(false);
            onSkipRef.current(markerEndRef.current);
        }, AUTO_SKIP_DURATION * 1000);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [counting]);

    if (!activeMarker) return null;

    return (
        <div className="absolute bottom-24 right-6 z-20 flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
                <Button
                    isIconOnly
                    size="sm"
                    variant="bordered"
                    className={`border-white/50 backdrop-blur-sm ${
                        autoSkipEnabled
                            ? "bg-primary/30 text-primary border-primary/50"
                            : "bg-black/70 text-white hover:bg-white/20"
                    }`}
                    onPress={toggleAutoSkip}
                >
                    <Icon icon={autoSkipEnabled ? "mdi:timer-off" : "mdi:timer"} width="18"/>
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
            {counting && (
                <div className="w-full max-w-[200px] h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full"
                        style={{
                            width: "100%",
                            transition: `width ${AUTO_SKIP_DURATION}s linear`,
                            animation: `skip-progress ${AUTO_SKIP_DURATION}s linear forwards`,
                        }}
                    />
                </div>
            )}
        </div>
    );
}
