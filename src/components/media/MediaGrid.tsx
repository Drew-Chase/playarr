import type {PlexMediaItem} from "../../lib/types.ts";
import MediaCard from "./MediaCard.tsx";

interface MediaGridProps {
    items: PlexMediaItem[];
    showProgress?: boolean;
    variant?: "portrait" | "landscape";
    /** Minimum card width in px — cards fill up to `maxWidth`. */
    minWidth?: number;
    maxWidth?: number;
}

export default function MediaGrid({items, showProgress, variant = "portrait", minWidth = 180, maxWidth = 250}: MediaGridProps) {
    return (
        <div className="grid gap-4" style={{gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, ${maxWidth}px))`}}>
            {items.map((item) => (
                <MediaCard key={item.ratingKey} item={item} showProgress={showProgress} variant={variant}/>
            ))}
        </div>
    );
}
