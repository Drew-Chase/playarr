import {Spinner} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {useContinueWatching, useOnDeck, useRecentlyAdded} from "../hooks/usePlex.ts";
import {api} from "../lib/api.ts";
import type {DiscoverResults, PlexMediaItem} from "../lib/types.ts";
import ContentRow from "../components/layout/ContentRow.tsx";
import MediaCard from "../components/media/MediaCard.tsx";
import HeroCarousel from "../components/media/HeroCarousel.tsx";
import DiscoverCard from "../components/media/DiscoverCard.tsx";

export default function Home()
{
    const {data: continueWatching, isLoading: cwLoading} = useContinueWatching();
    const {data: onDeck, isLoading: odLoading} = useOnDeck();
    const {data: recentlyAdded, isLoading: raLoading} = useRecentlyAdded();

    const {data: trending} = useQuery({
        queryKey: ["discover", "trending"],
        queryFn: () => api.get<DiscoverResults>("/discover/trending")
    });

    const {data: upcoming} = useQuery({
        queryKey: ["discover", "upcoming"],
        queryFn: () => api.get<DiscoverResults>("/discover/upcoming")
    });

    const isLoading = cwLoading && odLoading && raLoading;

    if (isLoading)
    {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    // Merge continue watching + on deck, deduplicate by ratingKey
    const watching: PlexMediaItem[] = [];
    const seenKeys = new Set<string>();
    for (const source of [continueWatching, onDeck])
    {
        if (source)
        {
            for (const item of source)
            {
                if (!seenKeys.has(item.ratingKey))
                {
                    seenKeys.add(item.ratingKey);
                    watching.push(item);
                }
            }
        }
    }

    // Split recently added into movies vs TV
    const recentMovies = recentlyAdded?.filter((item) => item.type === "movie") || [];
    const recentTV = recentlyAdded?.filter((item) => item.type !== "movie") || [];

    // Collect featured items for the hero carousel (up to 5)
    const featured: PlexMediaItem[] = [];
    const sources = [continueWatching, onDeck, recentlyAdded];
    for (const source of sources)
    {
        if (source)
        {
            for (const item of source)
            {
                if (featured.length >= 5) break;
                if (!featured.find(f => f.ratingKey === item.ratingKey))
                {
                    featured.push(item);
                }
            }
        }
    }

    return (
        <div>
            {featured.length > 0 && <HeroCarousel items={featured}/>}

            <div className="-mt-32 relative z-10">
                {watching.length > 0 && (
                    <ContentRow title="Continue Watching">
                        {watching.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} showProgress variant="landscape"/>
                        ))}
                    </ContentRow>
                )}

                {recentMovies.length > 0 && (
                    <ContentRow title="Recently Added Movies">
                        {recentMovies.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} variant="portrait" width={250}/>
                        ))}
                    </ContentRow>
                )}

                {recentTV.length > 0 && (
                    <ContentRow title="Recently Added TV Shows">
                        {recentTV.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} variant="portrait" width={250}/>
                        ))}
                    </ContentRow>
                )}

                {trending?.movies && trending.movies.length > 0 && (
                    <ContentRow title="Trending Movies">
                        {trending.movies.map((item) => (
                            <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                        ))}
                    </ContentRow>
                )}

                {trending?.tv && trending.tv.length > 0 && (
                    <ContentRow title="Trending TV Shows">
                        {trending.tv.map((item) => (
                            <DiscoverCard key={item.id} item={item} mediaType="tv"/>
                        ))}
                    </ContentRow>
                )}

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
