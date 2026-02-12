import {Spinner, Chip} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {motion} from "framer-motion";
import {Icon} from "@iconify-icon/react";
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

function DiscoverCard({item, mediaType}: { item: TmdbItem; mediaType: "movie" | "tv" }) {
    const title = item.title || item.name || "Unknown";
    const date = item.release_date || item.first_air_date || "";

    return (
        <motion.div
            whileHover={{scale: 1.05}}
            transition={{type: "tween", duration: 0.2}}
            className="shrink-0 w-[185px] group scroll-snap-start"
        >
            <div className="relative w-[185px] h-[278px] rounded-lg overflow-hidden bg-content2">
                <img
                    alt={title}
                    className="object-cover w-full h-full"
                    src={tmdbImage(item.poster_path, "w300")}
                    loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon icon="mdi:information-outline" width="48" className="text-white"/>
                    </div>
                </div>
                <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-primary/50 transition-all"/>
                {item.vote_average > 0 && (
                    <div className="absolute top-2 right-2">
                        <Chip size="sm" variant="flat" className="bg-black/60 text-white text-xs">
                            <span className="flex items-center gap-1">
                                <Icon icon="mdi:star" width="12" className="text-yellow-500"/>
                                {item.vote_average.toFixed(1)}
                            </span>
                        </Chip>
                    </div>
                )}
            </div>
            <div className="mt-2 px-1">
                <p className="text-sm font-semibold truncate">{title}</p>
                <p className="text-xs text-default-400 mb-1">{date.slice(0, 4)}</p>
                <RequestButton
                    tmdbId={item.id}
                    title={title}
                    mediaType={mediaType}
                />
            </div>
        </motion.div>
    );
}
