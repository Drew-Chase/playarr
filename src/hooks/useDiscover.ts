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
