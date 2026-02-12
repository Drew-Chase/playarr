import {Button, Select, SelectItem} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useNavigate} from "react-router-dom";
import {useState} from "react";
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
                <div className="mb-4">
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

            <div className="flex flex-col gap-2">
                {episodes?.map((episode: PlexMediaItem) => (
                    <div
                        key={episode.ratingKey}
                        className="flex items-center gap-4 p-3 rounded-lg bg-content2 hover:bg-content3 transition-colors cursor-pointer"
                        onClick={() => navigate(`/player/${episode.ratingKey}`)}
                    >
                        <div className="shrink-0 w-8 text-center text-default-400 text-sm font-medium">
                            {episode.index}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{episode.title}</p>
                            <p className="text-xs text-default-400 line-clamp-1">
                                {episode.summary}
                            </p>
                        </div>
                        <div className="text-xs text-default-400 shrink-0">
                            {episode.duration ? formatDuration(episode.duration) : ""}
                        </div>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => navigate(`/player/${episode.ratingKey}`)}
                        >
                            <Icon icon="mdi:play" width="18"/>
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
