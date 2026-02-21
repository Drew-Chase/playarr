import {useParams, useNavigate} from "react-router-dom";
import {useRef, useState, useMemo} from "react";
import {Button, Spinner, Chip, Modal, ModalContent, ModalBody, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {api} from "../lib/api.ts";
import {tmdbImage} from "../lib/utils.ts";
import {
    useTmdbMovieDetail,
    useTmdbTvDetail,
    useTmdbSeason,
    useSonarrSeriesByTmdb,
    useRadarrMovieByTmdb,
    useSonarrEpisodes,
} from "../hooks/useDiscover.ts";
import RequestModal from "../components/discover/RequestModal.tsx";
import ManualSearchModal from "../components/discover/ManualSearchModal.tsx";
import type {TmdbCastMember, TmdbVideo, TmdbSeasonSummary, SonarrEpisode} from "../lib/types.ts";

function CastSection({cast}: { cast: TmdbCastMember[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!cast || cast.length === 0) return null;

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const amount = scrollRef.current.clientWidth * 0.8;
        scrollRef.current.scrollBy({left: direction === "left" ? -amount : amount, behavior: "smooth"});
    };

    return (
        <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Cast</h2>
            <div className="relative group/cast">
                <button
                    onClick={() => scroll("left")}
                    className="absolute -left-4 top-1/3 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/cast:opacity-100 transition-opacity hover:bg-black/80"
                >
                    <Icon icon="mdi:chevron-left" width="28" className="text-white"/>
                </button>
                <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-2" style={{scrollbarWidth: "none"}}>
                    {cast.slice(0, 20).map((person) => (
                        <div key={person.id} className="flex-shrink-0 w-[120px] text-center">
                            <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-content2 mx-auto">
                                {person.profile_path ? (
                                    <img
                                        src={tmdbImage(person.profile_path, "w185")}
                                        alt={person.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Icon icon="mdi:account" width="48" className="text-default-400"/>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm font-medium mt-2 truncate">{person.name}</p>
                            <p className="text-xs text-default-400 truncate">{person.character}</p>
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

function SeasonCard({
    season,
    tmdbId,
    sonarrSeriesId,
    sonarrEpisodes,
}: {
    season: TmdbSeasonSummary;
    tmdbId: string;
    sonarrSeriesId?: number;
    sonarrEpisodes?: SonarrEpisode[];
}) {
    const [expanded, setExpanded] = useState(false);
    const queryClient = useQueryClient();
    const {data: seasonDetail, isLoading} = useTmdbSeason(
        expanded ? tmdbId : undefined,
        expanded ? season.season_number : undefined,
    );

    // Get Sonarr episodes for this season
    const seasonEpisodes = useMemo(() =>
        sonarrEpisodes?.filter(e => e.seasonNumber === season.season_number) || [],
    [sonarrEpisodes, season.season_number]);

    const monitoredCount = seasonEpisodes.filter(e => e.monitored).length;
    const hasFileCount = seasonEpisodes.filter(e => e.hasFile).length;
    const isFullyMonitored = seasonEpisodes.length > 0 && monitoredCount === seasonEpisodes.length;

    const handleToggleSeasonMonitor = async () => {
        if (!sonarrSeriesId || seasonEpisodes.length === 0) return;
        const newMonitored = !isFullyMonitored;
        try {
            await api.put("/sonarr/episode/monitor", {
                episodeIds: seasonEpisodes.map(e => e.id),
                monitored: newMonitored,
            });
            await queryClient.invalidateQueries({queryKey: ["sonarr", "episodes", sonarrSeriesId]});
            toast.success(`${newMonitored ? "Monitoring" : "Unmonitoring"} ${season.name}`);
        } catch {
            toast.error("Failed to update monitoring");
        }
    };

    const [manualSearchOpen, setManualSearchOpen] = useState(false);

    const handleSearchSeason = async () => {
        if (!sonarrSeriesId) return;
        try {
            await api.post("/sonarr/command", {
                name: "SeasonSearch",
                seriesId: sonarrSeriesId,
                seasonNumber: season.season_number,
            });
            toast.success(`Searching for ${season.name}`);
        } catch {
            toast.error("Failed to trigger search");
        }
    };

    return (
        <>
        <div className="bg-content2 rounded-lg overflow-hidden">
            <div
                className="flex items-center gap-4 p-3 cursor-pointer hover:bg-content3 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {season.poster_path ? (
                    <img
                        src={tmdbImage(season.poster_path, "w92")}
                        alt={season.name}
                        className="w-12 h-18 object-cover rounded shrink-0"
                    />
                ) : (
                    <div className="w-12 h-18 bg-content3 rounded flex items-center justify-center shrink-0">
                        <Icon icon="mdi:folder" width="24" className="text-default-400"/>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{season.name}</p>
                    <p className="text-xs text-default-400">
                        {season.episode_count} episode{season.episode_count !== 1 ? "s" : ""}
                        {season.air_date && ` \u00b7 ${season.air_date.slice(0, 4)}`}
                    </p>
                    {sonarrSeriesId && seasonEpisodes.length > 0 && (
                        <p className="text-xs text-default-500 mt-0.5">
                            {hasFileCount}/{seasonEpisodes.length} downloaded
                            {" \u00b7 "}{monitoredCount} monitored
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {sonarrSeriesId && seasonEpisodes.length > 0 && (
                        <>
                            <Tooltip content={isFullyMonitored ? "Unmonitor season" : "Monitor season"}>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={(e) => { e.continuePropagation?.(); handleToggleSeasonMonitor(); }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Icon
                                        icon={isFullyMonitored ? "mdi:bookmark" : "mdi:bookmark-outline"}
                                        width="18"
                                        className={isFullyMonitored ? "text-primary" : "text-default-400"}
                                    />
                                </Button>
                            </Tooltip>
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Icon icon="mdi:dots-vertical" width="18" className="text-default-400"/>
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Season actions" onAction={(key) => {
                                    if (key === "auto-search") handleSearchSeason();
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
                        </>
                    )}
                    <Icon
                        icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
                        width="20"
                        className="text-default-400"
                    />
                </div>
            </div>
            {expanded && (
                <div className="border-t border-divider">
                    {isLoading ? (
                        <div className="flex justify-center py-4"><Spinner size="sm"/></div>
                    ) : (
                        <div className="divide-y divide-divider">
                            {seasonDetail?.episodes?.map((ep) => {
                                const sonarrEp = seasonEpisodes.find(se => se.episodeNumber === ep.episode_number);
                                return (
                                    <EpisodeRow
                                        key={ep.id}
                                        episodeNumber={ep.episode_number}
                                        name={ep.name}
                                        overview={ep.overview}
                                        airDate={ep.air_date}
                                        runtime={ep.runtime}
                                        stillPath={ep.still_path}
                                        sonarrEpisode={sonarrEp}
                                        sonarrSeriesId={sonarrSeriesId}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
        {sonarrSeriesId && (
            <ManualSearchModal
                isOpen={manualSearchOpen}
                onClose={() => setManualSearchOpen(false)}
                title={`Search: ${season.name}`}
                sonarrSeriesId={sonarrSeriesId}
                sonarrSeasonNumber={season.season_number}
            />
        )}
        </>
    );
}

function EpisodeRow({
    episodeNumber,
    name,
    overview,
    airDate,
    runtime,
    stillPath,
    sonarrEpisode,
    sonarrSeriesId,
}: {
    episodeNumber: number;
    name: string;
    overview: string;
    airDate: string | null;
    runtime: number | null;
    stillPath: string | null;
    sonarrEpisode?: SonarrEpisode;
    sonarrSeriesId?: number;
}) {
    const queryClient = useQueryClient();
    const [manualSearchOpen, setManualSearchOpen] = useState(false);

    const handleToggleMonitor = async () => {
        if (!sonarrEpisode || !sonarrSeriesId) return;
        try {
            await api.put("/sonarr/episode/monitor", {
                episodeIds: [sonarrEpisode.id],
                monitored: !sonarrEpisode.monitored,
            });
            await queryClient.invalidateQueries({queryKey: ["sonarr", "episodes", sonarrSeriesId]});
        } catch {
            toast.error("Failed to update episode monitoring");
        }
    };

    const handleSearchEpisode = async () => {
        if (!sonarrEpisode) return;
        try {
            await api.post("/sonarr/command", {
                name: "EpisodeSearch",
                episodeIds: [sonarrEpisode.id],
            });
            toast.success(`Searching for E${String(episodeNumber).padStart(2, "0")}`);
        } catch {
            toast.error("Failed to trigger search");
        }
    };

    return (
        <>
            <div className="flex items-center gap-3 p-3 hover:bg-content3/50 transition-colors">
                {/* Thumbnail */}
                {stillPath ? (
                    <img
                        src={tmdbImage(stillPath, "w185")}
                        alt={name}
                        className="w-24 h-14 object-cover rounded shrink-0"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-24 h-14 bg-content3 rounded flex items-center justify-center shrink-0">
                        <Icon icon="mdi:television" width="24" className="text-default-400"/>
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-default-500">E{String(episodeNumber).padStart(2, "0")}</span>
                        <p className="text-sm font-medium truncate">{name}</p>
                        {sonarrEpisode?.hasFile && (
                            <Icon icon="mdi:check-circle" width="14" className="text-success shrink-0"/>
                        )}
                    </div>
                    <p className="text-xs text-default-400 line-clamp-1">{overview}</p>
                    <div className="flex gap-2 text-xs text-default-500 mt-0.5">
                        {airDate && <span>{airDate}</span>}
                        {runtime && <span>{runtime}m</span>}
                    </div>
                </div>

                {sonarrEpisode && (
                    <div className="flex items-center gap-1 shrink-0">
                        <Tooltip content={sonarrEpisode.monitored ? "Unmonitor" : "Monitor"}>
                            <Button isIconOnly size="sm" variant="light" onPress={handleToggleMonitor}>
                                <Icon
                                    icon={sonarrEpisode.monitored ? "mdi:bookmark" : "mdi:bookmark-outline"}
                                    width="16"
                                    className={sonarrEpisode.monitored ? "text-primary" : "text-default-400"}
                                />
                            </Button>
                        </Tooltip>
                        <Dropdown>
                            <DropdownTrigger>
                                <Button isIconOnly size="sm" variant="light">
                                    <Icon icon="mdi:dots-vertical" width="16" className="text-default-400"/>
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Episode actions" onAction={(key) => {
                                if (key === "auto-search") handleSearchEpisode();
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
                )}
            </div>
            {sonarrEpisode && (
                <ManualSearchModal
                    isOpen={manualSearchOpen}
                    onClose={() => setManualSearchOpen(false)}
                    title={`Search: E${String(episodeNumber).padStart(2, "0")} - ${name}`}
                    sonarrEpisodeId={sonarrEpisode.id}
                />
            )}
        </>
    );
}

export default function DiscoverDetail() {
    const {mediaType, tmdbId} = useParams<{ mediaType: string; tmdbId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [manualSearchOpen, setManualSearchOpen] = useState(false);
    const [youtubeOpen, setYoutubeOpen] = useState(false);
    const [selectedTrailer, setSelectedTrailer] = useState<TmdbVideo | null>(null);

    const isMovie = mediaType === "movie";
    const isTv = mediaType === "tv";

    const {data: movie, isLoading: movieLoading} = useTmdbMovieDetail(isMovie ? tmdbId : undefined);
    const {data: tv, isLoading: tvLoading} = useTmdbTvDetail(isTv ? tmdbId : undefined);

    const radarrMovie = useRadarrMovieByTmdb(isMovie ? Number(tmdbId) : undefined);
    const sonarrSeries = useSonarrSeriesByTmdb(isTv ? Number(tmdbId) : undefined);

    const {data: sonarrEpisodes} = useSonarrEpisodes(sonarrSeries?.id);

    const isInLibrary = isMovie ? !!radarrMovie : !!sonarrSeries;
    const isLoading = movieLoading || tvLoading;

    const title = isMovie ? movie?.title : tv?.name;
    const overview = isMovie ? movie?.overview : tv?.overview;
    const tagline = isMovie ? movie?.tagline : tv?.tagline;
    const rating = isMovie ? movie?.vote_average : tv?.vote_average;
    const genres = isMovie ? movie?.genres : tv?.genres;
    const backdropPath = isMovie ? movie?.backdrop_path : tv?.backdrop_path;
    const posterPath = isMovie ? movie?.poster_path : tv?.poster_path;
    const year = isMovie ? movie?.release_date?.slice(0, 4) : tv?.first_air_date?.slice(0, 4);
    const cast = isMovie ? movie?.credits?.cast : tv?.credits?.cast;
    const directors = isMovie ? movie?.credits?.crew?.filter(c => c.job === "Director") : [];
    const videos = isMovie ? movie?.videos?.results : tv?.videos?.results;
    const trailer = videos?.find(v => v.type === "Trailer" && v.site === "YouTube")
        || videos?.find(v => v.type === "Teaser" && v.site === "YouTube");

    const handleSearchAll = async () => {
        try {
            if (isMovie && radarrMovie) {
                await api.post("/radarr/command", {name: "MoviesSearch", movieIds: [radarrMovie.id]});
                toast.success(`Searching for "${title}"`);
            } else if (isTv && sonarrSeries) {
                await api.post("/sonarr/command", {name: "SeriesSearch", seriesId: sonarrSeries.id});
                toast.success(`Searching for "${title}"`);
            }
        } catch {
            toast.error("Failed to trigger search");
        }
    };

    const handleToggleMovieMonitor = async () => {
        if (!radarrMovie) return;
        try {
            await api.put(`/radarr/movie/${radarrMovie.id}`, {...radarrMovie, monitored: !radarrMovie.monitored});
            await queryClient.invalidateQueries({queryKey: ["radarr", "movies"]});
            toast.success(radarrMovie.monitored ? "Unmonitored" : "Monitoring");
        } catch {
            toast.error("Failed to update monitoring");
        }
    };

    const handleToggleSeriesMonitor = async () => {
        if (!sonarrSeries) return;
        try {
            await api.put(`/sonarr/series/${sonarrSeries.id}`, {...sonarrSeries, monitored: !sonarrSeries.monitored});
            await queryClient.invalidateQueries({queryKey: ["sonarr", "series"]});
            toast.success(sonarrSeries.monitored ? "Unmonitored" : "Monitoring");
        } catch {
            toast.error("Failed to update monitoring");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    if ((isMovie && !movie) || (isTv && !tv)) {
        return <p className="text-center text-default-400 py-12">Not found</p>;
    }

    return (
        <div>
            {/* Hero background */}
            <div className="relative w-full h-[50vh] -mt-16 min-h-[700px]">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: backdropPath ? `url(${tmdbImage(backdropPath, "w1280")})` : undefined,
                    }}
                />
                <div className="absolute inset-0 hero-gradient-bottom"/>
                <div className="absolute inset-0 hero-gradient-left opacity-40"/>
            </div>

            {/* Content */}
            <div className="relative z-10 -mt-96 px-6 md:px-12 lg:px-16">
                {/* Back button */}
                <Button
                    variant="light"
                    size="sm"
                    startContent={<Icon icon="mdi:arrow-left" width="18"/>}
                    onPress={() => navigate("/discover")}
                    className="mb-4 text-white/80 hover:text-white"
                >
                    Back to Discover
                </Button>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Poster */}
                    {posterPath && (
                        <div className="shrink-0">
                            <img
                                src={tmdbImage(posterPath, "w500")}
                                alt={title}
                                className="h-[600px] object-cover rounded-lg shadow-2xl"
                            />
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="flex-1 pt-4 md:pt-12">
                        <h1 className="text-4xl font-bold">{title}</h1>
                        {tagline && <p className="text-lg text-default-400 mt-1 italic">{tagline}</p>}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-default-400">
                            {year && <span>{year}</span>}
                            {isMovie && movie?.runtime && <span>{movie.runtime}m</span>}
                            {isTv && tv && <span>{tv.number_of_seasons} season{tv.number_of_seasons !== 1 ? "s" : ""}</span>}
                            {rating && rating > 0 && (
                                <span className="flex items-center gap-1">
                                    <Icon icon="mdi:star" width="14" className="text-yellow-500"/>
                                    {rating.toFixed(1)}
                                </span>
                            )}
                            {isInLibrary && (
                                <Chip size="sm" color="success" variant="flat">
                                    <span className="flex items-center gap-1">
                                        <Icon icon="mdi:check" width="12"/>
                                        In Library
                                    </span>
                                </Chip>
                            )}
                        </div>

                        {/* Genres */}
                        {genres && genres.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {genres.map(g => (
                                    <Chip key={g.id} size="sm" variant="flat" className="text-xs">{g.name}</Chip>
                                ))}
                            </div>
                        )}

                        {/* Directors (movie) */}
                        {directors && directors.length > 0 && (
                            <div className="flex gap-2 text-sm mt-3">
                                <span className="text-default-500">Directed by</span>
                                <span className="text-default-600 font-bold">{directors.map(d => d.name).join(", ")}</span>
                            </div>
                        )}

                        {/* Overview */}
                        {overview && <p className="text-default-300 mt-4 leading-relaxed max-w-3xl">{overview}</p>}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 mt-5">
                            {!isInLibrary ? (
                                <Button
                                    color="success"
                                    radius="sm"
                                    size="lg"
                                    startContent={<Icon icon="mdi:plus" width="24"/>}
                                    onPress={() => setShowRequestModal(true)}
                                    className="font-semibold"
                                >
                                    Request
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        color="primary"
                                        radius="sm"
                                        size="lg"
                                        startContent={<Icon icon="mdi:magnify" width="24"/>}
                                        onPress={handleSearchAll}
                                        className="font-semibold"
                                    >
                                        Search
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        radius="sm"
                                        size="lg"
                                        startContent={<Icon icon="mdi:text-search" width="20"/>}
                                        onPress={() => setManualSearchOpen(true)}
                                        className="border-2 border-white/90"
                                    >
                                        Manual Search
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        radius="sm"
                                        size="lg"
                                        startContent={
                                            <Icon
                                                icon={(isMovie ? radarrMovie?.monitored : sonarrSeries?.monitored) ? "mdi:bookmark" : "mdi:bookmark-outline"}
                                                width="20"
                                            />
                                        }
                                        onPress={isMovie ? handleToggleMovieMonitor : handleToggleSeriesMonitor}
                                        className="border-2 border-white/90"
                                    >
                                        {(isMovie ? radarrMovie?.monitored : sonarrSeries?.monitored) ? "Monitored" : "Unmonitored"}
                                    </Button>
                                </>
                            )}
                            {trailer && (
                                <Button
                                    variant="ghost"
                                    radius="sm"
                                    size="lg"
                                    startContent={<Icon icon="mdi:play-outline" width="20"/>}
                                    onPress={() => {
                                        setSelectedTrailer(trailer);
                                        setYoutubeOpen(true);
                                    }}
                                    className="border-2 border-white/90"
                                >
                                    Trailer
                                </Button>
                            )}
                        </div>

                        {/* Library status info */}
                        {isMovie && radarrMovie && (
                            <div className="flex gap-4 mt-4 text-sm text-default-400">
                                <span>Status: {radarrMovie.hasFile ? "Downloaded" : "Missing"}</span>
                                <span>Quality: {radarrMovie.qualityProfileId}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cast */}
                {cast && cast.length > 0 && <CastSection cast={cast}/>}

                {/* Seasons (TV only) */}
                {isTv && tv && tv.seasons && tv.seasons.length > 0 && (
                    <section className="mt-10">
                        <h2 className="text-xl font-semibold mb-4">
                            Seasons
                            {sonarrSeries && (
                                <span className="text-sm font-normal text-default-400 ml-2">
                                    (managed by Sonarr)
                                </span>
                            )}
                        </h2>
                        <div className="space-y-2">
                            {tv.seasons
                                .filter((s: TmdbSeasonSummary) => s.season_number > 0)
                                .map((season: TmdbSeasonSummary) => (
                                    <SeasonCard
                                        key={season.id}
                                        season={season}
                                        tmdbId={tmdbId!}
                                        sonarrSeriesId={sonarrSeries?.id}
                                        sonarrEpisodes={sonarrEpisodes}
                                    />
                                ))}
                            {/* Specials at the end */}
                            {tv.seasons
                                .filter((s: TmdbSeasonSummary) => s.season_number === 0)
                                .map((season: TmdbSeasonSummary) => (
                                    <SeasonCard
                                        key={season.id}
                                        season={season}
                                        tmdbId={tmdbId!}
                                        sonarrSeriesId={sonarrSeries?.id}
                                        sonarrEpisodes={sonarrEpisodes}
                                    />
                                ))}
                        </div>
                    </section>
                )}

                {/* Bottom spacer */}
                <div className="h-8"/>
            </div>

            {/* Request Modal */}
            <RequestModal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                mediaType={isMovie ? "movie" : "tv"}
                movie={movie}
                tv={tv}
            />

            {/* Manual Search Modal */}
            {isInLibrary && (
                <ManualSearchModal
                    isOpen={manualSearchOpen}
                    onClose={() => setManualSearchOpen(false)}
                    title={`Search: ${title}`}
                    {...(isMovie && radarrMovie ? {radarrMovieId: radarrMovie.id} : {})}
                    {...(isTv && sonarrSeries ? {sonarrSeriesId: sonarrSeries.id} : {})}
                />
            )}

            {/* YouTube Trailer Modal */}
            {selectedTrailer && (
                <Modal isOpen={youtubeOpen} onClose={() => setYoutubeOpen(false)} size="5xl" backdrop="blur">
                    <ModalContent>
                        <ModalBody className="p-0">
                            <video
                                className="w-full rounded-lg"
                                src={`/api/discover/youtube-stream/${selectedTrailer.key}`}
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
