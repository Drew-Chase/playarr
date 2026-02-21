import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api.ts";
import type {
    TmdbMovieDetail,
    TmdbTvDetail,
    TmdbSeasonDetail,
    SonarrSeries,
    SonarrEpisode,
    RadarrMovie,
    QualityProfile,
    RootFolder,
    ReleaseResource,
    QueueResponse,
    ServiceUrls,
} from "../lib/types.ts";

export function useTmdbMovieDetail(tmdbId: string | undefined) {
    return useQuery({
        queryKey: ["tmdb", "movie", tmdbId],
        queryFn: () => api.get<TmdbMovieDetail>(`/discover/movie/${tmdbId}`),
        enabled: !!tmdbId,
    });
}

export function useTmdbTvDetail(tmdbId: string | undefined) {
    return useQuery({
        queryKey: ["tmdb", "tv", tmdbId],
        queryFn: () => api.get<TmdbTvDetail>(`/discover/tv/${tmdbId}`),
        enabled: !!tmdbId,
    });
}

export function useTmdbSeason(tmdbId: string | undefined, seasonNumber: number | undefined) {
    return useQuery({
        queryKey: ["tmdb", "tv", tmdbId, "season", seasonNumber],
        queryFn: () => api.get<TmdbSeasonDetail>(`/discover/tv/${tmdbId}/season/${seasonNumber}`),
        enabled: !!tmdbId && seasonNumber !== undefined,
    });
}

export function useServiceUrls() {
    return useQuery({
        queryKey: ["service-urls"],
        queryFn: () => api.get<ServiceUrls>("/service-urls"),
        staleTime: 300_000,
    });
}

export function useSonarrSeries() {
    return useQuery({
        queryKey: ["sonarr", "series"],
        queryFn: () => api.get<SonarrSeries[]>("/sonarr/series"),
        staleTime: 60_000,
    });
}

export function useRadarrMovies() {
    return useQuery({
        queryKey: ["radarr", "movies"],
        queryFn: () => api.get<RadarrMovie[]>("/radarr/movie"),
        staleTime: 60_000,
    });
}

export function useSonarrEpisodes(seriesId: number | undefined) {
    return useQuery({
        queryKey: ["sonarr", "episodes", seriesId],
        queryFn: () => api.get<SonarrEpisode[]>("/sonarr/episodes", {seriesId: String(seriesId)}),
        enabled: !!seriesId,
    });
}

export function useSonarrProfiles() {
    return useQuery({
        queryKey: ["sonarr", "qualityprofiles"],
        queryFn: () => api.get<QualityProfile[]>("/sonarr/qualityprofile"),
        staleTime: 300_000,
    });
}

export function useSonarrRootFolders() {
    return useQuery({
        queryKey: ["sonarr", "rootfolders"],
        queryFn: () => api.get<RootFolder[]>("/sonarr/rootfolder"),
        staleTime: 300_000,
    });
}

export function useRadarrProfiles() {
    return useQuery({
        queryKey: ["radarr", "qualityprofiles"],
        queryFn: () => api.get<QualityProfile[]>("/radarr/qualityprofile"),
        staleTime: 300_000,
    });
}

export function useRadarrRootFolders() {
    return useQuery({
        queryKey: ["radarr", "rootfolders"],
        queryFn: () => api.get<RootFolder[]>("/radarr/rootfolder"),
        staleTime: 300_000,
    });
}

/** Find a Sonarr series by TMDB ID from the full series list */
export function useSonarrSeriesByTmdb(tmdbId: number | undefined) {
    const {data: allSeries} = useSonarrSeries();
    return allSeries?.find(s => s.tmdbId === tmdbId);
}

/** Find a Radarr movie by TMDB ID from the full movie list */
export function useRadarrMovieByTmdb(tmdbId: number | undefined) {
    const {data: allMovies} = useRadarrMovies();
    return allMovies?.find(m => m.tmdbId === tmdbId);
}

// Release hooks (manual search)
export function useSonarrReleases(params: { episodeId?: number; seriesId?: number; seasonNumber?: number } | null) {
    const searchParams: Record<string, string> = {};
    if (params?.episodeId) searchParams.episodeId = String(params.episodeId);
    if (params?.seriesId) searchParams.seriesId = String(params.seriesId);
    if (params?.seasonNumber !== undefined) searchParams.seasonNumber = String(params.seasonNumber);

    return useQuery({
        queryKey: ["sonarr", "releases", params],
        queryFn: () => api.get<ReleaseResource[]>("/sonarr/release", searchParams),
        enabled: !!params,
        staleTime: 0,
    });
}

export function useRadarrReleases(movieId: number | null) {
    return useQuery({
        queryKey: ["radarr", "releases", movieId],
        queryFn: () => api.get<ReleaseResource[]>("/radarr/release", {movieId: String(movieId)}),
        enabled: !!movieId,
        staleTime: 0,
    });
}

// Queue hooks (download progress polling)
export function useSonarrQueue() {
    return useQuery({
        queryKey: ["sonarr", "queue"],
        queryFn: () => api.get<QueueResponse>("/sonarr/queue"),
        refetchInterval: 2000,
    });
}

export function useRadarrQueue() {
    return useQuery({
        queryKey: ["radarr", "queue"],
        queryFn: () => api.get<QueueResponse>("/radarr/queue"),
        refetchInterval: 2000,
    });
}
