import {Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {PlexMediaItem} from "../../lib/types.ts";
import {getDisplayTitle} from "../../lib/utils.ts";

interface PlayerOverlayProps {
    item: PlexMediaItem;
    visible: boolean;
    onBack: () => void;
}

export default function PlayerOverlay({item, visible, onBack}: PlayerOverlayProps) {
    return (
        <div
            className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        >
            <div className="flex items-center gap-3">
                <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={onBack}
                    className="text-white"
                >
                    <Icon icon="mdi:arrow-left" width="24"/>
                </Button>
                <div>
                    <p className="text-white font-semibold text-sm">
                        {getDisplayTitle(item)}
                    </p>
                    {item.type === "episode" && (
                        <p className="text-white/60 text-xs">{item.title}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
