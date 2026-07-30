import {Chip} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useNavigate} from "react-router-dom";
import type {TmdbItem} from "../../lib/types.ts";
import {tmdbImage} from "../../lib/utils.ts";

interface DiscoverCardProps {
    item: TmdbItem;
    mediaType: "movie" | "tv";
    /** Desaturate the poster to signal the item is not in the library. */
    dimmed?: boolean;
    /** Render a "Discover" pill under the title. */
    showDiscoverBadge?: boolean;
    /** Card width in px (default 185). */
    width?: number;
}

export default function DiscoverCard({item, mediaType, dimmed, showDiscoverBadge, width = 185}: DiscoverCardProps) {
    const navigate = useNavigate();
    const title = item.title || item.name || "Unknown";
    const date = item.release_date || item.first_air_date || "";

    return (
        <div
            className="shrink-0 group scroll-snap-start cursor-pointer transition-transform duration-200 hover:scale-105"
            style={{width}}
            onClick={() => navigate(`/discover/${mediaType}/${item.id}`)}
        >
            <div
                className={`relative rounded-lg overflow-hidden bg-content2 aspect-[2/3] transition-[filter] ${dimmed ? "saturate-50 brightness-75 group-hover:saturate-100 group-hover:brightness-100" : ""}`}
                style={{width}}
            >
                <img
                    alt={title}
                    className="object-cover w-full h-full"
                    src={tmdbImage(item.poster_path, "w300")}
                    loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon icon="mdi:information-outline" width="48" className="text-white drop-shadow-lg"/>
                    </div>
                </div>
                <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-primary/50 transition-all"/>
                {item.vote_average > 0 && (
                    <div className="absolute top-2 right-2">
                        <Chip size="sm" variant="flat" className="bg-black/60 text-white text-xs">
                            <span className="flex items-center gap-1">
                                <Icon icon="mdi:star" width="12" className="text-yellow-500"/>
                                {item.vote_average.toFixed(1)}
                            </span>
                        </Chip>
                    </div>
                )}
            </div>
            <div className="mt-2 px-1">
                <p className="text-sm font-semibold truncate">{title}</p>
                <p className="text-xs text-default-400">{date.slice(0, 4)}</p>
                {showDiscoverBadge && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-default-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-default-500">
                        <Icon icon="mdi:plus" width="10"/>
                        Discover
                    </span>
                )}
            </div>
        </div>
    );
}
