import {useEffect, useMemo, useRef} from "react";
import {Accordion, AccordionItem, Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {motion, AnimatePresence} from "framer-motion";
import type {PlexMediaItem} from "../../lib/types.ts";
import {formatDuration} from "../../lib/utils.ts";

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
    const currentRef = useRef<HTMLDivElement>(null);

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

    // Scroll to the current episode after panel opens and accordion expands
    useEffect(() => {
        if (isOpen && currentRef.current) {
            setTimeout(() => {
                currentRef.current?.scrollIntoView({block: "center", behavior: "smooth"});
            }, 300);
        }
    }, [isOpen]);

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
                        <h3 className="font-semibold">Episodes</h3>
                        <Button isIconOnly variant="light" size="sm" onPress={onClose}>
                            <Icon icon="mdi:close" width="20"/>
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
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
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
