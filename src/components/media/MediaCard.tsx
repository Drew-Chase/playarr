import React, {memo, useEffect, useRef, useState} from "react";
import {Progress, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Button} from "@heroui/react";
import {useNavigate, useLocation} from "react-router-dom";
import {motion} from "framer-motion";
import {Icon} from "@iconify-icon/react";
import {toast} from "sonner";
import type {PlexMediaItem} from "../../lib/types.ts";
import {plexImage, shuffleArray} from "../../lib/utils.ts";
import {plexApi} from "../../lib/plex.ts";
import {usePlayer} from "../../providers/PlayerProvider.tsx";
import ResumePlaybackModal from "./ResumePlaybackModal.tsx";

interface MediaCardProps
{
    item: PlexMediaItem;
    showProgress?: boolean;
    variant?: "portrait" | "landscape";
    width?: number;
    lazy?: boolean;
}

/** Resolve an item to playable queue items. Shows/seasons fetch all child episodes. */
async function resolveQueueItems(item: PlexMediaItem): Promise<PlexMediaItem[]> {
    if (item.type === "movie" || item.type === "episode") {
        return [item];
    }
    if (item.type === "show") {
        try {
            return await plexApi.getAllEpisodes(item.ratingKey);
        } catch {
            toast.error("Failed to fetch episodes");
            return [];
        }
    }
    if (item.type === "season") {
        try {
            return await plexApi.getChildren(item.ratingKey);
        } catch {
            toast.error("Failed to fetch episodes");
            return [];
        }
    }
    return [item];
}

const MediaCardInner = memo(function MediaCardInner({item, showProgress, width, variant = "portrait"}: Omit<MediaCardProps, "lazy">)
{
    const navigate = useNavigate();
    const location = useLocation();
    const [showResumeModal, setShowResumeModal] = useState(false);
    const {addToQueue, playNext, clearQueue} = usePlayer();
    const isOnPlayerPage = location.pathname.startsWith("/player/");

    const handleClick = () =>
    {
        navigate(`/detail/${item.ratingKey}`);
    };

    const handlePlay = (e: React.MouseEvent) =>
    {
        e.stopPropagation();
        if (item.viewOffset && item.duration)
        {
            setShowResumeModal(true);
        }
        else
        {
            navigate(`/player/${item.ratingKey}?from=${encodeURIComponent(location.pathname)}`);
        }
    };

    const navigateToPlayerIfNeeded = (ratingKey: string) => {
        if (!isOnPlayerPage) {
            navigate(`/player/${ratingKey}?from=${encodeURIComponent(location.pathname)}`);
        }
    };

    const handleAddToQueue = async () => {
        const items = await resolveQueueItems(item);
        addToQueue(items);
        toast.success(`Added ${items.length > 1 ? `${items.length} episodes` : item.title} to queue`);
        navigateToPlayerIfNeeded(items[0].ratingKey);
    };

    const handlePlayNext = async () => {
        const items = await resolveQueueItems(item);
        playNext(items);
        toast.success(`Playing ${items.length > 1 ? `${items.length} episodes` : item.title} next`);
        navigateToPlayerIfNeeded(items[0].ratingKey);
    };

    const handleShuffleAndPlay = async () => {
        const items = await resolveQueueItems(item);
        if (items.length === 0) return;
        const shuffled = items.length > 1 ? shuffleArray(items) : items;
        clearQueue();
        addToQueue(shuffled);
        toast.success(items.length > 1 ? `Shuffled ${items.length} episodes into queue` : `Added ${item.title} to queue`);
        navigate(`/player/${shuffled[0].ratingKey}?from=${encodeURIComponent(location.pathname)}`);
    };

    const isMultiItem = item.type === "show" || item.type === "season";

    const resumeModal = (
        <ResumePlaybackModal
            isOpen={showResumeModal}
            onClose={() => setShowResumeModal(false)}
            ratingKey={item.ratingKey}
            viewOffset={item.viewOffset!}
            duration={item.duration!}
        />
    );

    const progress = item.viewOffset && item.duration
        ? (item.viewOffset / item.duration) * 100
        : 0;

    const title = item.type === "episode" && item.grandparentTitle
        ? item.grandparentTitle
        : item.title;

    const subtitle = item.type === "episode"
        ? `S${item.parentIndex?.toString().padStart(2, "0")}E${item.index?.toString().padStart(2, "0")} ${item.title}`
        : item.year?.toString() || "";

    const queueMenu = (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
            <Dropdown>
                <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="flat" className="bg-black/60 min-w-6 w-6 h-6">
                        <Icon icon="mdi:dots-vertical" width="14" className="text-white"/>
                    </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Media actions" onAction={(key) => {
                    if (key === "play") handlePlay({stopPropagation: () => {}} as React.MouseEvent);
                    if (key === "play-next") handlePlayNext();
                    if (key === "add-to-queue") handleAddToQueue();
                    if (key === "shuffle-and-play") handleShuffleAndPlay();
                }}>
                    <DropdownSection title="Playback">
                        <DropdownItem key="play" startContent={<Icon icon="mdi:play" width="16"/>}>
                            Play
                        </DropdownItem>
                    </DropdownSection>
                    <DropdownSection title="Queue">
                        <DropdownItem key="play-next" startContent={<Icon icon="mdi:playlist-play" width="16"/>}>
                            Play Next
                        </DropdownItem>
                        <DropdownItem key="add-to-queue" startContent={<Icon icon="mdi:playlist-plus" width="16"/>}>
                            Add to Queue
                        </DropdownItem>
                        {isMultiItem ? (
                            <DropdownItem key="shuffle-and-play" startContent={<Icon icon="mdi:shuffle-variant" width="16"/>}>
                                Shuffle & Play
                            </DropdownItem>
                        ) : null}
                    </DropdownSection>
                </DropdownMenu>
            </Dropdown>
        </div>
    );

    if (variant === "landscape")
    {
        const artUrl = item.type === "episode"
            ? (plexImage(item.thumb, 560, 316) || plexImage(item.art, 560, 316))
            : (plexImage(item.art, 560, 316) || plexImage(item.thumb, 560, 316));

        return (
            <>
                <motion.div
                    whileHover={{scale: 1.05}}
                    transition={{type: "tween", duration: 0.2}}
                    className="shrink-0 cursor-pointer group scroll-snap-start"
                    onClick={handleClick}
                >
                    <div className="relative aspect-[3/1.5] rounded-lg overflow-hidden bg-content2" style={{width: width ? `${width}px` : "100%"}}>
                        <img
                            alt={item.title}
                            className="object-cover w-full h-full"
                            src={artUrl}
                            loading="lazy"
                        />
                        {queueMenu}
                        {/* Hover play overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={handlePlay}>
                                <Icon icon="mdi:play-circle" width="48" className="text-white"/>
                            </button>
                        </div>
                        {/* Bottom gradient for title */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <p className="text-sm font-semibold text-white truncate">{title}</p>
                            {subtitle && <p className="text-xs text-white/70 truncate">{subtitle}</p>}
                        </div>
                        {/* Progress bar */}
                        {showProgress && progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0">
                                <Progress
                                    size="sm"
                                    value={progress}
                                    className="rounded-none"
                                    classNames={{
                                        indicator: "bg-primary",
                                        track: "bg-black/50 rounded-none"
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </motion.div>
                {resumeModal}
            </>
        );
    }

    // Portrait variant (default)
    const thumbUrl = item.thumb ? `/api/media/${item.ratingKey}/thumb` : "";

    return (
        <>
            <motion.div
                whileHover={{scale: 1.05}}
                transition={{type: "tween", duration: 0.2}}
                className="cursor-pointer group"
                onClick={handleClick}
            >
                <div className="relative rounded-lg overflow-hidden bg-content2 aspect-[2/3]" style={{width: width ?? "unset"}}>
                    <img
                        alt={item.title}
                        className="object-cover w-full h-full"
                        src={thumbUrl}
                        loading="lazy"
                    />
                    {/* Watched indicator */}
                    {item.viewCount != null && item.viewCount > 0 && !progress && (
                        <div className="absolute top-1.5 right-1.5 z-10">
                            <Icon icon="mdi:check-circle" width="20" className="text-primary drop-shadow-md"/>
                        </div>
                    )}
                    {queueMenu}
                    {/* Hover play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={handlePlay}>
                            <Icon icon="mdi:play-circle" width="48" className="text-white"/>
                        </button>
                    </div>
                    {/* Hover ring glow */}
                    <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-primary/50 transition-all"/>
                    {/* Progress bar */}
                    {showProgress && progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0">
                            <Progress
                                size="sm"
                                value={progress}
                                className="rounded-none"
                                classNames={{
                                    indicator: "bg-primary",
                                    track: "bg-black/50 rounded-none"
                                }}
                            />
                        </div>
                    )}
                </div>
                <div className="mt-2 px-1" style={{maxWidth: width ?? "unset"}}>
                    <p className="text-sm font-semibold truncate">{title}</p>
                    <p className="text-xs text-default-400 truncate">{subtitle}</p>
                </div>
            </motion.div>
            {resumeModal}
        </>
    );
});

export default function MediaCard({lazy, ...props}: MediaCardProps)
{
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(!lazy);

    useEffect(() => {
        if (!lazy) return;
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            {rootMargin: "400px"},
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [lazy]);

    if (!lazy) {
        return <MediaCardInner {...props} />;
    }

    const {variant = "portrait", width} = props;
    const w = width ?? "100%";

    return (
        <div
            ref={containerRef}
            style={{
                width: typeof w === "number" ? `${w}px` : w,
                aspectRatio: variant === "landscape" ? "3/1.5" : "2/3",
            }}
        >
            {isVisible ? <MediaCardInner {...props} /> : (
                <div
                    className="rounded-lg bg-content2 w-full h-full"
                />
            )}
        </div>
    );
}
