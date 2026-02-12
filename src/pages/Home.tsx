import {Spinner} from "@heroui/react";
import {useContinueWatching, useOnDeck, useRecentlyAdded} from "../hooks/usePlex.ts";
import ContentRow from "../components/layout/ContentRow.tsx";
import MediaCard from "../components/media/MediaCard.tsx";
import HeroCarousel from "../components/media/HeroCarousel.tsx";
import type {PlexMediaItem} from "../lib/types.ts";

export default function Home() {
    const {data: continueWatching, isLoading: cwLoading} = useContinueWatching();
    const {data: onDeck, isLoading: odLoading} = useOnDeck();
    const {data: recentlyAdded, isLoading: raLoading} = useRecentlyAdded();

    const isLoading = cwLoading && odLoading && raLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    // Collect featured items for the hero carousel (up to 5)
    const featured: PlexMediaItem[] = [];
    const sources = [continueWatching, onDeck, recentlyAdded];
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

    return (
        <div>
            {featured.length > 0 && <HeroCarousel items={featured}/>}

            <div className="-mt-16 relative z-10">
                {continueWatching && continueWatching.length > 0 && (
                    <ContentRow title="Continue Watching">
                        {continueWatching.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} showProgress variant="landscape"/>
                        ))}
                    </ContentRow>
                )}

                {onDeck && onDeck.length > 0 && (
                    <ContentRow title="On Deck">
                        {onDeck.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} showProgress variant="landscape"/>
                        ))}
                    </ContentRow>
                )}

                {recentlyAdded && recentlyAdded.length > 0 && (
                    <ContentRow title="Recently Added">
                        {recentlyAdded.map((item) => (
                            <MediaCard key={item.ratingKey} item={item} variant="portrait"/>
                        ))}
                    </ContentRow>
                )}
            </div>
        </div>
    );
}
