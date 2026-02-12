import {useQuery} from "@tanstack/react-query";
import {plexApi} from "../lib/plex";

export function useLibraries() {
    return useQuery({
        queryKey: ["plex", "libraries"],
        queryFn: plexApi.getLibraries,
    });
}

export function useLibraryItems(key: string, start = 0, size = 50, sort?: string) {
    return useQuery({
        queryKey: ["plex", "library", key, start, size, sort],
        queryFn: () => plexApi.getLibraryItems(key, start, size, sort),
        enabled: !!key,
    });
}

export function useLibraryRecent(key: string) {
    return useQuery({
        queryKey: ["plex", "library", key, "recent"],
        queryFn: () => plexApi.getLibraryRecent(key),
        enabled: !!key,
    });
}

export function useMetadata(id: string) {
    return useQuery({
        queryKey: ["plex", "metadata", id],
        queryFn: () => plexApi.getMetadata(id),
        enabled: !!id,
    });
}

export function useChildren(id: string) {
    return useQuery({
        queryKey: ["plex", "children", id],
        queryFn: () => plexApi.getChildren(id),
        enabled: !!id,
    });
}

export function useContinueWatching() {
    return useQuery({
        queryKey: ["plex", "continueWatching"],
        queryFn: plexApi.getContinueWatching,
    });
}

export function useOnDeck() {
    return useQuery({
        queryKey: ["plex", "onDeck"],
        queryFn: plexApi.getOnDeck,
    });
}

export function useRecentlyAdded() {
    return useQuery({
        queryKey: ["plex", "recentlyAdded"],
        queryFn: plexApi.getRecentlyAdded,
    });
}

export function useSearch(query: string) {
    return useQuery({
        queryKey: ["plex", "search", query],
        queryFn: () => plexApi.search(query),
        enabled: query.length >= 2,
    });
}
