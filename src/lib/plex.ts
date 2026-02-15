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
} from "./types.ts";

// Status
export const plexApi = {
    getStatus: () => api.get<{ setup_complete: boolean }>("/status"),

    completeSetup: (data: SetupData) => api.post("/setup", data),

    // Auth
    requestPin: () => api.post<PlexPin>("/auth/pin"),

    pollPin: (id: number) => api.get<PinPollResult>(`/auth/pin/${id}`),

    getUser: () => api.get<PlexUser>("/auth/user"),

    logout: () => api.post("/auth/logout"),

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

    getRelated: (id: string) => api.get<PlexMediaItem[]>(`/media/${id}/related`),

    getStreamUrl: (id: string, quality?: string, directPlay = true, directStream = false) =>
        api.get<StreamInfo>(`/media/${id}/stream`, {
            ...(quality ? { quality } : {}),
            direct_play: directPlay.toString(),
            ...(directStream ? { direct_stream: "true" } : {}),
        }),

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
        api.put("/player/timeline", update),

    scrobble: (id: string) => api.put(`/player/scrobble/${id}`),

    unscrobble: (id: string) => api.put(`/player/unscrobble/${id}`),
};
