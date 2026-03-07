import {useEffect, useMemo, useRef, useState} from "react";
import {Accordion, AccordionItem, Button, Tab, Tabs} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {motion, AnimatePresence} from "framer-motion";
import type {PlexMediaItem} from "../../lib/types.ts";
import {formatDuration} from "../../lib/utils.ts";
import {usePlayer} from "../../providers/PlayerProvider.tsx";

interface EpisodeQueuePanelProps {
    isOpen: boolean;
    onClose: () => void;
    episodes: PlexMediaItem[];
    currentRatingKey: string;
    onSelectEpisode: (ratingKey: string) => void;
}

export default function EpisodeQueuePanel({
    isOpen,
    onClose,
    episodes,
    currentRatingKey,
    onSelectEpisode,
}: EpisodeQueuePanelProps) {
    const {queue, queueIndex, isQueueActive, removeFromQueue, clearQueue, playFromQueue} = usePlayer();
    const currentRef = useRef<HTMLDivElement>(null);
    const queueCurrentRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<string>(isQueueActive ? "queue" : "episodes");

    // Switch to queue tab when queue becomes active
    useEffect(() => {
        if (isQueueActive) setActiveTab("queue");
    }, [isQueueActive]);

    // Group episodes by season
    const seasons = useMemo(() => {
        const map = new Map<number, PlexMediaItem[]>();
        for (const ep of episodes) {
            const season = ep.parentIndex ?? 0;
            if (!map.has(season)) map.set(season, []);
            map.get(season)!.push(ep);
        }
        return map;
    }, [episodes]);

    // Find the season that contains the currently playing episode
    const activeSeason = useMemo(() => {
        const current = episodes.find(e => e.ratingKey === currentRatingKey);
        return current?.parentIndex ?? seasons.keys().next().value ?? 0;
    }, [episodes, currentRatingKey, seasons]);

    // Scroll to the current episode/queue item after panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                if (activeTab === "queue") {
                    queueCurrentRef.current?.scrollIntoView({block: "center", behavior: "smooth"});
                } else {
                    currentRef.current?.scrollIntoView({block: "center", behavior: "smooth"});
                }
            }, 300);
        }
    }, [isOpen, activeTab]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{x: "100%"}}
                    animate={{x: 0}}
                    exit={{x: "100%"}}
                    transition={{type: "spring", damping: 25, stiffness: 300}}
                    className="fixed top-0 right-0 h-screen w-1/3 min-w-[350px] bg-content1/85 backdrop-blur-md z-50 flex flex-col shadow-2xl"
                >
                    <div className="flex items-center justify-between p-4 border-b border-divider">
                        {isQueueActive ? (
                            <Tabs
                                selectedKey={activeTab}
                                onSelectionChange={(key) => setActiveTab(key as string)}
                                size="sm"
                                variant="underlined"
                                classNames={{tabList: "gap-4", tab: "text-sm font-semibold"}}
                            >
                                <Tab key="episodes" title="Episodes"/>
                                <Tab key="queue" title={`Queue (${queue.length})`}/>
                            </Tabs>
                        ) : (
                            <h3 className="font-semibold">Episodes</h3>
                        )}
                        <Button isIconOnly variant="light" size="sm" onPress={onClose}>
                            <Icon icon="mdi:close" width="20"/>
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {activeTab === "queue" ? (
                            <QueueTabContent
                                queue={queue}
                                queueIndex={queueIndex}
                                currentRef={queueCurrentRef}
                                onPlay={(index) => {
                                    playFromQueue(index);
                                    onSelectEpisode(queue[index].ratingKey);
                                }}
                                onRemove={removeFromQueue}
                                onClear={clearQueue}
                            />
                        ) : (
                            <Accordion
                                selectionMode="single"
                                defaultSelectedKeys={[String(activeSeason)]}
                                className="px-0"
                                itemClasses={{
                                    base: "py-0",
                                    title: "text-sm font-semibold",
                                    trigger: "px-4 py-2 data-[hover=true]:bg-content2/50",
                                    content: "p-0",
                                }}
                            >
                                {[...seasons.entries()].map(([season, eps]) => (
                                    <AccordionItem
                                        key={String(season)}
                                        title={`Season ${season}`}
                                        subtitle={`${eps.length} episode${eps.length !== 1 ? "s" : ""}`}
                                    >
                                        {eps.map((episode) => {
                                            const isCurrent = episode.ratingKey === currentRatingKey;
                                            const thumbUrl = episode.thumb ? `/api/media/${episode.ratingKey}/thumb` : "";

                                            return (
                                                <div
                                                    key={episode.ratingKey}
                                                    ref={isCurrent ? currentRef : undefined}
                                                    className={`flex gap-3 p-3 cursor-pointer hover:bg-content2 transition-colors ${
                                                        isCurrent ? "bg-primary/20 border-l-3 border-primary" : ""
                                                    }`}
                                                    onClick={() => {
                                                        if (!isCurrent) onSelectEpisode(episode.ratingKey);
                                                    }}
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="relative w-28 min-w-[7rem] aspect-video rounded overflow-hidden bg-content3">
                                                        {thumbUrl ? (
                                                            <img
                                                                src={thumbUrl}
                                                                alt={episode.title}
                                                                className="object-cover w-full h-full"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Icon icon="mdi:television" width="24" className="text-default-400"/>
                                                            </div>
                                                        )}
                                                        {isCurrent && (
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                <Icon icon="mdi:play" width="24" className="text-white"/>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0 py-0.5">
                                                        <p className="text-xs text-default-400">
                                                            E{episode.index?.toString().padStart(2, "0")}
                                                            {episode.duration ? ` · ${formatDuration(episode.duration)}` : ""}
                                                        </p>
                                                        <p className={`text-sm truncate ${isCurrent ? "font-semibold text-primary" : ""}`}>
                                                            {episode.title}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function QueueTabContent({
    queue,
    queueIndex,
    currentRef,
    onPlay,
    onRemove,
    onClear,
}: {
    queue: PlexMediaItem[];
    queueIndex: number;
    currentRef: React.Ref<HTMLDivElement>;
    onPlay: (index: number) => void;
    onRemove: (index: number) => void;
    onClear: () => void;
}) {
    return (
        <div className="flex flex-col">
            {/* Clear Queue button */}
            <div className="flex justify-end px-4 py-2 border-b border-divider">
                <Button size="sm" variant="flat" color="danger" onPress={onClear} startContent={<Icon icon="mdi:delete-sweep" width="16"/>}>
                    Clear Queue
                </Button>
            </div>

            {queue.map((item, index) => {
                const isCurrent = index === queueIndex;
                const thumbUrl = item.thumb ? `/api/media/${item.ratingKey}/thumb` : "";
                const isEpisode = item.type === "episode";
                const title = isEpisode && item.grandparentTitle ? item.grandparentTitle : item.title;
                const subtitle = isEpisode
                    ? `S${item.parentIndex?.toString().padStart(2, "0")}E${item.index?.toString().padStart(2, "0")} ${item.title}`
                    : item.year?.toString() || "";

                return (
                    <div
                        key={`${item.ratingKey}-${index}`}
                        ref={isCurrent ? currentRef : undefined}
                        className={`flex gap-3 p-3 cursor-pointer hover:bg-content2 transition-colors ${
                            isCurrent ? "bg-primary/20 border-l-3 border-primary" : ""
                        }`}
                        onClick={() => onPlay(index)}
                    >
                        {/* Thumbnail */}
                        <div className="relative w-28 min-w-[7rem] aspect-video rounded overflow-hidden bg-content3">
                            {thumbUrl ? (
                                <img src={thumbUrl} alt={item.title} className="object-cover w-full h-full" loading="lazy"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Icon icon="mdi:movie" width="24" className="text-default-400"/>
                                </div>
                            )}
                            {isCurrent && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Icon icon="mdi:play" width="24" className="text-white"/>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 py-0.5">
                            <p className={`text-sm truncate ${isCurrent ? "font-semibold text-primary" : ""}`}>
                                {title}
                            </p>
                            {subtitle && <p className="text-xs text-default-400 truncate">{subtitle}</p>}
                        </div>

                        {/* Remove button */}
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="self-center min-w-6 w-6 h-6"
                            onPress={() => {
                                // Stop propagation so clicking remove doesn't also play
                                onRemove(index);
                            }}
                        >
                            <Icon icon="mdi:close" width="16" className="text-default-400"/>
                        </Button>
                    </div>
                );
            })}

            {queue.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-default-400">
                    <Icon icon="mdi:playlist-remove" width="48"/>
                    <p className="mt-2 text-sm">Queue is empty</p>
                </div>
            )}
        </div>
    );
}
