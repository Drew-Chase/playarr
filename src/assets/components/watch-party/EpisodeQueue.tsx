import {Icon} from "@iconify-icon/react";

interface EpisodeQueueProps {
    queue: string[];
}

export default function EpisodeQueue({queue}: EpisodeQueueProps) {
    if (queue.length === 0) {
        return (
            <div className="bg-content2 rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-2">Episode Queue</h2>
                <p className="text-sm text-default-400">No episodes queued</p>
            </div>
        );
    }

    return (
        <div className="bg-content2 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">Episode Queue ({queue.length})</h2>
            <div className="flex flex-col gap-2">
                {queue.map((mediaId, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-lg bg-content3"
                    >
                        <span className="text-xs text-default-400 w-6 text-center">
                            {index + 1}
                        </span>
                        <Icon icon="mdi:movie" width="16" className="text-default-400"/>
                        <span className="text-sm flex-1 truncate">Media {mediaId}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
