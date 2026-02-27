import {Accordion, AccordionItem, Input, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useEffect, useState} from "react";
import {useSearch} from "../hooks/usePlex.ts";
import {useDebounce} from "../hooks/useDebounce.ts";
import MediaGrid from "../components/media/MediaGrid.tsx";
import {useSearchParams} from "react-router-dom";

export default function Search()
{
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const {data: hubs, isLoading} = useSearch(debouncedQuery);

    useEffect(() =>
    {
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

            {isLoading && (
                <div className="flex justify-center py-12">
                    <Spinner size="lg"/>
                </div>
            )}

            {hubs && hubs.length > 0 ? (
                <Accordion key={"search-results"} className="mb-8" defaultExpandedKeys={hubs[0].hubIdentifier} disallowEmptySelection selectionBehavior={"toggle"}>
                    {hubs.sort((a, b) => hubSortOrder.indexOf(a.hubIdentifier.toLowerCase()) - hubSortOrder.indexOf(b.hubIdentifier.toLowerCase())).map((hub) =>
                        hub.Metadata && hub.Metadata.length > 0 ? (
                            <AccordionItem title={hub.title} key={hub.hubIdentifier} data-identifier={hub.hubIdentifier}>
                                <MediaGrid items={hub.Metadata}/>
                            </AccordionItem>
                        ) : null
                    )}
                </Accordion>
            ) : debouncedQuery.length >= 2 && !isLoading ? (
                <div className="text-center py-16">
                    <Icon icon="mdi:magnify" width="48" className="text-default-300 mx-auto mb-3"/>
                    <p className="text-default-400">
                        No results found for "{debouncedQuery}"
                    </p>
                </div>
            ) : !debouncedQuery ? (
                <div className="text-center py-16">
                    <Icon icon="mdi:magnify" width="48" className="text-default-300 mx-auto mb-3"/>
                    <p className="text-default-400">
                        Start typing to search your library
                    </p>
                </div>
            ) : null}
        </div>
    );
}
