// Settings types
export interface PlexConfig {
    url: string;
    token: string;
}

export interface SonarrConfig {
    url: string;
    api_key: string;
}

export interface RadarrConfig {
    url: string;
    api_key: string;
}

export interface TmdbConfig {
    api_key: string;
}

export interface DownloadClientConfig {
    name: string;
    type: "sabnzbd" | "nzbget" | "qbittorrent" | "transmission";
    url: string;
    api_key: string;
    username: string;
    password: string;
    enabled: boolean;
}

export interface RedactedSettings {
    plex: { url: string; has_token: boolean };
    sonarr: { url: string; has_api_key: boolean };
    radarr: { url: string; has_api_key: boolean };
    tmdb: { has_api_key: boolean };
    download_clients: {
        name: string;
        type: string;
        url: string;
        has_api_key: boolean;
        has_credentials: boolean;
        enabled: boolean;
    }[];
}

export interface ConnectionTestResult {
    success: boolean;
    message: string;
}

// Plex types
export interface PlexLibrary {
    key: string;
    title: string;
    type: string;
    thumb: string;
    art: string;
}

export interface PlexMediaItem {
    ratingKey: string;
    key: string;
    title: string;
    type: "movie" | "show" | "season" | "episode";
    summary: string;
    year: number;
    thumb: string;
    art: string;
    duration: number;
    rating: number;
    contentRating: string;
    addedAt: number;
    viewOffset?: number;
    viewCount?: number;
    parentTitle?: string;
    grandparentTitle?: string;
    parentIndex?: number;
    index?: number;
    Media?: PlexMedia[];
}

export interface PlexMedia {
    id: number;
    duration: number;
    bitrate: number;
    width: number;
    height: number;
    videoCodec: string;
    audioCodec: string;
    container: string;
    Part: PlexPart[];
}

export interface PlexPart {
    id: number;
    key: string;
    duration: number;
    file: string;
    size: number;
    Stream?: PlexStream[];
}

export interface PlexStream {
    id: number;
    streamType: number; // 1=video, 2=audio, 3=subtitle
    codec: string;
    displayTitle: string;
    language: string;
    languageCode: string;
    selected?: boolean;
    default?: boolean;
}

export interface StreamInfo {
    url: string;
    type: "direct" | "hls";
    media: PlexMedia;
    part: PlexPart;
}

export interface LibraryItems {
    items: PlexMediaItem[];
    totalSize: number;
    offset: number;
    size: number;
}

export interface SearchHub {
    type: string;
    hubIdentifier: string;
    title: string;
    size: number;
    Metadata?: PlexMediaItem[];
}

// Auth types
export interface PlexPin {
    id: number;
    code: string;
}

export interface PinPollResult {
    claimed: boolean;
    auth_token?: string;
}

export interface PlexUser {
    id: number;
    uuid: string;
    username: string;
    title: string;
    email: string;
    thumb: string;
}

// Timeline
export interface TimelineUpdate {
    ratingKey: string;
    key: string;
    state: "playing" | "paused" | "stopped";
    time: number;
    duration: number;
}

// Download types
export interface DownloadItem {
    name: string;
    progress: number;
    speed: number;
    eta: string | null;
    status: string;
    size: number;
    downloaded: number;
    client_name: string;
    client_type: string;
}

export interface DownloadStatus {
    total_speed: number;
    queue_size: number;
    items: DownloadItem[];
}

// Watch Party types
export interface WatchRoom {
    id: string;
    host_name: string;
    media_id: string;
    position_ms: number;
    is_paused: boolean;
    participants: string[];
    episode_queue: string[];
    created_at: string;
}

export type WsMessage =
    | { type: "play"; position_ms: number }
    | { type: "pause"; position_ms: number }
    | { type: "seek"; position_ms: number }
    | { type: "sync_request" }
    | { type: "sync_response"; position_ms: number; is_paused: boolean; media_id: string }
    | { type: "next_episode" }
    | { type: "queue_add"; media_id: string }
    | { type: "queue_remove"; index: number }
    | { type: "chat"; from: string; message: string }
    | { type: "join"; name: string }
    | { type: "leave"; name: string }
    | { type: "media_change"; media_id: string };

// TMDB types
export interface TmdbItem {
    id: number;
    title?: string;
    name?: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    media_type?: "movie" | "tv";
}

export interface DiscoverResults {
    movies: TmdbItem[];
    tv?: TmdbItem[];
}
