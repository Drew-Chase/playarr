import type {PlexMediaItem} from "../../lib/types.ts";
import MediaCard from "./MediaCard.tsx";

interface MediaGridProps {
    items: PlexMediaItem[];
    showProgress?: boolean;
    variant?: "portrait" | "landscape";
}

export default function MediaGrid({items, showProgress, variant = "portrait"}: MediaGridProps) {
    return (
        <div className="grid gap-4" style={{gridTemplateColumns: "repeat(auto-fill, minmax(180px, 250px))"}}>
            {items.map((item) => (
                <MediaCard key={item.ratingKey} item={item} showProgress={showProgress} variant={variant}/>
            ))}
        </div>
    );
}
