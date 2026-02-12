import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api";
import type {DownloadStatus} from "../lib/types";

export function useDownloads() {
    return useQuery({
        queryKey: ["downloads"],
        queryFn: () => api.get<DownloadStatus>("/downloads"),
        refetchInterval: 5000,
    });
}
