import {Input, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useEffect, useMemo, useRef, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import {useSearch} from "../hooks/usePlex.ts";
import {useTmdbSearch} from "../hooks/useDiscover.ts";
import {useDebounce} from "../hooks/useDebounce.ts";
import MediaGrid from "../components/media/MediaGrid.tsx";
import DiscoverCard from "../components/media/DiscoverCard.tsx";
import type {PlexMediaItem} from "../lib/types.ts";

type Filter = "all" | "library" | "movie" | "show" | "episode" | "discover";

const FILTERS: { key: Filter; label: string }[] = [
    {key: "all", label: "All"},
    {key: "library", label: "In Library"},
    {key: "movie", label: "Movies"},
    {key: "show", label: "TV Shows"},
    {key: "episode", label: "Episodes"},
    {key: "discover", label: "Discover"}
];

/** Uppercase rule-underlined section heading. */
function SectionHeader({title, count, note}: { title: string; count: number; note?: string })
{
    return (
        <div className="flex items-baseline gap-3 border-b border-default-100 pb-2.5 mb-3.5">
            <h3 className="text-[13px] font-bold uppercase tracking-wide">{title}</h3>
            <span className="text-[11px] text-default-500">{count} {count === 1 ? "match" : "matches"}</span>
            {note && <span className="ml-auto text-[11px] text-default-500 hidden sm:block">{note}</span>}
        </div>
    );
}

/** Tiny "Movies · 4" label above a group of cards. */
function GroupLabel({label, count}: { label: string; count: number })
{
    return (
        <div className="text-[11px] font-semibold uppercase tracking-wide text-default-500 mb-2.5">
            {label} · {count}
        </div>
    );
}

function FilterChip({label, count, active, onPress}: { label: string; count: number; active: boolean; onPress: () => void })
{
    return (
        <button
            type="button"
            onClick={onPress}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-default-100 bg-content1 text-default-600 hover:text-foreground"
            }`}
        >
            {label}
            <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-primary/20" : "bg-content3"}`}>{count}</span>
        </button>
    );
}

/** Landscape episode result — show, S/E, title, air date and runtime. */
function EpisodeResult({episode}: { episode: PlexMediaItem })
{
    const navigate = useNavigate();
    const thumbUrl = episode.thumb ? `/api/media/${episode.ratingKey}/thumb` : "";
    const season = episode.parentIndex?.toString().padStart(2, "0");
    const number = episode.index?.toString().padStart(2, "0");
    const airDate = episode.originallyAvailableAt
        ? new Date(episode.originallyAvailableAt + "T00:00:00").toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})
        : "";

    return (
        <div
            className="group flex gap-3 rounded-lg border border-default-100 bg-content1 p-2.5 cursor-pointer transition-colors hover:border-default-200"
            onClick={() => navigate(`/detail/${episode.ratingKey}`)}
        >
            <div className="relative w-[140px] shrink-0 aspect-video rounded-md overflow-hidden bg-content2">
                {thumbUrl ? (
                    <img src={thumbUrl} alt={episode.title} className="object-cover w-full h-full" loading="lazy"/>
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <Icon icon="mdi:television" width="24" className="text-default-400"/>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/>
                <span className="absolute bottom-1.5 left-2 text-[10px] font-bold tracking-wide text-white">
                    S{season}·E{number}
                </span>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <Icon icon="mdi:play-circle" width="32" className="text-white drop-shadow-lg"/>
                </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                    <span className="truncate text-[11px] font-semibold text-default-500">{episode.grandparentTitle}</span>
                    <span className="shrink-0 text-[10px] text-default-400">· S{season}E{number}</span>
                </div>
                <p className="truncate text-[13px] font-semibold">{episode.title}</p>
                <p className="truncate text-[11px] text-default-500">
                    {[airDate, episode.duration ? `${Math.round(episode.duration / 60000)}m` : ""].filter(Boolean).join(" · ")}
                </p>
            </div>
        </div>
    );
}

export default function Search()
{
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const inputRef = useRef<HTMLInputElement>(null);
    const debouncedQuery = useDebounce(query, 300);
    const {data: hubs, isLoading} = useSearch(debouncedQuery);
    const {data: tmdbResults, isLoading: tmdbLoading} = useTmdbSearch(debouncedQuery);

    useEffect(() =>
    {
        if (query !== "") return;
        let searchQuery = searchParams.get("q") || undefined;
        if (searchQuery !== undefined) setQuery(searchQuery);
    }, [searchParams]);

    useEffect(() =>
    {
        let searchQuery = searchParams.get("q") || undefined;
        if (query && searchQuery !== query) setSearchParams({q: query});
        else if (!query) setSearchParams({});
    }, [query]);

    // "/" focuses the search field from anywhere on the page
    useEffect(() =>
    {
        const onKeyDown = (e: KeyboardEvent) =>
        {
            if (e.key !== "/" || e.ctrlKey || e.altKey || e.metaKey) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
            e.preventDefault();
            inputRef.current?.focus();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const groups = useMemo(() =>
    {
        const byType = (type: string) => hubs?.find(h => h.hubIdentifier.toLowerCase() === type)?.Metadata ?? [];
        return {
            movies: byType("movie"),
            shows: byType("show"),
            episodes: byType("episode")
        };
    }, [hubs]);

    const tmdbMovies = tmdbResults?.movies ?? [];
    const tmdbTv = tmdbResults?.tv ?? [];

    const counts = {
        library: groups.movies.length + groups.shows.length + groups.episodes.length,
        movie: groups.movies.length,
        show: groups.shows.length,
        episode: groups.episodes.length,
        discover: tmdbMovies.length + tmdbTv.length
    };
    const total = counts.library + counts.discover;

    const show = (section: Filter) => filter === "all" || filter === section ||
        (filter === "library" && (section === "movie" || section === "show" || section === "episode"));

    const showLibrary = counts.library > 0 && (show("movie") || show("show") || show("episode"));
    const showDiscover = counts.discover > 0 && show("discover");
    const anyLoading = isLoading || tmdbLoading;
    const hasResults = counts.library > 0 || counts.discover > 0;

    return (
        <div className="px-6 md:px-12 lg:px-16 py-6">
            <Input
                ref={inputRef}
                placeholder="Search movies, TV shows, and more..."
                value={query}
                onValueChange={setQuery}
                autoFocus
                startContent={<Icon icon="mdi:magnify" width="18" className="text-primary"/>}
                endContent={
                    <div className="flex items-center gap-2">
                        <kbd className="rounded border border-default-200 px-1.5 py-0.5 font-mono text-[10px] text-default-500">/</kbd>
                        {debouncedQuery.length >= 2 && !anyLoading && (
                            <span className="rounded bg-content2 px-1.5 py-0.5 text-[11px] text-default-500 whitespace-nowrap">
                                {total} results
                            </span>
                        )}
                    </div>
                }
                classNames={{
                    inputWrapper: "bg-content1 border border-default-100 data-[focus=true]:border-primary data-[hover=true]:border-default-200 shadow-none",
                    input: "text-sm"
                }}
            />

            {hasResults && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {FILTERS.map(({key, label}) => (
                        <FilterChip
                            key={key}
                            label={label}
                            count={key === "all" ? total : counts[key]}
                            active={filter === key}
                            onPress={() => setFilter(key)}
                        />
                    ))}
                </div>
            )}

            {anyLoading && (
                <div className="flex justify-center py-12">
                    <Spinner size="lg"/>
                </div>
            )}

            {showLibrary && (
                <div className="mt-8">
                    <SectionHeader title="In your library" count={counts.library}/>

                    {show("movie") && groups.movies.length > 0 && (
                        <div className="mb-7">
                            <GroupLabel label="Movies" count={groups.movies.length}/>
                            <MediaGrid items={groups.movies} minWidth={150} maxWidth={180}/>
                        </div>
                    )}

                    {show("show") && groups.shows.length > 0 && (
                        <div className="mb-7">
                            <GroupLabel label="TV Shows" count={groups.shows.length}/>
                            <MediaGrid items={groups.shows} minWidth={150} maxWidth={180}/>
                        </div>
                    )}

                    {show("episode") && groups.episodes.length > 0 && (
                        <div className="mb-7">
                            <GroupLabel label="Episodes" count={groups.episodes.length}/>
                            <div className="grid gap-2.5 md:grid-cols-2">
                                {groups.episodes.map((episode) => (
                                    <EpisodeResult key={episode.ratingKey} episode={episode}/>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showDiscover && (
                <div className="mt-2">
                    <SectionHeader title="Discover" count={counts.discover} note="Not in library — opens Discover page"/>

                    {tmdbMovies.length > 0 && (
                        <div className="mb-7">
                            <GroupLabel label="Movies" count={tmdbMovies.length}/>
                            <div className="grid gap-4" style={{gridTemplateColumns: "repeat(auto-fill, minmax(150px, 180px))"}}>
                                {tmdbMovies.map((item) => (
                                    <DiscoverCard key={item.id} item={item} mediaType="movie" dimmed showDiscoverBadge width={150}/>
                                ))}
                            </div>
                        </div>
                    )}

                    {tmdbTv.length > 0 && (
                        <div className="mb-7">
                            <GroupLabel label="TV Shows" count={tmdbTv.length}/>
                            <div className="grid gap-4" style={{gridTemplateColumns: "repeat(auto-fill, minmax(150px, 180px))"}}>
                                {tmdbTv.map((item) => (
                                    <DiscoverCard key={item.id} item={item} mediaType="tv" dimmed showDiscoverBadge width={150}/>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {debouncedQuery.length >= 2 && !anyLoading && !hasResults && (
                <div className="py-16 text-center">
                    <Icon icon="mdi:magnify" width="48" className="text-default-300 mx-auto mb-3"/>
                    <p className="text-default-400">No results found for "{debouncedQuery}"</p>
                </div>
            )}

            {!debouncedQuery && (
                <div className="py-16 text-center">
                    <Icon icon="mdi:magnify" width="48" className="text-default-300 mx-auto mb-3"/>
                    <p className="text-default-400">Start typing to search your library and discover new content</p>
                </div>
            )}
        </div>
    );
}
