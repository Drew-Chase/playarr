import {Spinner} from "@heroui/react";
import {useDownloads} from "../hooks/useDownloads";
import DownloadList from "../components/downloads/DownloadList";
import {formatSpeed} from "../lib/utils";

export default function Downloads() {
    const {data, isLoading} = useDownloads();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Downloads</h1>
                {data && data.total_speed > 0 && (
                    <span className="text-sm text-default-400">
                        Total: {formatSpeed(data.total_speed)} | {data.queue_size} item{data.queue_size !== 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {data?.items && data.items.length > 0 ? (
                <DownloadList items={data.items}/>
            ) : (
                <p className="text-center text-default-400 py-12">No active downloads</p>
            )}
        </div>
    );
}
