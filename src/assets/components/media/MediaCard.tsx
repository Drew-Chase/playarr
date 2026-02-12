import {Card, CardFooter, Image, Progress} from "@heroui/react";
import {useNavigate} from "react-router-dom";
import type {PlexMediaItem} from "../../lib/types";

interface MediaCardProps {
    item: PlexMediaItem;
    showProgress?: boolean;
}

export default function MediaCard({item, showProgress}: MediaCardProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (item.type === "movie" || item.type === "show") {
            navigate(`/detail/${item.ratingKey}`);
        } else if (item.type === "episode") {
            navigate(`/player/${item.ratingKey}`);
        }
    };

    const progress = item.viewOffset && item.duration
        ? (item.viewOffset / item.duration) * 100
        : 0;

    const title = item.type === "episode" && item.grandparentTitle
        ? `${item.grandparentTitle}`
        : item.title;

    const subtitle = item.type === "episode"
        ? `S${item.parentIndex?.toString().padStart(2, "0")}E${item.index?.toString().padStart(2, "0")} ${item.title}`
        : item.year?.toString() || "";

    // Build the image URL - proxy through our API
    const thumbUrl = item.thumb ? `/api/media/${item.ratingKey}/thumb` : "";

    return (
        <Card
            isPressable
            onPress={handleClick}
            className="shrink-0 w-[150px] bg-content2 border-none"
        >
            <Image
                alt={item.title}
                className="object-cover w-[150px] h-[225px]"
                src={thumbUrl}
                fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='225' fill='%23333'%3E%3Crect width='150' height='225'/%3E%3C/svg%3E"
                width={150}
                height={225}
            />
            {showProgress && progress > 0 && (
                <Progress
                    size="sm"
                    value={progress}
                    className="absolute bottom-12 left-0 right-0 z-10"
                    classNames={{indicator: "bg-primary"}}
                />
            )}
            <CardFooter className="flex-col items-start p-2 gap-0">
                <p className="text-xs font-semibold truncate w-full">{title}</p>
                <p className="text-[10px] text-default-400 truncate w-full">{subtitle}</p>
            </CardFooter>
        </Card>
    );
}
