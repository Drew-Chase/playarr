import type {DownloadItem as DownloadItemType} from "../../lib/types.ts";
import DownloadItem from "./DownloadItem.tsx";

interface DownloadListProps {
    items: DownloadItemType[];
}

export default function DownloadList({items}: DownloadListProps) {
    return (
        <div className="flex flex-col gap-3">
            {items.map((item, index) => (
                <DownloadItem key={`${item.client_name}-${item.name}-${index}`} item={item}/>
            ))}
        </div>
    );
}
