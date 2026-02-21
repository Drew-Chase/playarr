import {useState} from "react";
import {
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Button, Select, SelectItem, Checkbox, Input,
} from "@heroui/react";
import {useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {api} from "../../lib/api.ts";
import {tmdbImage} from "../../lib/utils.ts";
import {
    useSonarrProfiles, useSonarrRootFolders,
    useRadarrProfiles, useRadarrRootFolders,
} from "../../hooks/useDiscover.ts";
import type {TmdbMovieDetail, TmdbTvDetail} from "../../lib/types.ts";

interface RequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    mediaType: "movie" | "tv";
    movie?: TmdbMovieDetail;
    tv?: TmdbTvDetail;
}

const MONITOR_OPTIONS_TV = [
    {key: "all", label: "All Episodes"},
    {key: "future", label: "Future Episodes"},
    {key: "missing", label: "Missing Episodes"},
    {key: "existing", label: "Existing Episodes"},
    {key: "firstSeason", label: "First Season"},
    {key: "lastSeason", label: "Last Season"},
    {key: "none", label: "None"},
];

const MONITOR_OPTIONS_MOVIE = [
    {key: "movieOnly", label: "Movie Only"},
    {key: "movieAndCollection", label: "Movie and Collection"},
    {key: "none", label: "None"},
];

const AVAILABILITY_OPTIONS = [
    {key: "released", label: "Released"},
    {key: "announced", label: "Announced"},
    {key: "inCinemas", label: "In Cinemas"},
];

const SERIES_TYPE_OPTIONS = [
    {key: "standard", label: "Standard", description: "Season and episode numbers (S01E05)"},
    {key: "daily", label: "Daily", description: "Date-based (2025-01-15)"},
    {key: "anime", label: "Anime", description: "Absolute episode numbers"},
];

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function RequestModal({isOpen, onClose, mediaType, movie, tv}: RequestModalProps) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Movie state
    const [movieMonitor, setMovieMonitor] = useState("movieOnly");
    const [movieAvailability, setMovieAvailability] = useState("released");
    const [movieSearchOnAdd, setMovieSearchOnAdd] = useState(true);

    // TV state
    const [tvMonitor, setTvMonitor] = useState("all");
    const [seriesType, setSeriesType] = useState("standard");
    const [seasonFolder, setSeasonFolder] = useState(true);
    const [tvSearchOnAdd, setTvSearchOnAdd] = useState(true);
    const [tvSearchCutoff, setTvSearchCutoff] = useState(false);

    // Shared state
    const [qualityProfileId, setQualityProfileId] = useState<string>("");
    const [rootFolderPath, setRootFolderPath] = useState<string>("");
    const [tags, setTags] = useState("");

    // Fetch profiles and root folders
    const {data: sonarrProfiles} = useSonarrProfiles();
    const {data: sonarrRootFolders} = useSonarrRootFolders();
    const {data: radarrProfiles} = useRadarrProfiles();
    const {data: radarrRootFolders} = useRadarrRootFolders();

    const profiles = mediaType === "movie" ? radarrProfiles : sonarrProfiles;
    const rootFolders = mediaType === "movie" ? radarrRootFolders : sonarrRootFolders;

    const title = mediaType === "movie" ? movie?.title : tv?.name;
    const year = mediaType === "movie"
        ? movie?.release_date?.slice(0, 4)
        : tv?.first_air_date?.slice(0, 4);
    const overview = mediaType === "movie" ? movie?.overview : tv?.overview;
    const posterPath = mediaType === "movie" ? movie?.poster_path : tv?.poster_path;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (mediaType === "movie" && movie) {
                await api.post("/radarr/movie", {
                    tmdbId: movie.id,
                    title: movie.title,
                    qualityProfileId: qualityProfileId ? Number(qualityProfileId) : profiles?.[0]?.id ?? 1,
                    rootFolderPath: rootFolderPath || rootFolders?.[0]?.path || "/movies",
                    monitored: movieMonitor !== "none",
                    minimumAvailability: movieAvailability,
                    addOptions: {
                        searchForMovie: movieSearchOnAdd,
                        monitor: movieMonitor,
                    },
                });
                toast.success(`Added "${movie.title}" to Radarr`);
            } else if (mediaType === "tv" && tv) {
                await api.post("/sonarr/series", {
                    tvdbId: tv.external_ids?.tvdb_id || tv.id,
                    title: tv.name,
                    qualityProfileId: qualityProfileId ? Number(qualityProfileId) : profiles?.[0]?.id ?? 1,
                    rootFolderPath: rootFolderPath || rootFolders?.[0]?.path || "/tv",
                    monitored: tvMonitor !== "none",
                    seriesType: seriesType,
                    seasonFolder: seasonFolder,
                    addOptions: {
                        monitor: tvMonitor,
                        searchForMissingEpisodes: tvSearchOnAdd,
                        searchForCutoffUnmetEpisodes: tvSearchCutoff,
                    },
                });
                toast.success(`Added "${tv.name}" to Sonarr`);
            }
            await queryClient.invalidateQueries({queryKey: ["sonarr", "series"]});
            await queryClient.invalidateQueries({queryKey: ["radarr", "movies"]});
            onClose();
        } catch (err) {
            toast.error(`Failed to add "${title}": ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <span>{title} {year && `(${year})`}</span>
                </ModalHeader>
                <ModalBody>
                    {/* Header with poster + overview */}
                    <div className="flex gap-4 mb-4">
                        {posterPath && (
                            <img
                                src={tmdbImage(posterPath, "w185")}
                                alt={title}
                                className="w-[120px] h-[180px] object-cover rounded-lg shrink-0"
                            />
                        )}
                        <p className="text-sm text-default-500 line-clamp-6">{overview}</p>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-4">
                        {/* Root Folder */}
                        <Select
                            label="Root Folder"
                            selectedKeys={rootFolderPath ? [rootFolderPath] : (rootFolders?.[0]?.path ? [rootFolders[0].path] : [])}
                            onSelectionChange={(keys) => {
                                const val = Array.from(keys)[0] as string;
                                if (val) setRootFolderPath(val);
                            }}
                            size="sm"
                        >
                            {(rootFolders || []).map((rf) => (
                                <SelectItem key={rf.path} textValue={rf.path}>
                                    <div className="flex justify-between items-center w-full">
                                        <span>{rf.path}</span>
                                        <span className="text-xs text-default-400">{formatBytes(rf.freeSpace)} Free</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </Select>

                        {/* Monitor */}
                        <Select
                            label="Monitor"
                            selectedKeys={[mediaType === "movie" ? movieMonitor : tvMonitor]}
                            onSelectionChange={(keys) => {
                                const val = Array.from(keys)[0] as string;
                                if (val) {
                                    if (mediaType === "movie") setMovieMonitor(val);
                                    else setTvMonitor(val);
                                }
                            }}
                            size="sm"
                        >
                            {(mediaType === "movie" ? MONITOR_OPTIONS_MOVIE : MONITOR_OPTIONS_TV).map((opt) => (
                                <SelectItem key={opt.key}>{opt.label}</SelectItem>
                            ))}
                        </Select>

                        {/* Minimum Availability (movie only) */}
                        {mediaType === "movie" && (
                            <Select
                                label="Minimum Availability"
                                selectedKeys={[movieAvailability]}
                                onSelectionChange={(keys) => {
                                    const val = Array.from(keys)[0] as string;
                                    if (val) setMovieAvailability(val);
                                }}
                                size="sm"
                            >
                                {AVAILABILITY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.key}>{opt.label}</SelectItem>
                                ))}
                            </Select>
                        )}

                        {/* Quality Profile */}
                        <Select
                            label="Quality Profile"
                            selectedKeys={qualityProfileId ? [qualityProfileId] : (profiles?.[0] ? [String(profiles[0].id)] : [])}
                            onSelectionChange={(keys) => {
                                const val = Array.from(keys)[0] as string;
                                if (val) setQualityProfileId(val);
                            }}
                            size="sm"
                        >
                            {(profiles || []).map((p) => (
                                <SelectItem key={String(p.id)}>{p.name}</SelectItem>
                            ))}
                        </Select>

                        {/* Series Type (TV only) */}
                        {mediaType === "tv" && (
                            <Select
                                label="Series Type"
                                selectedKeys={[seriesType]}
                                onSelectionChange={(keys) => {
                                    const val = Array.from(keys)[0] as string;
                                    if (val) setSeriesType(val);
                                }}
                                size="sm"
                            >
                                {SERIES_TYPE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.key} textValue={opt.label}>
                                        <div>
                                            <span>{opt.label}</span>
                                            <span className="text-xs text-default-400 ml-2">{opt.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </Select>
                        )}

                        {/* Season Folder (TV only) */}
                        {mediaType === "tv" && (
                            <Checkbox isSelected={seasonFolder} onValueChange={setSeasonFolder} size="sm">
                                Season Folder
                            </Checkbox>
                        )}

                        {/* Tags */}
                        <Input
                            label="Tags"
                            placeholder="Comma-separated tags"
                            value={tags}
                            onValueChange={setTags}
                            size="sm"
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <div className="flex flex-col w-full gap-3">
                        {/* Search options */}
                        <div className="flex flex-col gap-1">
                            {mediaType === "movie" ? (
                                <Checkbox isSelected={movieSearchOnAdd} onValueChange={setMovieSearchOnAdd} size="sm">
                                    Start search for missing movie
                                </Checkbox>
                            ) : (
                                <>
                                    <Checkbox isSelected={tvSearchOnAdd} onValueChange={setTvSearchOnAdd} size="sm">
                                        Start search for missing episodes
                                    </Checkbox>
                                    <Checkbox isSelected={tvSearchCutoff} onValueChange={setTvSearchCutoff} size="sm">
                                        Start search for cutoff unmet episodes
                                    </Checkbox>
                                </>
                            )}
                        </div>
                        <Button
                            color="success"
                            onPress={handleSubmit}
                            isLoading={isSubmitting}
                            className="font-semibold"
                        >
                            {mediaType === "movie" ? "Add Movie" : `Add ${title || "Series"}`}
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
