import {useMemo} from "react";
import {Spinner} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api.ts";
import type {DiscoverResults, TmdbItem} from "../lib/types.ts";
import ContentRow from "../components/layout/ContentRow.tsx";
import DiscoverCard from "../components/media/DiscoverCard.tsx";
import {useSonarrSeries, useRadarrMovies} from "../hooks/useDiscover.ts";

export default function Discover() {
    const {data: trending, isLoading: trendingLoading} = useQuery({
        queryKey: ["discover", "trending"],
        queryFn: () => api.get<DiscoverResults>("/discover/trending"),
    });

    const {data: upcoming, isLoading: upcomingLoading} = useQuery({
        queryKey: ["discover", "upcoming"],
        queryFn: () => api.get<DiscoverResults>("/discover/upcoming"),
    });

    const {data: recent, isLoading: recentLoading} = useQuery({
        queryKey: ["discover", "recent"],
        queryFn: () => api.get<DiscoverResults>("/discover/recent"),
    });

    const {data: sonarrSeries} = useSonarrSeries();
    const {data: radarrMovies} = useRadarrMovies();

    // Build sets of TMDB IDs already in library
    const existingTmdbIds = useMemo(() => {
        const ids = new Set<number>();
        sonarrSeries?.forEach(s => { if (s.tmdbId) ids.add(s.tmdbId); });
        radarrMovies?.forEach(m => { if (m.tmdbId) ids.add(m.tmdbId); });
        return ids;
    }, [sonarrSeries, radarrMovies]);

    const filterItems = (items: TmdbItem[] | undefined) =>
        items?.filter(item => !existingTmdbIds.has(item.id)) || [];

    const isLoading = trendingLoading && upcomingLoading && recentLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    const trendingMovies = filterItems(trending?.movies);
    const trendingTv = filterItems(trending?.tv);
    const upcomingMovies = filterItems(upcoming?.movies);
    const recentMovies = filterItems(recent?.movies);
    const recentTv = filterItems(recent?.tv);

    return (
        <div className="py-6">
            <h1 className="text-2xl font-bold mb-6 px-6 md:px-12 lg:px-16">Discover</h1>

            {trendingMovies.length > 0 && (
                <ContentRow title="Trending Movies">
                    {trendingMovies.map((item) => (
                        <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                    ))}
                </ContentRow>
            )}

            {trendingTv.length > 0 && (
                <ContentRow title="Trending TV Shows">
                    {trendingTv.map((item) => (
                        <DiscoverCard key={item.id} item={item} mediaType="tv"/>
                    ))}
                </ContentRow>
            )}

            {upcomingMovies.length > 0 && (
                <ContentRow title="Upcoming Movies">
                    {upcomingMovies.map((item) => (
                        <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                    ))}
                </ContentRow>
            )}

            {recentMovies.length > 0 && (
                <ContentRow title="Recently Released Movies">
                    {recentMovies.map((item) => (
                        <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                    ))}
                </ContentRow>
            )}

            {recentTv.length > 0 && (
                <ContentRow title="Recently Released TV Shows">
                    {recentTv.map((item) => (
                        <DiscoverCard key={item.id} item={item} mediaType="tv"/>
                    ))}
                </ContentRow>
            )}
        </div>
    );
}
