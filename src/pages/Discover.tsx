import {Spinner} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api.ts";
import type {DiscoverResults} from "../lib/types.ts";
import ContentRow from "../components/layout/ContentRow.tsx";
import DiscoverCard from "../components/media/DiscoverCard.tsx";

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

    const isLoading = trendingLoading && upcomingLoading && recentLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    return (
        <div className="py-6">
            <h1 className="text-2xl font-bold mb-6 px-6 md:px-12 lg:px-16">Discover</h1>

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

            {recent?.movies && recent.movies.length > 0 && (
                <ContentRow title="Recently Released Movies">
                    {recent.movies.map((item) => (
                        <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                    ))}
                </ContentRow>
            )}

            {recent?.tv && recent.tv.length > 0 && (
                <ContentRow title="Recently Released TV Shows">
                    {recent.tv.map((item) => (
                        <DiscoverCard key={item.id} item={item} mediaType="tv"/>
                    ))}
                </ContentRow>
            )}
        </div>
    );
}
