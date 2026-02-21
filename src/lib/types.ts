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

export interface SetupData {
    plex_url: string;
    sonarr?: SonarrConfig;
    radarr?: RadarrConfig;
    download_clients?: DownloadClientConfig[];
}

// Plex types
export interface PlexLibrary {
    key: string;
    title: string;
    type: string;
    thumb: string;
    art: string;
}

export interface PlexRole {
    id: number;
    filter: string;
    tag: string;
    role: string;
    thumb?: string;
}

export interface PlexTag {
    id?: number;
    filter?: string;
    tag: string;
}

export interface PlexReview {
    id: number;
    filter: string;
    tag: string;
    text: string;
    image: string;
    link: string;
    source: string;
}

export interface PlexMarker {
    id: number;
    type: "intro" | "credits" | "commercial";
    startTimeOffset: number;  // milliseconds
    endTimeOffset: number;    // milliseconds
}

export interface PlexMediaItem {
    ratingKey: string;
    key: string;
    title: string;
    titleSort?: string;
    type: "movie" | "show" | "season" | "episode";
    summary: string;
    year: number;
    thumb: string;
    art: string;
    duration: number;
    rating: number;
    audienceRating?: number;
    ratingImage?: string;
    audienceRatingImage?: string;
    contentRating: string;
    studio?: string;
    tagline?: string;
    addedAt: number;
    originallyAvailableAt?: string;
    viewOffset?: number;
    viewCount?: number;
    parentTitle?: string;
    grandparentTitle?: string;
    parentIndex?: number;
    index?: number;
    Guid?: Array<{ id: string }>;
    grandparentRatingKey?: string;
    parentRatingKey?: string;
    leafCount?: number;
    childCount?: number;
    Media?: PlexMedia[];
    Role?: PlexRole[];
    Director?: PlexTag[];
    Writer?: PlexTag[];
    Genre?: PlexTag[];
    Review?: PlexReview[];
    Marker?: PlexMarker[];
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
    type: "direct" | "hls" | "directstream";
    media: PlexMedia;
    part: PlexPart;
}

export interface BifIndex {
    timestampMs: number;
    offset: number;
    size: number;
}

export interface BifData {
    version: number;
    imageCount: number;
    timestampMultiplier: number;
    images: BifIndex[];
    buffer: ArrayBuffer;
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
    isAdmin?: boolean;
    isGuest?: boolean;
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
export type WatchPartyAccessMode = "everyone" | "invite_only" | "by_user";
export type WatchPartyStatus = "idle" | "watching" | "paused" | "buffering";

export interface WatchPartyParticipant {
    user_id: number;
    username: string;
    thumb: string;
    joined_at: string;
}

export interface WatchRoom {
    id: string;
    name: string | null;
    host_user_id: number;
    host_username: string;
    media_id: string;
    media_title: string | null;
    position_ms: number;
    duration_ms: number;
    status: WatchPartyStatus;
    access_mode: WatchPartyAccessMode;
    invite_code: string | null;
    allowed_user_ids: number[];
    participants: WatchPartyParticipant[];
    episode_queue: string[];
    created_at: string;
}

export interface PlexServerUser {
    id: number;
    username: string;
    title: string;
    email: string;
    thumb: string;
}

export interface CreateWatchPartyRequest {
    name?: string;
    accessMode: WatchPartyAccessMode;
    allowedUserIds?: number[];
}

export interface WsParticipantInfo {
    user_id: number;
    username: string;
    thumb: string;
    is_host: boolean;
}

export type WsMessage =
    | { type: "play"; position_ms: number; user_id?: number }
    | { type: "pause"; position_ms: number; user_id?: number }
    | { type: "seek"; position_ms: number; user_id?: number }
    | { type: "sync_request" }
    | { type: "sync_response"; position_ms: number; is_paused: boolean; media_id: string }
    | { type: "next_episode" }
    | { type: "queue_add"; media_id: string }
    | { type: "queue_remove"; index: number }
    | { type: "chat"; from: string; user_id: number; message: string }
    | { type: "join"; user_id: number; username: string; thumb: string }
    | { type: "leave"; user_id: number; username: string }
    | { type: "media_change"; media_id: string; title?: string; duration_ms?: number }
    | { type: "navigate"; media_id: string; route: string }
    | { type: "kicked"; reason?: string }
    | { type: "room_closed" }
    | { type: "room_state"; media_id: string; media_title?: string; position_ms: number; is_paused: boolean; participants: WsParticipantInfo[]; episode_queue: string[] }
    | { type: "buffering"; user_id: number }
    | { type: "ready"; user_id: number }
    | { type: "all_ready" }
    | { type: "sync_ack" }
    | { type: "ping" }
    | { type: "heartbeat"; server_time: number; timestamp: number; media_id: string }
    | { type: "error"; message: string };

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
