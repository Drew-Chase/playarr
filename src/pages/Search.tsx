import {Accordion, AccordionItem, Input, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useEffect, useState} from "react";
import {useSearch} from "../hooks/usePlex.ts";
import {useTmdbSearch} from "../hooks/useDiscover.ts";
import {useDebounce} from "../hooks/useDebounce.ts";
import MediaGrid from "../components/media/MediaGrid.tsx";
import DiscoverCard from "../components/media/DiscoverCard.tsx";
import {useSearchParams} from "react-router-dom";

export default function Search()
{
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState("");
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

    const hubSortOrder = ["movie", "show", "episode"];
    const hasPlexResults = hubs && hubs.length > 0;
    const hasTmdbResults = tmdbResults && ((tmdbResults.movies?.length ?? 0) > 0 || (tmdbResults.tv?.length ?? 0) > 0);
    const anyLoading = isLoading || tmdbLoading;

    return (
        <div className="px-6 md:px-12 lg:px-16 py-6">
            <Input
                placeholder="Search movies, TV shows, and more..."
                value={query}
                onValueChange={setQuery}
                startContent={<Icon icon="mdi:magnify" width="20"/>}
                size="lg"
                className="mb-8"
                isClearable
                onClear={() => setQuery("")}
            />

            {anyLoading && (
                <div className="flex justify-center py-12">
                    <Spinner size="lg"/>
                </div>
            )}

            {hasPlexResults && (
                <Accordion key={"search-results"} className="mb-8" defaultExpandedKeys={hubs[0].hubIdentifier} selectionBehavior={"toggle"}>
                    {hubs.sort((a, b) => hubSortOrder.indexOf(a.hubIdentifier.toLowerCase()) - hubSortOrder.indexOf(b.hubIdentifier.toLowerCase())).map((hub) =>
                        hub.Metadata && hub.Metadata.length > 0 ? (
                            <AccordionItem title={hub.title} key={hub.hubIdentifier} data-identifier={hub.hubIdentifier}>
                                <MediaGrid items={hub.Metadata}/>
                            </AccordionItem>
                        ) : null
                    )}
                </Accordion>
            )}

            {hasTmdbResults && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Discover on TMDB</h2>
                    <Accordion key={"tmdb-results"} defaultExpandedKeys={["tmdb-movies"]} selectionBehavior={"toggle"}>
                        {[
                            ...(tmdbResults.movies && tmdbResults.movies.length > 0 ? [
                                <AccordionItem title={`Movies (${tmdbResults.movies.length})`} key="tmdb-movies">
                                    <div className="grid gap-4" style={{gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))"}}>
                                        {tmdbResults.movies.map((item) => (
                                            <DiscoverCard key={item.id} item={item} mediaType="movie"/>
                                        ))}
                                    </div>
                                </AccordionItem>
                            ] : []),
                            ...(tmdbResults.tv && tmdbResults.tv.length > 0 ? [
                                <AccordionItem title={`TV Shows (${tmdbResults.tv.length})`} key="tmdb-tv">
                                    <div className="grid gap-4" style={{gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))"}}>
                                        {tmdbResults.tv.map((item) => (
                                            <DiscoverCard key={item.id} item={item} mediaType="tv"/>
                                        ))}
                                    </div>
                                </AccordionItem>
                            ] : [])
                        ]}
                    </Accordion>
                </div>
            )}

            {debouncedQuery.length >= 2 && !anyLoading && !hasPlexResults && !hasTmdbResults && (
                <div className="text-center py-16">
                    <Icon icon="mdi:magnify" width="48" className="text-default-300 mx-auto mb-3"/>
                    <p className="text-default-400">
                        No results found for "{debouncedQuery}"
                    </p>
                </div>
            )}

            {!debouncedQuery && (
                <div className="text-center py-16">
                    <Icon icon="mdi:magnify" width="48" className="text-default-300 mx-auto mb-3"/>
                    <p className="text-default-400">
                        Start typing to search your library and discover new content
                    </p>
                </div>
            )}
        </div>
    );
}
