import {Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useDownloads} from "../hooks/useDownloads.ts";
import DownloadList from "../components/downloads/DownloadList.tsx";
import {formatSpeed} from "../lib/utils.ts";

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
        <div className="px-6 md:px-12 lg:px-16 py-6">
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
                <div className="text-center py-16">
                    <Icon icon="mdi:download-off" width="48" className="text-default-300 mx-auto mb-3"/>
                    <p className="text-default-400">No active downloads</p>
                </div>
            )}
        </div>
    );
}
