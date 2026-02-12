import {Select, SelectItem, Progress} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useNavigate} from "react-router-dom";
import {useState} from "react";
import {motion} from "framer-motion";
import {useChildren} from "../../hooks/usePlex";
import type {PlexMediaItem} from "../../lib/types";
import {formatDuration} from "../../lib/utils";

interface EpisodeListProps {
    showId: string;
}

export default function EpisodeList({showId}: EpisodeListProps) {
    const navigate = useNavigate();
    const {data: seasons} = useChildren(showId);
    const [selectedSeason, setSelectedSeason] = useState<string>("");

    // Auto-select first season
    const activeSeason = selectedSeason || seasons?.[0]?.ratingKey || "";
    const {data: episodes} = useChildren(activeSeason);

    return (
        <div>
            {seasons && seasons.length > 0 && (
                <div className="mb-6">
                    <Select
                        label="Season"
                        selectedKeys={activeSeason ? [activeSeason] : []}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="max-w-xs"
                        size="sm"
                    >
                        {seasons.map((season: PlexMediaItem) => (
                            <SelectItem key={season.ratingKey}>
                                {season.title}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {episodes?.map((episode: PlexMediaItem, index: number) => {
                    const progress = episode.viewOffset && episode.duration
                        ? (episode.viewOffset / episode.duration) * 100
                        : 0;
                    const thumbUrl = episode.thumb ? `/api/media/${episode.ratingKey}/thumb` : "";

                    return (
                        <motion.div
                            key={episode.ratingKey}
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            transition={{delay: index * 0.05, duration: 0.3}}
                            className="cursor-pointer group"
                            onClick={() => navigate(`/player/${episode.ratingKey}`)}
                        >
                            <div className="relative rounded-lg overflow-hidden bg-content2">
                                {/* 16:9 thumbnail */}
                                <div className="relative aspect-video">
                                    {thumbUrl ? (
                                        <img
                                            src={thumbUrl}
                                            alt={episode.title}
                                            className="object-cover w-full h-full"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-content3 flex items-center justify-center">
                                            <Icon icon="mdi:television" width="32" className="text-default-400"/>
                                        </div>
                                    )}

                                    {/* Episode number badge */}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                                        E{episode.index?.toString().padStart(2, "0")}
                                    </div>

                                    {/* Play overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icon icon="mdi:play-circle" width="40" className="text-white"/>
                                        </div>
                                    </div>

                                    {/* Duration */}
                                    {episode.duration && (
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                            {formatDuration(episode.duration)}
                                        </div>
                                    )}

                                    {/* Progress bar */}
                                    {progress > 0 && (
                                        <div className="absolute bottom-0 left-0 right-0">
                                            <Progress
                                                size="sm"
                                                value={progress}
                                                className="rounded-none"
                                                classNames={{
                                                    indicator: "bg-primary",
                                                    track: "bg-black/50 rounded-none",
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="p-3">
                                    <p className="text-sm font-medium truncate">{episode.title}</p>
                                    {episode.summary && (
                                        <p className="text-xs text-default-400 line-clamp-2 mt-1">
                                            {episode.summary}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
