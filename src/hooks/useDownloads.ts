import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api.ts";
import type {DownloadStatus} from "../lib/types.ts";

export function useDownloads(enabled = true) {
    return useQuery({
        queryKey: ["downloads"],
        queryFn: () => api.get<DownloadStatus>("/downloads"),
        refetchInterval: 2000,
        enabled,
    });
}
