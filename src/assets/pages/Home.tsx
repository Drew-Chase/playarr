import {Spinner} from "@heroui/react";
import {useContinueWatching, useOnDeck, useRecentlyAdded} from "../hooks/usePlex";
import ContentRow from "../components/layout/ContentRow";
import MediaCard from "../components/media/MediaCard";
import MediaBanner from "../components/media/MediaBanner";

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

    // Pick a featured item for the banner
    const featured = continueWatching?.[0] || onDeck?.[0] || recentlyAdded?.[0];

    return (
        <div>
            {featured && <MediaBanner item={featured}/>}

            {continueWatching && continueWatching.length > 0 && (
                <ContentRow title="Continue Watching">
                    {continueWatching.map((item) => (
                        <MediaCard key={item.ratingKey} item={item} showProgress/>
                    ))}
                </ContentRow>
            )}

            {onDeck && onDeck.length > 0 && (
                <ContentRow title="On Deck">
                    {onDeck.map((item) => (
                        <MediaCard key={item.ratingKey} item={item} showProgress/>
                    ))}
                </ContentRow>
            )}

            {recentlyAdded && recentlyAdded.length > 0 && (
                <ContentRow title="Recently Added">
                    {recentlyAdded.map((item) => (
                        <MediaCard key={item.ratingKey} item={item}/>
                    ))}
                </ContentRow>
            )}
        </div>
    );
}
