import type {PlexMediaItem} from "../../lib/types";
import MediaCard from "./MediaCard";

interface MediaGridProps {
    items: PlexMediaItem[];
    showProgress?: boolean;
}

export default function MediaGrid({items, showProgress}: MediaGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {items.map((item) => (
                <MediaCard key={item.ratingKey} item={item} showProgress={showProgress}/>
            ))}
        </div>
    );
}
