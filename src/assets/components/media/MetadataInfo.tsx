import {Chip} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {PlexMediaItem} from "../../lib/types";
import {formatDuration} from "../../lib/utils";

interface MetadataInfoProps {
    item: PlexMediaItem;
}

export default function MetadataInfo({item}: MetadataInfoProps) {
    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{item.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-4">
                {item.year && <Chip size="sm" variant="flat">{item.year}</Chip>}
                {item.contentRating && (
                    <Chip size="sm" variant="bordered">{item.contentRating}</Chip>
                )}
                {item.duration && (
                    <Chip size="sm" variant="flat">{formatDuration(item.duration)}</Chip>
                )}
                {item.rating && (
                    <Chip size="sm" variant="flat" startContent={<Icon icon="mdi:star" width="14" className="text-yellow-500"/>}>
                        {item.rating.toFixed(1)}
                    </Chip>
                )}
                {item.viewCount && item.viewCount > 0 && (
                    <Chip size="sm" color="success" variant="flat">
                        Watched
                    </Chip>
                )}
            </div>
            {item.summary && (
                <p className="text-sm text-default-500 leading-relaxed">{item.summary}</p>
            )}
        </div>
    );
}
