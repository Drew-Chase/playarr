import {useState, useRef, useEffect} from "react";
import {Progress, CircularProgress, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useNavigate, useLocation} from "react-router-dom";
import {motion} from "framer-motion";
import {useChildren} from "../../hooks/usePlex.ts";
import {useSonarrQueue, useSonarrEpisodes, useTmdbSeason} from "../../hooks/useDiscover.ts";
import {useDownloads} from "../../hooks/useDownloads.ts";
import {useQueryClient} from "@tanstack/react-query";
import {api} from "../../lib/api.ts";
import {toast} from "sonner";
import type {PlexMediaItem, QueueItem, SonarrEpisode, TmdbEpisode} from "../../lib/types.ts";
import {formatDuration, tmdbImage} from "../../lib/utils.ts";
import {plexApi} from "../../lib/plex.ts";
import ResumePlaybackModal from "./ResumePlaybackModal.tsx";
import ManualSearchModal from "../discover/ManualSearchModal.tsx";

interface EpisodeListProps {
    seasonId: string;
    sonarrSeriesId?: number;
    showTmdbId?: string;
    seasonNumber?: number;
}

function EpisodeCard({episode, index, downloadItem, sonarrEpisode, realtimeProgress}: { episode: PlexMediaItem; index: number; downloadItem?: QueueItem; sonarrEpisode?: SonarrEpisode; realtimeProgress?: number }) {
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

    // Download progress — prefer real-time from download client
    const downloadProgress = realtimeProgress
        ?? (downloadItem ? ((downloadItem.size - downloadItem.sizeleft) / downloadItem.size) * 100 : 0);
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

function MissingEpisodeCard({sonarrEpisode, tmdbEpisode, index, downloadItem, realtimeProgress}: { sonarrEpisode: SonarrEpisode; tmdbEpisode?: TmdbEpisode; index: number; downloadItem?: QueueItem; realtimeProgress?: number }) {
    const [manualSearchOpen, setManualSearchOpen] = useState(false);

    const stillUrl = tmdbEpisode?.still_path ? tmdbImage(tmdbEpisode.still_path, "w780") : "";

    // Prefer real-time progress from download client, fall back to Sonarr queue data
    const downloadProgress = realtimeProgress
        ?? (downloadItem ? ((downloadItem.size - downloadItem.sizeleft) / downloadItem.size) * 100 : 0);
    const isDownloading = !!downloadItem && downloadItem.sizeleft > 0;

    const handleAutoSearch = async () => {
        try {
            await api.post("/sonarr/command", {
                name: "EpisodeSearch",
                episodeIds: [sonarrEpisode.id],
            });
            toast.success(`Searching for E${sonarrEpisode.episodeNumber.toString().padStart(2, "0")}`);
        } catch {
            toast.error("Failed to trigger search");
        }
    };

    return (
        <>
            <motion.div
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: index * 0.05, duration: 0.3}}
                className="group"
            >
                <div className="relative rounded-lg overflow-hidden bg-content2">
                    {/* 16:9 thumbnail — blurred */}
                    <div className="relative aspect-video">
                        {stillUrl ? (
                            <img
                                src={stillUrl}
                                alt={sonarrEpisode.title}
                                className="object-cover w-full h-full blur-sm brightness-50 scale-105"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full bg-content3 flex items-center justify-center">
                                <Icon icon="mdi:television" width="32" className="text-default-400"/>
                            </div>
                        )}

                        {/* Episode number badge */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                            E{sonarrEpisode.episodeNumber.toString().padStart(2, "0")}
                        </div>

                        {/* Caution triangle / download progress + always-visible dropdown */}
                        <div className="absolute top-1 right-1 flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                            {isDownloading ? (
                                <CircularProgress
                                    size="sm"
                                    value={downloadProgress}
                                    color="success"
                                    showValueLabel
                                    classNames={{
                                        svg: "w-8 h-8",
                                        value: "text-[8px] font-bold text-white",
                                        track: "stroke-black/40",
                                    }}
                                    aria-label="Download progress"
                                />
                            ) : (
                                <Icon icon="mdi:alert" width="20" className="text-warning drop-shadow-md"/>
                            )}
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button isIconOnly size="sm" variant="flat" className="bg-black/60 min-w-6 w-6 h-6">
                                        <Icon icon="mdi:dots-vertical" width="14" className="text-white"/>
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Missing episode actions" onAction={(key) => {
                                    if (key === "auto-search") handleAutoSearch();
                                    if (key === "manual-search") setManualSearchOpen(true);
                                }}>
                                    <DropdownSection title="Sonarr">
                                        <DropdownItem key="auto-search" startContent={<Icon icon="mdi:magnify" width="16"/>}>
                                            Auto Search
                                        </DropdownItem>
                                        <DropdownItem key="manual-search" startContent={<Icon icon="mdi:text-search" width="16"/>}>
                                            Manual Search
                                        </DropdownItem>
                                    </DropdownSection>
                                </DropdownMenu>
                            </Dropdown>
                        </div>

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
                    </div>

                    {/* Title */}
                    <div className="p-3">
                        <p className="text-sm font-medium truncate text-default-400">{sonarrEpisode.title}</p>
                        {sonarrEpisode.airDate && (
                            <p className="text-xs text-default-500 mt-1">
                                {sonarrEpisode.airDate}
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>
            <ManualSearchModal
                isOpen={manualSearchOpen}
                onClose={() => setManualSearchOpen(false)}
                title={`Search: E${sonarrEpisode.episodeNumber.toString().padStart(2, "0")} - ${sonarrEpisode.title}`}
                sonarrEpisodeId={sonarrEpisode.id}
            />
        </>
    );
}

export default function EpisodeList({seasonId, sonarrSeriesId, showTmdbId, seasonNumber}: EpisodeListProps) {
    const {data: episodes} = useChildren(seasonId);
    const {data: sonarrQueue} = useSonarrQueue();
    const {data: sonarrEpisodes} = useSonarrEpisodes(sonarrSeriesId);
    const {data: tmdbSeason} = useTmdbSeason(showTmdbId, seasonNumber);
    const {data: downloads} = useDownloads();
    const queryClient = useQueryClient();

    // Track downloading episode IDs — when one disappears, a download completed
    const currentDownloadingIds = sonarrQueue?.records?.filter(r => r.episodeId).map(r => r.episodeId!) ?? [];
    const downloadingKey = currentDownloadingIds.sort().join(",");
    const prevDownloadingKey = useRef(downloadingKey);

    useEffect(() => {
        const prev = prevDownloadingKey.current;
        if (prev && prev !== downloadingKey) {
            // Queue changed — check if an item was removed (download completed)
            const prevIds = new Set(prev.split(",").filter(Boolean).map(Number));
            const currentIds = new Set(currentDownloadingIds);
            for (const id of prevIds) {
                if (!currentIds.has(id)) {
                    // A download completed — refetch Plex children and Sonarr episodes
                    queryClient.invalidateQueries({queryKey: ["plex", "children", seasonId]});
                    if (sonarrSeriesId) {
                        queryClient.invalidateQueries({queryKey: ["sonarr", "episodes", sonarrSeriesId]});
                    }
                    break;
                }
            }
        }
        prevDownloadingKey.current = downloadingKey;
    }, [downloadingKey, seasonId, sonarrSeriesId, queryClient]);

    // Build map of Sonarr episodeId -> queue item for matching
    const queueByEpisodeId = new Map<number, QueueItem>();
    sonarrQueue?.records?.forEach((item) => {
        if (item.episodeId) {
            queueByEpisodeId.set(item.episodeId, item);
        }
    });

    // Build map of release name -> real-time progress from download clients
    const realtimeProgressByName = new Map<string, number>();
    downloads?.queue?.forEach((item) => {
        realtimeProgressByName.set(item.name.toLowerCase(), item.progress);
    });

    // Build set of Plex episode numbers for this season
    const plexEpisodeNumbers = new Set<number>();
    episodes?.forEach(ep => {
        if (ep.index != null) plexEpisodeNumbers.add(ep.index);
    });

    // Find missing episodes: in Sonarr for this season but not in Plex
    const missingEpisodes = sonarrEpisodes
        ?.filter(se => se.seasonNumber === seasonNumber && !se.hasFile && !plexEpisodeNumbers.has(se.episodeNumber))
        ?? [];

    // Build TMDB episode map for missing episode stills
    const tmdbEpisodeMap = new Map<number, TmdbEpisode>();
    tmdbSeason?.episodes?.forEach(ep => {
        tmdbEpisodeMap.set(ep.episode_number, ep);
    });

    // Build a unified sorted list: Plex episodes + missing episodes by episode number
    type EpisodeEntry =
        | { type: "plex"; episode: PlexMediaItem; sonarrEpisode?: SonarrEpisode; downloadItem?: QueueItem; realtimeProgress?: number }
        | { type: "missing"; sonarrEpisode: SonarrEpisode; tmdbEpisode?: TmdbEpisode; downloadItem?: QueueItem; realtimeProgress?: number };

    const entries: EpisodeEntry[] = [];

    // Add Plex episodes
    episodes?.forEach(ep => {
        const matchedSonarrEp = sonarrEpisodes?.find(
            se => se.seasonNumber === ep.parentIndex && se.episodeNumber === ep.index
        );
        const downloadItem = matchedSonarrEp ? queueByEpisodeId.get(matchedSonarrEp.id) : undefined;
        const realtimeProgress = downloadItem ? realtimeProgressByName.get(downloadItem.title.toLowerCase()) : undefined;
        entries.push({type: "plex", episode: ep, sonarrEpisode: matchedSonarrEp, downloadItem, realtimeProgress});
    });

    // Add missing episodes
    missingEpisodes.forEach(se => {
        const tmdbEp = tmdbEpisodeMap.get(se.episodeNumber);
        const downloadItem = queueByEpisodeId.get(se.id);
        const realtimeProgress = downloadItem ? realtimeProgressByName.get(downloadItem.title.toLowerCase()) : undefined;
        entries.push({type: "missing", sonarrEpisode: se, tmdbEpisode: tmdbEp, downloadItem, realtimeProgress});
    });

    // Sort by episode number
    entries.sort((a, b) => {
        const numA = a.type === "plex" ? (a.episode.index ?? 0) : a.sonarrEpisode.episodeNumber;
        const numB = b.type === "plex" ? (b.episode.index ?? 0) : b.sonarrEpisode.episodeNumber;
        return numA - numB;
    });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {entries.map((entry, index) => {
                if (entry.type === "plex") {
                    return (
                        <EpisodeCard
                            key={`plex-${entry.episode.ratingKey}`}
                            episode={entry.episode}
                            index={index}
                            downloadItem={entry.downloadItem}
                            sonarrEpisode={entry.sonarrEpisode}
                            realtimeProgress={entry.realtimeProgress}
                        />
                    );
                } else {
                    return (
                        <MissingEpisodeCard
                            key={`missing-${entry.sonarrEpisode.id}`}
                            sonarrEpisode={entry.sonarrEpisode}
                            tmdbEpisode={entry.tmdbEpisode}
                            index={index}
                            downloadItem={entry.downloadItem}
                            realtimeProgress={entry.realtimeProgress}
                        />
                    );
                }
            })}
        </div>
    );
}
