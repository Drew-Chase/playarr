import type {PlexMediaItem} from "../../lib/types.ts";
import MediaCard from "./MediaCard.tsx";

interface MediaGridProps {
    items: PlexMediaItem[];
    showProgress?: boolean;
    variant?: "portrait" | "landscape";
}

export default function MediaGrid({items, showProgress, variant = "portrait"}: MediaGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {items.map((item) => (
                <MediaCard key={item.ratingKey} item={item} showProgress={showProgress} variant={variant}/>
            ))}
        </div>
    );
}
