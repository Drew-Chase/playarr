import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api.ts";
import {plexApi} from "../lib/plex.ts";
import {tmdbImage} from "../lib/utils.ts";
import type {PlexMediaItem} from "../lib/types.ts";

interface LogoResponse {
    logo_path: string | null;
}

function extractTmdbId(item: PlexMediaItem | undefined): string | null {
    if (!item?.Guid) return null;
    const entry = item.Guid.find((g) => g.id.startsWith("tmdb://"));
    if (!entry) return null;
    return entry.id.replace("tmdb://", "");
}

function getMediaType(item: PlexMediaItem): "movie" | "tv" {
    return item.type === "movie" ? "movie" : "tv";
}

/**
 * For seasons/episodes, the Guid contains a season/episode-level TMDB ID
 * which won't work with TMDB's images API. We need the parent show's TMDB ID.
 */
function getShowRatingKey(item: PlexMediaItem): string | undefined {
    if (item.type === "season") return item.parentRatingKey;
    if (item.type === "episode") return item.grandparentRatingKey;
    return undefined;
}

function getBrowserLanguage(): string {
    const full = navigator.language || "en";
    return full.split("-")[0].toLowerCase();
}

export function useTmdbLogo(item: PlexMediaItem | undefined) {
    const needsParent = item?.type === "season" || item?.type === "episode";
    const parentKey = item ? getShowRatingKey(item) : undefined;
    const lang = getBrowserLanguage();

    // Fetch parent show metadata to get show-level TMDB ID for seasons/episodes
    const {data: parentData} = useQuery({
        queryKey: ["plex", "metadata", parentKey],
        queryFn: () => plexApi.getMetadata(parentKey!),
        enabled: !!parentKey && needsParent,
        staleTime: 1000 * 60 * 60,
    });

    const sourceItem = needsParent ? parentData : item;
    const tmdbId = extractTmdbId(sourceItem);
    const mediaType = item ? getMediaType(item) : "movie";

    const {data} = useQuery({
        queryKey: ["tmdb", "logo", tmdbId, mediaType, lang],
        queryFn: () =>
            api.get<LogoResponse>("/discover/logo", {
                tmdb_id: tmdbId!,
                type: mediaType,
                lang,
            }),
        enabled: !!tmdbId,
        staleTime: 1000 * 60 * 60,
    });

    const logoUrl = data?.logo_path ? tmdbImage(data.logo_path, "w500") : null;

    return {logoUrl};
}
