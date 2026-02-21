import {useParams, useNavigate, useLocation} from "react-router-dom";
import {useRef, useState} from "react";
import {Button, Spinner, Progress, Chip, Breadcrumbs, BreadcrumbItem, Modal, ModalContent, ModalBody, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useMetadata, useChildren, useAllEpisodes, useShowOnDeck, useTmdbTrailer} from "../hooks/usePlex.ts";
import {useSonarrSeriesByTmdb, useRadarrMovieByTmdb, useSonarrEpisodes} from "../hooks/useDiscover.ts";
import MetadataInfo from "../components/media/MetadataInfo.tsx";
import EpisodeList from "../components/media/EpisodeList.tsx";
import ContentRow from "../components/layout/ContentRow.tsx";
import MediaCard from "../components/media/MediaCard.tsx";
import ResumePlaybackModal from "../components/media/ResumePlaybackModal.tsx";
import ManualSearchModal from "../components/discover/ManualSearchModal.tsx";
import {plexApi} from "../lib/plex.ts";
import {api} from "../lib/api.ts";
import {plexImage, formatDuration} from "../lib/utils.ts";
import {useAuth} from "../providers/AuthProvider.tsx";
import {useQuery} from "@tanstack/react-query";
import {toast} from "sonner";
import type {PlexMediaItem, PlexExtra, PlexRole, PlexReview, TmdbVideo} from "../lib/types.ts";

function extractTmdbId(item: PlexMediaItem): number | undefined {
    const guid = item.Guid?.find(g => g.id.startsWith("tmdb://"));
    if (!guid) return undefined;
    const num = parseInt(guid.id.replace("tmdb://", ""), 10);
    return isNaN(num) ? undefined : num;
}


function DetailBreadcrumbs({item}: { item: PlexMediaItem }) {
    const crumbs: { label: string; href?: string }[] = [];

    if (item.type === "season") {
        if (item.parentRatingKey && item.parentTitle) {
            crumbs.push({label: item.parentTitle, href: `/detail/${item.parentRatingKey}`});
        }
        crumbs.push({label: item.title});
    }
    if (item.type === "episode") {
        if (item.grandparentRatingKey && item.grandparentTitle) {
            crumbs.push({label: item.grandparentTitle, href: `/detail/${item.grandparentRatingKey}`});
        }
        if (item.parentRatingKey && item.parentTitle) {
            crumbs.push({label: item.parentTitle, href: `/detail/${item.parentRatingKey}`});
        }
        crumbs.push({label: item.title});
    }

    if (crumbs.length === 0) return null;

    return (
        <Breadcrumbs size="lg" className="mb-4" classNames={{list: "gap-1"}}>
            {crumbs.map((crumb, i) => (
                <BreadcrumbItem key={i} href={crumb.href} isCurrent={!crumb.href} classNames={{item: "text-white/90 data-[current=true]:text-white data-[current=true]:font-bold"}}>
                    {crumb.label}
                </BreadcrumbItem>
            ))}
        </Breadcrumbs>
    );
}

function SeasonsGrid({showId, sonarrSeriesId}: { showId: string; sonarrSeriesId?: number }) {
    const navigate = useNavigate();
    const {data: seasons, isLoading} = useChildren(showId);

    if (isLoading) return <Spinner size="sm"/>;
    if (!seasons || seasons.length === 0) return null;

    if (seasons.length === 1) {
        return <EpisodeList seasonId={seasons[0].ratingKey} sonarrSeriesId={sonarrSeriesId}/>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {seasons.map((season: PlexMediaItem) => {
                const thumbUrl = season.thumb ? `/api/media/${season.ratingKey}/thumb` : "";
                const episodeCount = season.leafCount;
                return (
                    <div
                        key={season.ratingKey}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/detail/${season.ratingKey}`)}
                    >
                        <div className="relative rounded-lg overflow-hidden bg-content2 aspect-[2/3]">
                            {thumbUrl ? (
                                <img
                                    src={thumbUrl}
                                    alt={season.title}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full bg-content3 flex items-center justify-center">
                                    <Icon icon="mdi:folder" width="48" className="text-default-400"/>
                                </div>
                            )}
                            <div
                                className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-primary/50 transition-all"/>
                        </div>
                        <div className="mt-2 px-1">
                            <p className="text-sm font-semibold truncate">{season.title}</p>
                            {episodeCount != null && (
                                <p className="text-xs text-default-400">{episodeCount} episode{episodeCount !== 1 ? "s" : ""}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function CrewInfo({item}: { item: PlexMediaItem }) {
    const directors = item.Director;
    const writers = item.Writer;

    if (!directors?.length && !writers?.length) return null;

    return (
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mt-3">
            {directors && directors.length > 0 && (
                <div className="flex gap-2">
                    <span className="text-default-500">Directed by</span>
                    <span className="text-default-600 font-bold">{directors.map(d => d.tag).join(", ")}</span>
                </div>
            )}
            {writers && writers.length > 0 && (
                <div className="flex gap-2">
                    <span className="text-default-500">Written by</span>
                    <span className="text-default-600 font-bold">{writers.map(w => w.tag).join(", ")}</span>
                </div>
            )}
        </div>
    );
}

function GenreTags({item}: { item: PlexMediaItem }) {
    if (!item.Genre?.length) return null;

    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {item.Genre.map((genre, i) => (
                <Chip key={i} size="sm" variant="flat" className="text-xs">
                    {genre.tag}
                </Chip>
            ))}
        </div>
    );
}

function MediaInfo({item}: { item: PlexMediaItem }) {
    const media = item.Media?.[0];
    if (!media) return null;

    const resolution = media.height >= 2160 ? "4K" :
        media.height >= 1080 ? "1080p" :
            media.height >= 720 ? "720p" :
                media.height ? `${media.height}p` : null;

    const videoCodec = media.videoCodec?.toUpperCase();
    const audioCodec = media.audioCodec?.toUpperCase();
    const audioStream = media.Part?.[0]?.Stream?.find(s => s.streamType === 2);
    const audioTitle = audioStream?.displayTitle;

    return (
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mt-4">
            {resolution && (
                <div className="flex gap-2">
                    <span className="text-default-500">Video</span>
                    <span className="text-default-600 font-bold">{resolution} ({videoCodec})</span>
                </div>
            )}
            {(audioTitle || audioCodec) && (
                <div className="flex gap-2">
                    <span className="text-default-500">Audio</span>
                    <span className="text-default-600 font-bold">{audioTitle || audioCodec}</span>
                </div>
            )}
        </div>
    );
}

function CastSection({roles}: { roles: PlexRole[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!roles || roles.length === 0) return null;

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const amount = scrollRef.current.clientWidth * 0.8;
        scrollRef.current.scrollBy({
            left: direction === "left" ? -amount : amount,
            behavior: "smooth",
        });
    };

    return (
        <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Cast & Crew</h2>
            <div className="relative group/cast">
                <button
                    onClick={() => scroll("left")}
                    className="absolute -left-4 top-1/3 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/cast:opacity-100 transition-opacity hover:bg-black/80"
                >
                    <Icon icon="mdi:chevron-left" width="28" className="text-white"/>
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-5 overflow-x-auto pb-2"
                    style={{scrollbarWidth: "none"}}
                >
                    {roles.map((role) => (
                        <div key={`${role.tag}-${role.role}`} className="flex-shrink-0 w-[120px] text-center">
                            <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-content2 mx-auto">
                                {role.thumb ? (
                                    <img
                                        src={plexImage(role.thumb, 240, 240)}
                                        alt={role.tag}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Icon icon="mdi:account" width="48" className="text-default-400"/>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm font-medium mt-2 truncate">{role.tag}</p>
                            <p className="text-xs text-default-400 truncate">{role.role}</p>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => scroll("right")}
                    className="absolute -right-4 top-1/3 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/cast:opacity-100 transition-opacity hover:bg-black/80"
                >
                    <Icon icon="mdi:chevron-right" width="28" className="text-white"/>
                </button>
            </div>
        </section>
    );
}

function ReviewsSection({reviews}: { reviews: PlexReview[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!reviews || reviews.length === 0) return null;

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const amount = scrollRef.current.clientWidth * 0.8;
        scrollRef.current.scrollBy({
            left: direction === "left" ? -amount : amount,
            behavior: "smooth",
        });
    };

    return (
        <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Ratings & Reviews</h2>
            <div className="relative group/reviews">
                <button
                    onClick={() => scroll("left")}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/reviews:opacity-100 transition-opacity hover:bg-black/80"
                >
                    <Icon icon="mdi:chevron-left" width="28" className="text-white"/>
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-2"
                    style={{scrollbarWidth: "none"}}
                >
                    {reviews.map((review, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 w-[300px] bg-content2 rounded-lg p-4"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                {review.image ? (
                                    <img
                                        src={review.image}
                                        alt={review.source}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="w-8 h-8 rounded-full bg-content3 flex items-center justify-center text-xs font-bold">
                                        {review.tag?.[0]?.toUpperCase() || "?"}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{review.tag}</p>
                                    {review.source && (
                                        <p className="text-xs text-default-400">{review.source}</p>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-default-300 line-clamp-4 leading-relaxed">
                                {review.text}
                            </p>
                            {review.link && (
                                <a
                                    href={review.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:text-primary/80 mt-2 inline-block transition-colors"
                                >
                                    Read full review
                                </a>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => scroll("right")}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/reviews:opacity-100 transition-opacity hover:bg-black/80"
                >
                    <Icon icon="mdi:chevron-right" width="28" className="text-white"/>
                </button>
            </div>
        </section>
    );
}

/** Find the on-deck episode: first partially-watched, or first unwatched. */
function findOnDeckEpisode(episodes: PlexMediaItem[]): PlexMediaItem | undefined {
    // Prefer a partially-watched episode (has viewOffset)
    const inProgress = episodes.find(ep => ep.viewOffset && ep.viewOffset > 0);
    if (inProgress) return inProgress;
    // Otherwise the first unwatched episode
    const unwatched = episodes.find(ep => !ep.viewCount);
    if (unwatched) return unwatched;
    // Everything watched — return the first episode so user can rewatch
    return episodes[0];
}

function PlayablePoster({src, alt, playTarget, className, containerClassName}: {
    src: string;
    alt: string;
    playTarget: PlexMediaItem;
    className?: string;
    containerClassName?: string;
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showResumeModal, setShowResumeModal] = useState(false);

    const handlePlay = () => {
        if (playTarget.viewOffset && playTarget.duration) {
            setShowResumeModal(true);
        } else {
            navigate(`/player/${playTarget.ratingKey}?from=${encodeURIComponent(location.pathname)}`);
        }
    };

    return (
        <>
            <div className={`relative cursor-pointer group/poster ${containerClassName ?? ""}`} onClick={handlePlay}>
                <img src={src} alt={alt} className={className}/>
                <div className="absolute inset-0 bg-black/0 group-hover/poster:bg-black/40 transition-colors flex items-center justify-center rounded-lg">
                    <div className="opacity-0 group-hover/poster:opacity-100 transition-opacity">
                        <Icon icon="mdi:play-circle" width="64" className="text-white drop-shadow-lg"/>
                    </div>
                </div>
            </div>
            <ResumePlaybackModal
                isOpen={showResumeModal}
                onClose={() => setShowResumeModal(false)}
                ratingKey={playTarget.ratingKey}
                viewOffset={playTarget.viewOffset!}
                duration={playTarget.duration!}
            />
        </>
    );
}

function formatEpisodeCode(ep: PlexMediaItem): string {
    const s = ep.parentIndex?.toString().padStart(2, "0") ?? "?";
    const e = ep.index?.toString().padStart(2, "0") ?? "?";
    return `S${s}E${e}`;
}

function ActionButtons({item, progress, onDeckEpisode, plexTrailer, tmdbTrailer, onAutoSearch, onManualSearch}: {
    item: PlexMediaItem;
    progress: number;
    onDeckEpisode?: PlexMediaItem;
    plexTrailer?: PlexExtra;
    tmdbTrailer?: TmdbVideo | null;
    onAutoSearch?: () => void;
    onManualSearch?: () => void;
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const {isGuest} = useAuth();
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [watchedOverride, setWatchedOverride] = useState<boolean | null>(null);
    const [youtubeOpen, setYoutubeOpen] = useState(false);

    // For shows/seasons, use the on-deck episode for playback
    const playTarget = onDeckEpisode ?? item;
    const playProgress = playTarget.viewOffset && playTarget.duration
        ? (playTarget.viewOffset / playTarget.duration) * 100
        : 0;

    const isWatched = watchedOverride !== null ? watchedOverride : !!item.viewCount;
    const effectiveProgress = watchedOverride !== null ? 0 : (onDeckEpisode ? playProgress : progress);
    const showResume = watchedOverride !== null ? false : !!playTarget.viewOffset;

    const handlePlay = () => {
        if (showResume && playTarget.duration) {
            setShowResumeModal(true);
        } else {
            navigate(`/player/${playTarget.ratingKey}?from=${encodeURIComponent(location.pathname)}`);
        }
    };

    const handleMarkWatched = () => {
        setWatchedOverride(true);
        plexApi.scrobble(item.ratingKey);
    };

    const handleMarkUnwatched = () => {
        setWatchedOverride(false);
        plexApi.unscrobble(item.ratingKey);
    };

    // Hide watched/unwatched buttons for shows (doesn't apply)
    const showWatchedToggle = item.type !== "show";

    // Build the play button label
    let playLabel: string;
    if (onDeckEpisode) {
        const code = formatEpisodeCode(onDeckEpisode);
        if (showResume && onDeckEpisode.viewOffset && onDeckEpisode.duration) {
            const remaining = onDeckEpisode.duration - onDeckEpisode.viewOffset;
            playLabel = `Resume ${code} - ${onDeckEpisode.title} (${formatDuration(remaining)} left)`;
        } else {
            playLabel = `Play ${code} - ${onDeckEpisode.title}`;
        }
    } else {
        playLabel = showResume ? "Resume" : "Play";
    }

    return (
        <div className="flex flex-wrap gap-3 mt-5">
            <Button
                color="primary"
                radius="sm"
                size="lg"
                startContent={<Icon icon="mdi:play" width="24"/>}
                onPress={handlePlay}
                className="font-semibold"
            >
                {playLabel}
            </Button>
            {(plexTrailer || tmdbTrailer) && (
                <Button
                    variant="ghost"
                    radius="sm"
                    size="lg"
                    startContent={<Icon icon="mdi:play-outline" width="20"/>}
                    onPress={() => {
                        if (plexTrailer) {
                            navigate(`/player/${plexTrailer.ratingKey}?from=${encodeURIComponent(location.pathname)}`);
                        } else {
                            setYoutubeOpen(true);
                        }
                    }}
                    className="border-2 border-white/90"
                >
                    Trailer
                </Button>
            )}
            {!isGuest && effectiveProgress > 0 && (
                <div className="flex items-center">
                    <Progress
                        size="sm"
                        value={effectiveProgress}
                        className="w-32"
                        classNames={{indicator: "bg-primary"}}
                    />
                    <span className="text-xs text-default-400 ml-2">{Math.round(effectiveProgress)}%</span>
                </div>
            )}
            {!isGuest && showWatchedToggle && (isWatched ? (
                <Button
                    variant="ghost"
                    radius="sm"
                    color={"secondary"}
                    size="lg"
                    startContent={<Icon icon="mdi:eye-off" width="20"/>}
                    onPress={handleMarkUnwatched}
                >
                    Mark Unwatched
                </Button>
            ) : (
                <Button
                    variant="ghost"
                    radius="sm"
                    color={"secondary"}
                    size="lg"
                    startContent={<Icon icon="mdi:eye" width="20"/>}
                    onPress={handleMarkWatched}
                    className="border-2 border-white/90"
                >
                    Mark Watched
                </Button>
            ))}
            {(onAutoSearch || onManualSearch) && (
                <Dropdown>
                    <DropdownTrigger>
                        <Button
                            variant="ghost"
                            radius="sm"
                            size="lg"
                            isIconOnly
                            className="border-2 border-white/90"
                        >
                            <Icon icon="mdi:dots-vertical" width="22"/>
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Search actions" onAction={(key) => {
                        if (key === "auto-search") onAutoSearch?.();
                        if (key === "manual-search") onManualSearch?.();
                    }}>
                        <DropdownItem key="auto-search" startContent={<Icon icon="mdi:magnify" width="18"/>}>
                            Auto Search
                        </DropdownItem>
                        <DropdownItem key="manual-search" startContent={<Icon icon="mdi:text-search" width="18"/>}>
                            Manual Search
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            )}
            <ResumePlaybackModal
                isOpen={showResumeModal}
                onClose={() => setShowResumeModal(false)}
                ratingKey={playTarget.ratingKey}
                viewOffset={playTarget.viewOffset!}
                duration={playTarget.duration!}
            />
            {tmdbTrailer && (
                <Modal
                    isOpen={youtubeOpen}
                    onClose={() => setYoutubeOpen(false)}
                    size="5xl"
                    backdrop="blur"
                >
                    <ModalContent>
                        <ModalBody className="p-0">
                            <video
                                className="w-full rounded-lg"
                                src={`/api/discover/youtube-stream/${tmdbTrailer.key}`}
                                controls
                                autoPlay
                            />
                        </ModalBody>
                    </ModalContent>
                </Modal>
            )}
        </div>
    );
}

function EpisodeDetail({item, onAutoSearch, onManualSearch}: { item: PlexMediaItem; onAutoSearch?: () => void; onManualSearch?: () => void }) {
    const thumbUrl = item.thumb ? `/api/media/${item.ratingKey}/thumb` : "";
    const progress = item.viewOffset && item.duration
        ? (item.viewOffset / item.duration) * 100
        : 0;

    return (
        <div>
            <div className="flex flex-col md:flex-row gap-6">
                {/* Episode thumbnail */}
                {thumbUrl && (
                    <PlayablePoster
                        src={thumbUrl}
                        alt={item.title}
                        playTarget={item}
                        className="object-cover w-full h-full"
                        containerClassName="shrink-0 max-w-2xl rounded-lg overflow-hidden aspect-video"
                    />
                )}

                {/* Info */}
                <div className="flex-1">
                    <MetadataInfo item={item}/>
                    <CrewInfo item={item}/>
                    <MediaInfo item={item}/>
                    <ActionButtons item={item} progress={progress} onAutoSearch={onAutoSearch} onManualSearch={onManualSearch}/>
                </div>
            </div>

            {/* Cast & Crew */}
            {item.Role && item.Role.length > 0 && (
                <CastSection roles={item.Role}/>
            )}
        </div>
    );
}

export default function Detail() {
    const {id} = useParams<{ id: string }>();
    const {data: item, isLoading} = useMetadata(id || "");
    const {data: related} = useQuery({
        queryKey: ["plex", "related", id],
        queryFn: () => plexApi.getRelated(id!),
        enabled: !!id && item?.type !== "season",
    });

    // Manual search modal state
    const [searchModalOpen, setSearchModalOpen] = useState(false);

    // Extract TMDB ID from Plex Guid for Sonarr/Radarr matching
    const tmdbId = item ? extractTmdbId(item) : undefined;
    // For episodes/seasons, get the show's TMDB ID from parent
    const {data: parentMeta} = useMetadata(
        item?.type === "episode" ? (item.grandparentRatingKey || "") :
        item?.type === "season" ? (item.parentRatingKey || "") : ""
    );
    const showTmdbId = parentMeta ? extractTmdbId(parentMeta) : undefined;

    // Lookup matching Sonarr/Radarr items
    const sonarrSeries = useSonarrSeriesByTmdb(
        item?.type === "show" ? tmdbId :
        (item?.type === "season" || item?.type === "episode") ? showTmdbId :
        undefined
    );
    const radarrMovie = useRadarrMovieByTmdb(item?.type === "movie" ? tmdbId : undefined);

    // Fetch Sonarr episodes for episode-level search
    const {data: sonarrEpisodes} = useSonarrEpisodes(sonarrSeries?.id);

    // Find matching Sonarr episode for the current Plex episode
    const matchingSonarrEpisode = item?.type === "episode" && sonarrEpisodes
        ? sonarrEpisodes.find(ep =>
            ep.seasonNumber === item.parentIndex && ep.episodeNumber === item.index
        )
        : undefined;

    // Build search modal props
    const searchModalProps = item?.type === "movie" && radarrMovie
        ? { radarrMovieId: radarrMovie.id, title: `Search: ${item.title}` }
        : item?.type === "episode" && sonarrSeries && matchingSonarrEpisode
        ? { sonarrEpisodeId: matchingSonarrEpisode.id, title: `Search: S${item.parentIndex?.toString().padStart(2, "0")}E${item.index?.toString().padStart(2, "0")} - ${item.title}` }
        : item?.type === "season" && sonarrSeries
        ? { sonarrSeriesId: sonarrSeries.id, sonarrSeasonNumber: item.index, title: `Search: ${item.parentTitle} - ${item.title}` }
        : item?.type === "show" && sonarrSeries
        ? { sonarrSeriesId: sonarrSeries.id, title: `Search: ${item.title}` }
        : null;

    const canSearch = !!searchModalProps;

    const handleAutoSearch = async () => {
        try {
            if (item?.type === "movie" && radarrMovie) {
                await api.post("/radarr/command", {name: "MoviesSearch", movieIds: [radarrMovie.id]});
                toast.success(`Searching for "${item.title}"`);
            } else if (item?.type === "episode" && matchingSonarrEpisode) {
                await api.post("/sonarr/command", {name: "EpisodeSearch", episodeIds: [matchingSonarrEpisode.id]});
                toast.success(`Searching for S${item.parentIndex?.toString().padStart(2, "0")}E${item.index?.toString().padStart(2, "0")}`);
            } else if (item?.type === "season" && sonarrSeries) {
                await api.post("/sonarr/command", {name: "SeasonSearch", seriesId: sonarrSeries.id, seasonNumber: item.index});
                toast.success(`Searching for ${item.title}`);
            } else if (item?.type === "show" && sonarrSeries) {
                await api.post("/sonarr/command", {name: "SeriesSearch", seriesId: sonarrSeries.id});
                toast.success(`Searching for "${item.title}"`);
            }
        } catch {
            toast.error("Failed to trigger search");
        }
    };

    // Use Plex's on-deck API for shows (handles specials correctly)
    const {data: showOnDeck} = useShowOnDeck(
        item?.type === "show" || item?.type === "season" ? (item?.ratingKey || "") : ""
    );
    // Fallback: fetch all episodes so we can pick the first unwatched locally
    const {data: allEpisodes} = useAllEpisodes(
        item?.type === "show" && !showOnDeck ? (item?.ratingKey || "") : ""
    );
    const {data: seasonEpisodes} = useChildren(
        item?.type === "season" && !showOnDeck ? (item?.ratingKey || "") : ""
    );
    const onDeckEpisode = showOnDeck
        ? showOnDeck
        : item?.type === "show" && allEpisodes
            ? findOnDeckEpisode(allEpisodes)
            : item?.type === "season" && seasonEpisodes
                ? findOnDeckEpisode(seasonEpisodes)
                : undefined;

    // Trailer: prefer Plex extras, fall back to TMDB YouTube trailer
    const plexTrailer = item?.Extras?.Video?.find(v => v.subtype === "trailer");
    const {data: tmdbTrailer} = useTmdbTrailer(item);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    if (!item) {
        return <p className="text-center text-default-400 py-12">Item not found</p>;
    }

    const progress = item.viewOffset && item.duration
        ? (item.viewOffset / item.duration) * 100
        : 0;

    const artSource = item.type === "episode" || item.type === "season"
        ? item.art || item.thumb
        : item.art;

    return (
        <div>
            {/* Full-bleed art background */}
            <div className="relative w-full h-[50vh] -mt-16 min-h-[700px]">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: artSource ? `url(${plexImage(artSource, 1920, 1080)})` : undefined,
                    }}
                />
                <div className="absolute inset-0 hero-gradient-bottom"/>
                <div className="absolute inset-0 hero-gradient-left opacity-40"/>
            </div>

            {/* Content area */}
            <div className="relative z-10 -mt-96 px-6 md:px-12 lg:px-16">
                <DetailBreadcrumbs item={item}/>

                {item.type === "episode" ? (
                    <EpisodeDetail item={item} onAutoSearch={canSearch ? handleAutoSearch : undefined} onManualSearch={canSearch ? () => setSearchModalOpen(true) : undefined}/>
                ) : (
                    /* Movie / Show / Season — poster + metadata layout */
                    <div>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Poster */}
                            <PlayablePoster
                                src={item.thumb ? `/api/media/${item.ratingKey}/thumb` : ""}
                                alt={item.title}
                                playTarget={onDeckEpisode ?? item}
                                className="h-[600px] object-cover rounded-lg shadow-2xl"
                                containerClassName="shrink-0"
                            />

                            {/* Info */}
                            <div className="flex-1 pt-4 md:pt-12">
                                <MetadataInfo item={item}/>
                                {item.studio && (
                                    <p className="text-sm text-default-400 mt-1">{item.studio}</p>
                                )}
                                <CrewInfo item={item}/>
                                <GenreTags item={item}/>
                                <MediaInfo item={item}/>
                                {(item.type === "movie" || item.type === "show" || item.type === "season") && (
                                    <ActionButtons item={item} progress={progress} onDeckEpisode={onDeckEpisode} plexTrailer={plexTrailer} tmdbTrailer={tmdbTrailer} onAutoSearch={canSearch ? handleAutoSearch : undefined} onManualSearch={canSearch ? () => setSearchModalOpen(true) : undefined}/>
                                )}
                            </div>
                        </div>

                        {/* Cast & Crew */}
                        {item.Role && item.Role.length > 0 && (
                            <CastSection roles={item.Role}/>
                        )}

                        {/* Reviews */}
                        {item.Review && item.Review.length > 0 && (
                            <ReviewsSection reviews={item.Review}/>
                        )}
                    </div>
                )}

                {/* Type-specific content sections */}
                <div className="mt-8">
                    {item.type === "show" && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Seasons</h2>
                            <SeasonsGrid showId={item.ratingKey} sonarrSeriesId={sonarrSeries?.id}/>
                        </div>
                    )}

                    {item.type === "season" && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Episodes</h2>
                            <EpisodeList seasonId={item.ratingKey} sonarrSeriesId={sonarrSeries?.id}/>
                        </div>
                    )}
                </div>

                {/* You May Also Like — always shown below all content */}
                {related && related.length > 0 && (
                    <section className="mt-10 -mx-6 md:-mx-12 lg:-mx-16">
                        <ContentRow title="You May Also Like">
                            {related.map((r: PlexMediaItem) => (
                                <MediaCard key={r.ratingKey} item={r} width={256}/>
                            ))}
                        </ContentRow>
                    </section>
                )}

                {/* Bottom spacer */}
                <div className="h-8"/>
            </div>

            {/* Manual Search Modal */}
            {searchModalProps && (
                <ManualSearchModal
                    isOpen={searchModalOpen}
                    onClose={() => setSearchModalOpen(false)}
                    {...searchModalProps}
                />
            )}
        </div>
    );
}
