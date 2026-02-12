import {Input, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useState} from "react";
import {useSearch} from "../hooks/usePlex";
import {useDebounce} from "../hooks/useDebounce";
import MediaGrid from "../components/media/MediaGrid";

export default function Search() {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const {data: hubs, isLoading} = useSearch(debouncedQuery);

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
                hubs.map((hub) =>
                    hub.Metadata && hub.Metadata.length > 0 ? (
                        <div key={hub.hubIdentifier} className="mb-8">
                            <h2 className="text-lg font-semibold mb-4">{hub.title}</h2>
                            <MediaGrid items={hub.Metadata}/>
                        </div>
                    ) : null
                )
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
