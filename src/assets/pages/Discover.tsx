import {Spinner, Card, CardFooter, Image, Chip} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api";
import type {DiscoverResults, TmdbItem} from "../lib/types";
import {tmdbImage} from "../lib/utils";
import ContentRow from "../components/layout/ContentRow";
import RequestButton from "../components/discover/RequestButton";

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
        <div>
            <h1 className="text-2xl font-bold mb-6">Discover</h1>

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

function DiscoverCard({item, mediaType}: { item: TmdbItem; mediaType: "movie" | "tv" }) {
    const title = item.title || item.name || "Unknown";
    const date = item.release_date || item.first_air_date || "";

    return (
        <Card className="shrink-0 w-[150px] bg-content2 border-none">
            <Image
                alt={title}
                className="object-cover w-[150px] h-[225px]"
                src={tmdbImage(item.poster_path, "w300")}
                fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='225' fill='%23333'%3E%3Crect width='150' height='225'/%3E%3C/svg%3E"
                width={150}
                height={225}
            />
            <CardFooter className="flex-col items-start p-2 gap-1">
                <p className="text-xs font-semibold truncate w-full">{title}</p>
                <div className="flex items-center justify-between w-full">
                    <p className="text-[10px] text-default-400">{date.slice(0, 4)}</p>
                    {item.vote_average > 0 && (
                        <Chip size="sm" variant="flat" className="h-4 text-[10px]">
                            {item.vote_average.toFixed(1)}
                        </Chip>
                    )}
                </div>
                <RequestButton
                    tmdbId={item.id}
                    title={title}
                    mediaType={mediaType}
                />
            </CardFooter>
        </Card>
    );
}
