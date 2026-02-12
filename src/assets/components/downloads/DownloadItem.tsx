import {Chip} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {DownloadItem as DownloadItemType} from "../../lib/types";
import {formatFileSize, formatSpeed} from "../../lib/utils";
import DownloadProgress from "./DownloadProgress";

interface DownloadItemProps {
    item: DownloadItemType;
}

const STATUS_COLORS: Record<string, "primary" | "success" | "warning" | "danger" | "default"> = {
    downloading: "primary",
    seeding: "success",
    paused: "warning",
    queued: "default",
    extracting: "primary",
    checking: "default",
};

export default function DownloadItem({item}: DownloadItemProps) {
    const statusColor = STATUS_COLORS[item.status] || "default";
    const icon = item.client_type === "sabnzbd" || item.client_type === "nzbget"
        ? "mdi:usenet"
        : "mdi:magnet";

    return (
        <div className="bg-content2 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Icon icon={icon} width="18" className="shrink-0 text-default-400"/>
                    <p className="text-sm font-medium truncate">{item.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Chip size="sm" color={statusColor} variant="flat">
                        {item.status}
                    </Chip>
                    <Chip size="sm" variant="flat">{item.client_name}</Chip>
                </div>
            </div>

            <DownloadProgress progress={item.progress}/>

            <div className="flex items-center justify-between mt-2 text-xs text-default-400">
                <span>{formatFileSize(item.downloaded)} / {formatFileSize(item.size)}</span>
                <div className="flex gap-3">
                    {item.speed > 0 && <span>{formatSpeed(item.speed)}</span>}
                    {item.eta && <span>ETA: {item.eta}</span>}
                    <span>{item.progress.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}
