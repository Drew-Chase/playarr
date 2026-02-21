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
    SubtitleSearchResult,
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
    getStatus: () => api.get<{ setup_complete: boolean }>("/status"),

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

    getStreamUrl: (id: string, quality?: string, directPlay = true, directStream = false) =>
        api.get<StreamInfo>(`/media/${id}/stream`, {
            ...(quality ? { quality } : {}),
            direct_play: directPlay.toString(),
            ...(directStream ? { direct_stream: "true" } : {}),
        }, sessionHeaders),

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

    // Subtitles (OpenSubtitles)
    searchSubtitles: (params: {
        query?: string;
        imdb_id?: string;
        tmdb_id?: string;
        show_rating_key?: string;
        season?: number;
        episode?: number;
        languages?: string;
        foreign_parts_only?: boolean;
    }) => {
        const p: Record<string, string> = {};
        if (params.query) p.query = params.query;
        if (params.imdb_id) p.imdb_id = params.imdb_id;
        if (params.tmdb_id) p.tmdb_id = params.tmdb_id;
        if (params.show_rating_key) p.show_rating_key = params.show_rating_key;
        if (params.season != null) p.season = params.season.toString();
        if (params.episode != null) p.episode = params.episode.toString();
        if (params.languages) p.languages = params.languages;
        if (params.foreign_parts_only) p.foreign_parts_only = "true";
        return api.get<SubtitleSearchResult[]>("/subtitles/search", p);
    },

    downloadSubtitle: async (fileId: number): Promise<string> => {
        const resp = await fetch("/api/subtitles/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ file_id: fileId }),
        });
        if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
    },

    uploadSubtitleToPlex: (fileId: number, ratingKey: string, languageCode: string) =>
        api.post<{ success: boolean }>("/subtitles/upload-to-plex", {
            file_id: fileId,
            rating_key: ratingKey,
            language_code: languageCode,
        }),
};
