import {Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useNavigate} from "react-router-dom";
import type {PlexMediaItem} from "../../lib/types";
import {formatDuration} from "../../lib/utils";

interface MediaBannerProps {
    item: PlexMediaItem;
}

export default function MediaBanner({item}: MediaBannerProps) {
    const navigate = useNavigate();

    return (
        <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden mb-8">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: item.art ? `url(/api/media/${item.ratingKey}/art)` : undefined,
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"/>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <h1 className="text-2xl md:text-4xl font-bold mb-2">{item.title}</h1>
                <div className="flex items-center gap-3 text-sm text-default-400 mb-3">
                    {item.year && <span>{item.year}</span>}
                    {item.contentRating && <span>{item.contentRating}</span>}
                    {item.duration && <span>{formatDuration(item.duration)}</span>}
                    {item.rating && <span className="flex items-center gap-1">
                        <Icon icon="mdi:star" width="14" className="text-yellow-500"/>
                        {item.rating.toFixed(1)}
                    </span>}
                </div>
                <p className="text-sm text-default-300 line-clamp-2 max-w-2xl mb-4">
                    {item.summary}
                </p>
                <div className="flex gap-2">
                    <Button
                        color="primary"
                        startContent={<Icon icon="mdi:play" width="20"/>}
                        onPress={() => navigate(`/player/${item.ratingKey}`)}
                    >
                        {item.viewOffset ? "Resume" : "Play"}
                    </Button>
                    <Button
                        variant="bordered"
                        startContent={<Icon icon="mdi:information" width="20"/>}
                        onPress={() => navigate(`/detail/${item.ratingKey}`)}
                    >
                        More Info
                    </Button>
                </div>
            </div>
        </div>
    );
}
