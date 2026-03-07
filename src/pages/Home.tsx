import {Chip, Skeleton} from "@heroui/react";
import {motion} from "framer-motion";
import {Icon} from "@iconify-icon/react";
import {useQuery} from "@tanstack/react-query";
import {
    useContinueWatching,
    useOnDeck,
    useRecentlyAdded,
    useRecommendations,
    useLibraries,
    useLibraryGenres,
    useLibraryByGenre,
    useLibraryCollections,
    useChildren,
    usePlaylists,
} from "../hooks/usePlex.ts";
import {useAuth} from "../providers/AuthProvider.tsx";
import {useNavigate} from "react-router-dom";
import {api} from "../lib/api.ts";
import type {DiscoverResults, PlexMediaItem, PlexLibrary, PlexCollection, PlexPlaylist, TmdbGenreGroup} from "../lib/types.ts";
import {plexImage} from "../lib/utils.ts";
import ContentRow from "../components/layout/ContentRow.tsx";
import MediaCard from "../components/media/MediaCard.tsx";
import HeroCarousel from "../components/media/HeroCarousel.tsx";
import DiscoverCard from "../components/media/DiscoverCard.tsx";

/** Skeleton placeholder matching portrait MediaCard dimensions */
function SkeletonCard({width = 250, landscape}: { width?: number; landscape?: boolean }) {
    const h = landscape ? width / (16 / 9) : width * 1.5;
    return (
        <div className="shrink-0" style={{width}}>
            <Skeleton className="rounded-lg" style={{width, height: h}}/>
            <div className="mt-2 px-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded"/>
                <Skeleton className="h-3 w-1/2 rounded"/>
            </div>
        </div>
    );
}

/** Skeleton placeholder matching DiscoverCard dimensions */
function SkeletonDiscoverCard() {
    return (
        <div className="shrink-0 w-[185px]">
            <Skeleton className="rounded-lg w-[185px] h-[278px]"/>
            <div className="mt-2 px-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded"/>
                <Skeleton className="h-3 w-1/2 rounded"/>
            </div>
        </div>
    );
}

function SkeletonRow({count = 8, width = 250, landscape, title}: { count?: number; width?: number; landscape?: boolean; title: string }) {
    return (
        <ContentRow title={title}>
            {Array.from({length: count}, (_, i) => (
                landscape
                    ? <SkeletonCard key={i} width={width} landscape/>
                    : <SkeletonCard key={i} width={width}/>
            ))}
        </ContentRow>
    );
}

function SkeletonDiscoverRow({count = 8, title}: { count?: number; title: string }) {
    return (
        <ContentRow title={title}>
            {Array.from({length: count}, (_, i) => (
                <SkeletonDiscoverCard key={i}/>
            ))}
        </ContentRow>
    );
}

function GenreRows({library}: { library: PlexLibrary }) {
    const {data: genres, isLoading: genresLoading} = useLibraryGenres(library.key);
    const topGenres = genres?.slice(0, 4) ?? [];
    const genreTitles = topGenres.map(g => g.title);
    const {data: genreGroups, isLoading: itemsLoading} = useLibraryByGenre(library.key, genreTitles);

    const typeSuffix = library.type === "movie" ? "Movies" : "TV Shows";

    if (genresLoading || (genreTitles.length > 0 && itemsLoading)) {
        return (
            <>
                {Array.from({length: 3}, (_, i) => (
                    <SkeletonRow key={`${library.key}-skel-${i}`} title={`${typeSuffix}`}/>
                ))}
            </>
        );
    }

    if (!genreGroups || genreGroups.length === 0) return null;

    return (
        <>
            {genreGroups.map((group) => (
                group.items.length > 0 && (
                    <ContentRow key={`${library.key}-${group.genre}`} title={`${group.genre} ${typeSuffix}`}>
                        {group.items.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} variant="portrait" width={250}/>
                        ))}
                    </ContentRow>
                )
            ))}
        </>
    );
}

function CollectionRow({collection}: { collection: PlexCollection }) {
    const {data: items, isLoading} = useChildren(collection.ratingKey);

    if (isLoading) return <SkeletonRow title={collection.title}/>;
    if (!items || items.length === 0) return null;

    return (
        <ContentRow title={collection.title}>
            {items.map((item) => (
                <MediaCard key={item.ratingKey} item={item} variant="portrait" width={250}/>
            ))}
        </ContentRow>
    );
}

function CollectionRows({library}: { library: PlexLibrary }) {
    const {data: collections, isLoading} = useLibraryCollections(library.key);

    if (isLoading) return <SkeletonRow title={`${library.title} Collections`}/>;
    if (!collections || collections.length === 0) return null;

    return (
        <>
            {collections.map((col) => (
                <CollectionRow key={col.ratingKey} collection={col}/>
            ))}
        </>
    );
}

function PlaylistCard({playlist}: { playlist: PlexPlaylist }) {
    const navigate = useNavigate();
    const imgSrc = plexImage(playlist.composite || playlist.thumb, 300, 450);
    return (
        <motion.div
            whileHover={{scale: 1.05}}
            transition={{type: "tween", duration: 0.2}}
            className="shrink-0 w-[250px] group scroll-snap-start cursor-pointer"
            onClick={() => navigate(`/detail/${playlist.ratingKey}`)}
        >
            <div className="relative w-[250px] h-[375px] rounded-lg overflow-hidden bg-content2">
                {imgSrc ? (
                    <img alt={playlist.title} className="object-cover w-full h-full" src={imgSrc} loading="lazy"/>
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-default-400">
                        <Icon icon="mdi:playlist-play" width="64"/>
                    </div>
                )}
                <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-primary/50 transition-all"/>
                {playlist.leafCount != null && (
                    <div className="absolute bottom-2 right-2">
                        <Chip size="sm" variant="flat" className="bg-black/60 text-white text-xs">
                            {playlist.leafCount} items
                        </Chip>
                    </div>
                )}
            </div>
            <div className="mt-2 px-1">
                <p className="text-sm font-semibold truncate">{playlist.title}</p>
            </div>
        </motion.div>
    );
}

export default function Home() {
    const {isGuest} = useAuth();
    const {data: continueWatching, isLoading: cwLoading} = useContinueWatching();
    const {data: onDeck, isLoading: odLoading} = useOnDeck();
    const {data: recentlyAdded, isLoading: raLoading} = useRecentlyAdded();
    const {data: recommendations, isLoading: recLoading} = useRecommendations();
    const {data: libraries} = useLibraries();

    const {data: playlists, isLoading: playlistsLoading} = usePlaylists();

    const {data: trending, isLoading: trendingLoading} = useQuery({
        queryKey: ["discover", "trending"],
        queryFn: () => api.get<DiscoverResults>("/discover/trending")
    });

    const {data: upcoming, isLoading: upcomingLoading} = useQuery({
        queryKey: ["discover", "upcoming"],
        queryFn: () => api.get<DiscoverResults>("/discover/upcoming")
    });

    const {data: discoverGenres, isLoading: discoverGenresLoading} = useQuery({
        queryKey: ["discover", "byGenre"],
        queryFn: () => api.get<TmdbGenreGroup[]>("/discover/by-genre"),
        staleTime: 60_000,
    });

    // Merge continue watching + on deck, deduplicate by ratingKey (skip for guests)
    const watching: PlexMediaItem[] = [];
    if (!isGuest) {
        const seenKeys = new Set<string>();
        for (const source of [continueWatching, onDeck]) {
            if (source) {
                for (const item of source) {
                    if (!seenKeys.has(item.ratingKey)) {
                        seenKeys.add(item.ratingKey);
                        watching.push(item);
                    }
                }
            }
        }
    }

    const cwReady = !cwLoading || !odLoading;

    // Split recently added into movies vs TV
    const recentMovies = recentlyAdded?.filter((item) => item.type === "movie") || [];
    const recentTV = recentlyAdded?.filter((item) => item.type !== "movie") || [];

    // Collect featured items for the hero carousel (up to 5)
    const featured: PlexMediaItem[] = [];
    const sources = isGuest ? [recentlyAdded] : [continueWatching, onDeck, recentlyAdded];
    for (const source of sources) {
        if (source) {
            for (const item of source) {
                if (featured.length >= 5) break;
                if (!featured.find(f => f.ratingKey === item.ratingKey)) {
                    featured.push(item);
                }
            }
        }
    }

    // Filter libraries to movie + show types for genre rows
    const genreLibraries = libraries?.filter(l => l.type === "movie" || l.type === "show") ?? [];

    return (
        <div>
            {featured.length > 0 && <HeroCarousel items={featured}/>}

            <div className="-mt-32 relative z-10">
                {/* Continue Watching */}
                {!isGuest && !cwReady && (
                    <SkeletonRow title="Continue Watching" width={480} landscape count={4}/>
                )}
                {watching.length > 0 && (
                    <ContentRow title="Continue Watching">
                        {watching.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} showProgress variant="landscape" width={480}/>
                        ))}
                    </ContentRow>
                )}

                {/* Recently Added Movies */}
                {!raLoading && recentMovies.length > 0 && (
                    <ContentRow title="Recently Added Movies">
                        {recentMovies.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} variant="portrait" width={250}/>
                        ))}
                    </ContentRow>
                )}
                {raLoading && <SkeletonRow title="Recently Added Movies"/>}

                {/* Recently Added TV Shows */}
                {!raLoading && recentTV.length > 0 && (
                    <ContentRow title="Recently Added TV Shows">
                        {recentTV.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} variant="portrait" width={250}/>
                        ))}
                    </ContentRow>
                )}
                {raLoading && <SkeletonRow title="Recently Added TV Shows"/>}

                {/* Collections per library */}
                {genreLibraries.map((lib) => (
                    <CollectionRows key={`col-${lib.key}`} library={lib}/>
                ))}

                {/* Playlists */}
                {playlistsLoading && <SkeletonRow title="Your Playlists"/>}
                {!playlistsLoading && playlists && playlists.length > 0 && (
                    <ContentRow title="Your Playlists">
                        {playlists.map((pl) => (
                            <PlaylistCard key={pl.ratingKey} playlist={pl}/>
                        ))}
                    </ContentRow>
                )}

                {/* Recommendations: "Because You Watched X" rows */}
                {!isGuest && recLoading && (
                    <>
                        <SkeletonRow title="Recommended For You"/>
                        <SkeletonRow title="Recommended For You"/>
                    </>
                )}
                {!isGuest && recommendations?.map((rec) => (
                    rec.items.length > 0 && (
                        <ContentRow key={rec.title} title={rec.title}>
                            {rec.items.map((item) => (
                                <MediaCard key={item.ratingKey} item={item} variant="portrait" width={250}/>
                            ))}
                        </ContentRow>
                    )
                ))}

                {/* Genre rows per library */}
                {genreLibraries.map((lib) => (
                    <GenreRows key={lib.key} library={lib}/>
                ))}

                {/* Trending Movies */}
                {trendingLoading && <SkeletonDiscoverRow title="Trending Movies"/>}
                {trending?.movies && trending.movies.length > 0 && (
                    <ContentRow title="Trending Movies">
                        {trending.movies.map((item) => (
                            <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                        ))}
                    </ContentRow>
                )}

                {/* Trending TV Shows */}
                {trendingLoading && <SkeletonDiscoverRow title="Trending TV Shows"/>}
                {trending?.tv && trending.tv.length > 0 && (
                    <ContentRow title="Trending TV Shows">
                        {trending.tv.map((item) => (
                            <DiscoverCard key={item.id} item={item} mediaType="tv"/>
                        ))}
                    </ContentRow>
                )}

                {/* Discover by Genre (TMDB) */}
                {discoverGenresLoading && (
                    <>
                        <SkeletonDiscoverRow title="Action Movies"/>
                        <SkeletonDiscoverRow title="Comedy Movies"/>
                        <SkeletonDiscoverRow title="Sci-Fi Movies"/>
                    </>
                )}
                {discoverGenres?.map((group) => (
                    group.items.length > 0 && (
                        <ContentRow key={`tmdb-${group.genre_id}`} title={`${group.genre} Movies`}>
                            {group.items.map((item) => (
                                <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                            ))}
                        </ContentRow>
                    )
                ))}

                {/* Upcoming Movies */}
                {upcomingLoading && <SkeletonDiscoverRow title="Upcoming Movies"/>}
                {upcoming?.movies && upcoming.movies.length > 0 && (
                    <ContentRow title="Upcoming Movies">
                        {upcoming.movies.map((item) => (
                            <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                        ))}
                    </ContentRow>
                )}
            </div>
        </div>
    );
}
