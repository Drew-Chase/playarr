import {Button, Chip, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {Link} from "react-router-dom";
import type {PlexMediaItem} from "../../lib/types.ts";

interface PlayerOverlayProps {
    item: PlexMediaItem;
    visible: boolean;
    onBack: () => void;
    isInParty?: boolean;
    participantCount?: number;
    bufferingUsernames?: string[];
    isSeeking?: boolean;
}

export default function PlayerOverlay({item, visible, onBack, isInParty, participantCount, bufferingUsernames, isSeeking}: PlayerOverlayProps) {
    return (
        <>
            <div
                className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 z-10 ${
                    visible ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            >
                <div className="flex items-center justify-between">
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
                        {item.type === "episode" ? (
                            <div className="flex items-center gap-1.5 text-sm">
                                {item.grandparentTitle && (
                                    <Link to={`/detail/${item.grandparentRatingKey}`} className="text-white font-semibold hover:text-primary transition-colors">
                                        {item.grandparentTitle}
                                    </Link>
                                )}
                                {item.parentIndex != null && (
                                    <>
                                        <span className="text-white/40">·</span>
                                        <Link to={`/detail/${item.parentRatingKey}`} className="text-white/70 hover:text-primary transition-colors">
                                            S{item.parentIndex.toString().padStart(2, "0")}
                                        </Link>
                                    </>
                                )}
                                {item.index != null && (
                                    <>
                                        <span className="text-white/40">·</span>
                                        <Link to={`/detail/${item.ratingKey}`} className="text-white/70 hover:text-primary transition-colors">
                                            E{item.index.toString().padStart(2, "0")} — {item.title}
                                        </Link>
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="text-white font-semibold text-sm">{item.title}</p>
                        )}
                    </div>
                    {isInParty && (
                        <Chip
                            variant="flat"
                            color="primary"
                            size="sm"
                            startContent={<Icon icon="mdi:account-group" width="14"/>}
                        >
                            Watch Party ({participantCount ?? 0})
                        </Chip>
                    )}
                </div>
            </div>
            {bufferingUsernames && bufferingUsernames.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
                    <Spinner size="lg" color="white"/>
                    <span className="text-white mt-4 text-sm">
                        {bufferingUsernames.join(", ")} {bufferingUsernames.length === 1 ? "is" : "are"} buffering...
                    </span>
                </div>
            )}
            {isSeeking && !(bufferingUsernames && bufferingUsernames.length > 0) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
                    <Spinner size="lg" color="white"/>
                </div>
            )}
        </>
    );
}
