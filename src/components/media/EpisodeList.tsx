import {useState} from "react";
import {Progress, CircularProgress, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useNavigate, useLocation} from "react-router-dom";
import {motion} from "framer-motion";
import {useChildren} from "../../hooks/usePlex.ts";
import {useSonarrQueue, useSonarrEpisodes} from "../../hooks/useDiscover.ts";
import {api} from "../../lib/api.ts";
import {toast} from "sonner";
import type {PlexMediaItem, QueueItem, SonarrEpisode} from "../../lib/types.ts";
import {formatDuration} from "../../lib/utils.ts";
import {plexApi} from "../../lib/plex.ts";
import ResumePlaybackModal from "./ResumePlaybackModal.tsx";
import ManualSearchModal from "../discover/ManualSearchModal.tsx";

interface EpisodeListProps {
    seasonId: string;
    sonarrSeriesId?: number;
}

function EpisodeCard({episode, index, downloadItem, sonarrEpisode}: { episode: PlexMediaItem; index: number; downloadItem?: QueueItem; sonarrEpisode?: SonarrEpisode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [manualSearchOpen, setManualSearchOpen] = useState(false);
    const [watchedOverride, setWatchedOverride] = useState<boolean | null>(null);

    const progress = episode.viewOffset && episode.duration
        ? (episode.viewOffset / episode.duration) * 100
        : 0;
    const isWatched = watchedOverride !== null ? watchedOverride : !!episode.viewCount;
    const isInProgress = progress > 0 && !isWatched;
    const thumbUrl = episode.thumb ? `/api/media/${episode.ratingKey}/thumb` : "";

    // Download progress
    const downloadProgress = downloadItem
        ? ((downloadItem.size - downloadItem.sizeleft) / downloadItem.size) * 100
        : 0;
    const isDownloading = !!downloadItem && downloadItem.sizeleft > 0;

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (episode.viewOffset && episode.duration) {
            setShowResumeModal(true);
        } else {
            navigate(`/player/${episode.ratingKey}?from=${encodeURIComponent(location.pathname)}`);
        }
    };

    const handleAutoSearch = async () => {
        if (!sonarrEpisode) return;
        try {
            await api.post("/sonarr/command", {
                name: "EpisodeSearch",
                episodeIds: [sonarrEpisode.id],
            });
            toast.success(`Searching for E${episode.index?.toString().padStart(2, "0")}`);
        } catch {
            toast.error("Failed to trigger search");
        }
    };

    const handleMarkWatched = () => {
        setWatchedOverride(true);
        plexApi.scrobble(episode.ratingKey);
    };

    const handleMarkUnwatched = () => {
        setWatchedOverride(false);
        plexApi.unscrobble(episode.ratingKey);
    };

    return (
        <>
            <motion.div
                key={episode.ratingKey}
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: index * 0.05, duration: 0.3}}
                className="cursor-pointer group"
                onClick={() => navigate(`/detail/${episode.ratingKey}`)}
            >
                <div className={`relative rounded-lg overflow-hidden bg-content2 ${isWatched ? "opacity-60" : ""}`}>
                    {/* 16:9 thumbnail */}
                    <div className="relative aspect-video">
                        {thumbUrl ? (
                            <img
                                src={thumbUrl}
                                alt={episode.title}
                                className="object-cover w-full h-full"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full bg-content3 flex items-center justify-center">
                                <Icon icon="mdi:television" width="32" className="text-default-400"/>
                            </div>
                        )}

                        {/* Episode number badge */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                            E{episode.index?.toString().padStart(2, "0")}
                            {isWatched && (
                                <Icon icon="mdi:check-circle" width="14" className="text-success"/>
                            )}
                        </div>

                        {/* Download progress radial (top-right) */}
                        {isDownloading && (
                            <div className="absolute top-1.5 right-1.5">
                                <CircularProgress
                                    size="md"
                                    value={downloadProgress}
                                    color="success"
                                    showValueLabel
                                    classNames={{
                                        svg: "w-10 h-10",
                                        value: "text-[9px] font-bold text-white",
                                        track: "stroke-black/40",
                                    }}
                                    aria-label="Download progress"
                                />
                            </div>
                        )}

                        {/* Unwatched indicator (only if not downloading) */}
                        {!isWatched && !isInProgress && !isDownloading && (
                            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary shadow-md"/>
                        )}

                        {/* 3-dot dropdown (top-right, visible on hover) */}
                        {!isDownloading && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                                <Dropdown>
                                    <DropdownTrigger>
                                        <Button isIconOnly size="sm" variant="flat" className="bg-black/60 min-w-6 w-6 h-6">
                                            <Icon icon="mdi:dots-vertical" width="14" className="text-white"/>
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu aria-label="Episode actions" onAction={(key) => {
                                        if (key === "auto-search") handleAutoSearch();
                                        if (key === "manual-search") setManualSearchOpen(true);
                                        if (key === "mark-watched") handleMarkWatched();
                                        if (key === "mark-unwatched") handleMarkUnwatched();
                                    }}>
                                        {sonarrEpisode ? (
                                            <DropdownSection title="Sonarr" showDivider>
                                                <DropdownItem key="auto-search" startContent={<Icon icon="mdi:magnify" width="16"/>}>
                                                    Auto Search
                                                </DropdownItem>
                                                <DropdownItem key="manual-search" startContent={<Icon icon="mdi:text-search" width="16"/>}>
                                                    Manual Search
                                                </DropdownItem>
                                            </DropdownSection>
                                        ) : null}
                                        <DropdownSection title="Plex">
                                            {isWatched ? (
                                                <DropdownItem key="mark-unwatched" startContent={<Icon icon="mdi:eye-off" width="16"/>}>
                                                    Mark Unwatched
                                                </DropdownItem>
                                            ) : (
                                                <DropdownItem key="mark-watched" startContent={<Icon icon="mdi:eye" width="16"/>}>
                                                    Mark Watched
                                                </DropdownItem>
                                            )}
                                        </DropdownSection>
                                    </DropdownMenu>
                                </Dropdown>
                            </div>
                        )}

                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={handlePlay}>
                                <Icon icon="mdi:play-circle" width="40" className="text-white"/>
                            </button>
                        </div>

                        {/* Duration */}
                        {episode.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                {formatDuration(episode.duration)}
                            </div>
                        )}

                        {/* Download progress bar (bottom, green) */}
                        {isDownloading && (
                            <div className="absolute bottom-0 left-0 right-0">
                                <Progress
                                    size="sm"
                                    value={downloadProgress}
                                    className="rounded-none"
                                    classNames={{
                                        indicator: "bg-success",
                                        track: "bg-black/50 rounded-none",
                                    }}
                                />
                            </div>
                        )}

                        {/* Watch progress bar (only if not downloading) */}
                        {!isDownloading && progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0">
                                <Progress
                                    size="sm"
                                    value={progress}
                                    className="rounded-none"
                                    classNames={{
                                        indicator: "bg-primary",
                                        track: "bg-black/50 rounded-none",
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div className="p-3">
                        <p className={`text-sm font-medium truncate ${isWatched ? "text-default-400" : ""}`}>{episode.title}</p>
                        {episode.summary && (
                            <p className="text-xs text-default-400 line-clamp-2 mt-1">
                                {episode.summary}
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>
            <ResumePlaybackModal
                isOpen={showResumeModal}
                onClose={() => setShowResumeModal(false)}
                ratingKey={episode.ratingKey}
                viewOffset={episode.viewOffset!}
                duration={episode.duration!}
            />
            {sonarrEpisode && (
                <ManualSearchModal
                    isOpen={manualSearchOpen}
                    onClose={() => setManualSearchOpen(false)}
                    title={`Search: E${episode.index?.toString().padStart(2, "0")} - ${episode.title}`}
                    sonarrEpisodeId={sonarrEpisode.id}
                />
            )}
        </>
    );
}

export default function EpisodeList({seasonId, sonarrSeriesId}: EpisodeListProps) {
    const {data: episodes} = useChildren(seasonId);
    const {data: sonarrQueue} = useSonarrQueue();
    const {data: sonarrEpisodes} = useSonarrEpisodes(sonarrSeriesId);

    // Build map of episode title -> queue item for matching
    const queueByTitle = new Map<string, QueueItem>();
    sonarrQueue?.records?.forEach((item) => {
        if (item.title) {
            queueByTitle.set(item.title.toLowerCase(), item);
        }
    });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {episodes?.map((episode: PlexMediaItem, index: number) => {
                // Try to match this episode to a queue item by title
                const downloadItem = queueByTitle.get(episode.title?.toLowerCase());
                // Match to Sonarr episode by season+episode number
                const matchedSonarrEp = sonarrEpisodes?.find(
                    se => se.seasonNumber === episode.parentIndex && se.episodeNumber === episode.index
                );
                return (
                    <EpisodeCard
                        key={episode.ratingKey}
                        episode={episode}
                        index={index}
                        downloadItem={downloadItem}
                        sonarrEpisode={matchedSonarrEp}
                    />
                );
            })}
        </div>
    );
}
