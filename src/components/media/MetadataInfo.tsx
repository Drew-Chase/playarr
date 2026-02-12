import {useState} from "react";
import {Icon} from "@iconify-icon/react";
import type {PlexMediaItem} from "../../lib/types.ts";
import {formatDuration} from "../../lib/utils.ts";

interface MetadataInfoProps {
    item: PlexMediaItem;
}

export default function MetadataInfo({item}: MetadataInfoProps) {
    const [expanded, setExpanded] = useState(false);

    const title = getTitle(item);
    const metaParts = getMetaParts(item);

    return (
        <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>

            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-default-400">
                {metaParts.map((part, i) => (
                    <span key={i} className="flex items-center gap-2">
                        {i > 0 && <span className="text-default-300">|</span>}
                        {part}
                    </span>
                ))}
                {item.rating && (
                    <span className="flex items-center gap-1 ml-1">
                        <span className="text-default-300">|</span>
                        <Icon icon="mdi:star" width="14" className="text-yellow-500"/>
                        {item.rating.toFixed(1)}/10
                    </span>
                )}
                {item.viewCount && item.viewCount > 0 && (
                    <span className="text-primary flex items-center gap-1 ml-1">
                        <span className="text-default-300">|</span>
                        <Icon icon="mdi:check-circle" width="14"/>
                        Watched
                    </span>
                )}
            </div>

            {item.summary && (
                <div className="max-w-2xl">
                    <p className={`text-sm text-default-500 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
                        {item.summary}
                    </p>
                    {item.summary.length > 200 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                        >
                            {expanded ? "Show less" : "Read more"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function getTitle(item: PlexMediaItem): string {
    if (item.type === "episode") {
        const ep = `S${item.parentIndex?.toString().padStart(2, "0")}E${item.index?.toString().padStart(2, "0")}`;
        return `${ep} \u00B7 ${item.title}`;
    }
    if (item.type === "season") {
        const count = item.leafCount;
        return count ? `${item.title} \u00B7 ${count} episode${count !== 1 ? "s" : ""}` : item.title;
    }
    return item.title;
}

function getMetaParts(item: PlexMediaItem): string[] {
    const parts: string[] = [];
    if (item.type === "episode") {
        if (item.grandparentTitle) parts.push(item.grandparentTitle);
        if (item.duration) parts.push(formatDuration(item.duration));
    } else if (item.type === "season") {
        if (item.parentTitle) parts.push(item.parentTitle);
    } else {
        if (item.year) parts.push(String(item.year));
        if (item.contentRating) parts.push(item.contentRating);
        if (item.duration) parts.push(formatDuration(item.duration));
    }
    return parts;
}
