import {Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {PlexMarker} from "../../lib/types.ts";

interface SkipButtonProps {
    markers: PlexMarker[] | undefined;
    currentTime: number;
    onSkip: (time: number) => void;
    visible: boolean;
}

export default function SkipButton({markers, currentTime, onSkip, visible}: SkipButtonProps) {
    const activeMarker = markers?.find(
        (m) => m.type === "intro"
            && currentTime >= m.startTimeOffset / 1000
            && currentTime < m.endTimeOffset / 1000
    );

    if (!activeMarker) return null;

    return (
        <div
            className={`absolute bottom-24 right-6 z-20 transition-opacity duration-300 ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        >
            <Button
                variant="bordered"
                className="bg-black/70 text-white border-white/50 hover:bg-white/20 backdrop-blur-sm font-medium"
                endContent={<Icon icon="mdi:skip-next" width="20"/>}
                onPress={() => onSkip(activeMarker.endTimeOffset / 1000)}
            >
                Skip Intro
            </Button>
        </div>
    );
}
