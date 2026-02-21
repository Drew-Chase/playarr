import {Chip} from "@heroui/react";
import {motion} from "framer-motion";
import {Icon} from "@iconify-icon/react";
import {useNavigate} from "react-router-dom";
import type {TmdbItem} from "../../lib/types.ts";
import {tmdbImage} from "../../lib/utils.ts";

export default function DiscoverCard({item, mediaType}: { item: TmdbItem; mediaType: "movie" | "tv" }) {
    const navigate = useNavigate();
    const title = item.title || item.name || "Unknown";
    const date = item.release_date || item.first_air_date || "";

    return (
        <motion.div
            whileHover={{scale: 1.05}}
            transition={{type: "tween", duration: 0.2}}
            className="shrink-0 w-[185px] group scroll-snap-start cursor-pointer"
            onClick={() => navigate(`/discover/${mediaType}/${item.id}`)}
        >
            <div className="relative w-[185px] h-[278px] rounded-lg overflow-hidden bg-content2">
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
            </div>
        </motion.div>
    );
}
