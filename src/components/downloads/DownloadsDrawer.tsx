import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    Spinner,
    Tab,
    Tabs,
    Chip,
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useDownloads} from "../../hooks/useDownloads.ts";
import {formatFileSize, formatSpeed} from "../../lib/utils.ts";
import type {DownloadHistoryItem as DownloadHistoryItemType} from "../../lib/types.ts";
import DownloadList from "./DownloadList.tsx";

interface DownloadsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const HISTORY_STATUS_COLORS: Record<string, "success" | "danger" | "warning" | "primary" | "default"> = {
    completed: "success",
    failed: "danger",
    seeding: "primary",
    repairing: "warning",
    extracting: "primary",
    verifying: "warning",
};

function HistoryItem({item}: { item: DownloadHistoryItemType }) {
    const statusColor = HISTORY_STATUS_COLORS[item.status] || "default";
    const icon = item.client_type === "sabnzbd" || item.client_type === "nzbget"
        ? "mdi:usenet"
        : "mdi:magnet";

    return (
        <div className="bg-content2 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                    <Icon icon={icon} width="16" className="shrink-0 text-default-400"/>
                    <p className="text-sm font-medium truncate">{item.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Chip size="sm" color={statusColor} variant="flat">
                        {item.status}
                    </Chip>
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-default-400">
                <span>{formatFileSize(item.size)}</span>
                <div className="flex gap-3">
                    {item.completed_at && <span>{item.completed_at}</span>}
                    <span>{item.client_name}</span>
                </div>
            </div>
        </div>
    );
}

export default function DownloadsDrawer({isOpen, onClose}: DownloadsDrawerProps) {
    const {data, isLoading} = useDownloads(isOpen);

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            placement="right"
            size="lg"
            backdrop="opaque"
        >
            <DrawerContent>
                <DrawerHeader className="flex items-center justify-between border-b border-divider pb-3">
                    <div className="flex items-center gap-2">
                        <Icon icon="mdi:download" width="24"/>
                        <span className="text-lg font-semibold">Downloads</span>
                    </div>
                    {data && data.total_speed > 0 && (
                        <span className="text-sm text-default-400">
                            {formatSpeed(data.total_speed)}
                        </span>
                    )}
                </DrawerHeader>
                <DrawerBody className="py-4 px-3">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Spinner size="lg"/>
                        </div>
                    ) : (
                        <Tabs
                            aria-label="Download tabs"
                            variant="underlined"
                            classNames={{
                                tabList: "w-full",
                                panel: "pt-4 px-0",
                            }}
                        >
                            <Tab
                                key="queue"
                                title={
                                    <div className="flex items-center gap-2">
                                        <span>Queue</span>
                                        {data && data.queue.length > 0 && (
                                            <Chip size="sm" variant="flat" color="primary">
                                                {data.queue.length}
                                            </Chip>
                                        )}
                                    </div>
                                }
                            >
                                {data?.queue && data.queue.length > 0 ? (
                                    <DownloadList items={data.queue}/>
                                ) : (
                                    <div className="text-center py-12">
                                        <Icon icon="mdi:download-off" width="40" className="text-default-300 mx-auto mb-3"/>
                                        <p className="text-default-400 text-sm">No active downloads</p>
                                    </div>
                                )}
                            </Tab>
                            <Tab
                                key="history"
                                title={
                                    <div className="flex items-center gap-2">
                                        <span>History</span>
                                        {data && data.history.length > 0 && (
                                            <Chip size="sm" variant="flat">
                                                {data.history.length}
                                            </Chip>
                                        )}
                                    </div>
                                }
                            >
                                {data?.history && data.history.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {data.history.map((item, index) => (
                                            <HistoryItem
                                                key={`${item.client_name}-${item.name}-${index}`}
                                                item={item}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Icon icon="mdi:history" width="40" className="text-default-300 mx-auto mb-3"/>
                                        <p className="text-default-400 text-sm">No download history</p>
                                    </div>
                                )}
                            </Tab>
                        </Tabs>
                    )}
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
}
