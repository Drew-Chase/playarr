import { api } from "./api.ts";
import type {
    PlexPin,
    PinPollResult,
    PlexUser,
    PlexLibrary,
    PlexMediaItem,
    LibraryItems,
    StreamInfo,
    SearchHub,
    TimelineUpdate,
    SetupData,
    TmdbVideo,
    RecommendationGroup,
    GenreGroup,
    PlexCollection,
    PlexPlaylist,
} from "./types.ts";

// Generate a unique session ID per browser tab so each tab gets its own
// Plex playback session. This prevents multiple viewers from conflicting.
function getPlaybackSessionId(): string {
    let id = sessionStorage.getItem("playarr-session-id");
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem("playarr-session-id", id);
    }
    return id;
}

export const playbackSessionId = getPlaybackSessionId();
const sessionHeaders = { "X-Playarr-Session": playbackSessionId };

// Status
export const plexApi = {
    getStatus: () => api.get<{ setup_complete: boolean; version: string }>("/status"),

    completeSetup: (data: SetupData) => api.post("/setup", data),

    // Auth
    requestPin: () => api.post<PlexPin>("/auth/pin"),

    pollPin: (id: number) => api.get<PinPollResult>(`/auth/pin/${id}`),

    getUser: () => api.get<PlexUser>("/auth/user"),

    logout: () => api.post("/auth/logout"),

    checkGuestAvailable: () => api.get<{ available: boolean }>("/auth/guest"),

    guestLogin: () => api.post<{ success: boolean }>("/auth/guest-login"),

    // Libraries
    getLibraries: () => api.get<PlexLibrary[]>("/libraries"),

    getLibraryItems: (key: string, start = 0, size = 50, sort?: string) =>
        api.get<LibraryItems>(`/libraries/${key}/items`, {
            start: start.toString(),
            size: size.toString(),
            ...(sort ? { sort } : {}),
        }),

    getLibraryRecent: (key: string) =>
        api.get<PlexMediaItem[]>(`/libraries/${key}/recent`),

    // Media
    getMetadata: (id: string) => api.get<PlexMediaItem>(`/media/${id}`),

    getChildren: (id: string) => api.get<PlexMediaItem[]>(`/media/${id}/children`),

    getAllEpisodes: (showId: string) => api.get<PlexMediaItem[]>(`/media/${showId}/allLeaves`),

    getShowOnDeck: (id: string) => api.get<PlexMediaItem | null>(`/media/${id}/onDeck`),

    getRelated: (id: string) => api.get<PlexMediaItem[]>(`/media/${id}/related`),

    getTmdbVideos: (tmdbId: number, mediaType: "movie" | "tv") =>
        api.get<{ results: TmdbVideo[] }>("/discover/videos", {
            tmdb_id: tmdbId.toString(),
            type: mediaType,
        }),

    getStreamUrl: (id: string, quality?: string, directPlay = true, directStream = false) =>
        api.get<StreamInfo>(`/media/${id}/stream`, {
            ...(quality ? { quality } : {}),
            direct_play: directPlay.toString(),
            ...(directStream ? { direct_stream: "true" } : {}),
        }, sessionHeaders),

    /** Ping a Plex transcode session to keep it alive during pause. */
    pingTranscode: (sessionId: string) =>
        api.get(`/media/transcode-ping/${sessionId}`, undefined, sessionHeaders),

    getBifData: async (id: string): Promise<ArrayBuffer | null> => {
        try {
            const response = await fetch(`/api/media/${id}/bif`, { credentials: "same-origin" });
            if (!response.ok) return null;
            return response.arrayBuffer();
        } catch {
            return null;
        }
    },

    // Hubs
    getContinueWatching: () => api.get<PlexMediaItem[]>("/hubs/continue-watching"),

    getOnDeck: () => api.get<PlexMediaItem[]>("/hubs/on-deck"),

    getRecentlyAdded: () => api.get<PlexMediaItem[]>("/hubs/recently-added"),

    getRecommendations: () => api.get<RecommendationGroup[]>("/hubs/recommendations"),

    // Libraries (genre browsing)
    getLibraryGenres: (key: string) =>
        api.get<Array<{ key: string; title: string }>>(`/libraries/${key}/genres`),

    getLibraryByGenre: (key: string, genres: string[], size?: number) =>
        api.get<GenreGroup[]>(`/libraries/${key}/by-genre`, {
            genres: genres.join(","),
            ...(size ? { size: size.toString() } : {}),
        }),

    getLibraryCollections: (key: string) =>
        api.get<PlexCollection[]>(`/libraries/${key}/collections`),

    getPlaylists: () => api.get<PlexPlaylist[]>("/hubs/playlists"),

    // Search
    search: (query: string) => api.get<SearchHub[]>("/search", { q: query }),

    // Player
    updateTimeline: (update: TimelineUpdate) =>
        api.put("/player/timeline", update, sessionHeaders),

    scrobble: (id: string) => api.put(`/player/scrobble/${id}`, undefined, sessionHeaders),

    unscrobble: (id: string) => api.put(`/player/unscrobble/${id}`, undefined, sessionHeaders),

    // Send stop signal via sendBeacon (reliable during page unload/SPA navigation)
    sendStopBeacon: (ratingKey: string, key: string, timeMs: number, durationMs: number) => {
        const body = JSON.stringify({
            ratingKey, key, state: "stopped",
            time: timeMs, duration: durationMs,
            sessionId: playbackSessionId,
        });
        navigator.sendBeacon("/api/player/stop", new Blob([body], { type: "application/json" }));
    },

    setPartStreams: (partId: number, opts: { subtitleStreamId?: number | null; audioStreamId?: number }) =>
        api.put<{ success: boolean }>(`/media/parts/${partId}/streams`, {
            subtitle_stream_id: opts.subtitleStreamId,
            audio_stream_id: opts.audioStreamId,
        }),

};
