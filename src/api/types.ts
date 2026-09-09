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

export interface PlexMarker {
  id: number;
  type: 'intro' | 'credits' | 'commercial';
  startTimeOffset: number;
  endTimeOffset: number;
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
  streamType: number;
  codec: string;
  displayTitle: string;
  extendedDisplayTitle?: string;
  language: string;
  languageCode: string;
  title?: string;
  selected?: boolean;
  default?: boolean;
}

export interface PlexMediaItem {
  ratingKey: string;
  key: string;
  title: string;
  titleSort?: string;
  type: 'movie' | 'show' | 'season' | 'episode' | 'clip';
  summary: string;
  year?: number;
  thumb: string;
  art: string;
  duration?: number;
  rating?: number;
  audienceRating?: number;
  contentRating?: string;
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
  grandparentRatingKey?: string;
  parentRatingKey?: string;
  leafCount?: number;
  childCount?: number;
  Media?: PlexMedia[];
  Role?: PlexRole[];
  Director?: PlexTag[];
  Writer?: PlexTag[];
  Genre?: PlexTag[];
  Marker?: PlexMarker[];
  Guid?: { id: string }[];
}

export interface StreamInfo {
  url: string;
  type: 'direct' | 'hls' | 'directstream';
  session?: string;
  media: PlexMedia;
  part: PlexPart;
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

export interface PlexPin {
  id: number;
  code: string;
}

export interface PinPollResult {
  claimed: boolean;
  auth_token?: string;
}

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
  media_type?: 'movie' | 'tv';
}

export interface DiscoverResults {
  movies: TmdbItem[];
  tv?: TmdbItem[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
  season_number: number;
}

export interface TmdbSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  episode_count: number;
  air_date: string | null;
}

export interface TmdbSeasonDetail {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episodes: TmdbEpisode[];
}

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

export interface DownloadHistoryItem {
  name: string;
  status: string;
  size: number;
  completed_at: string | null;
  client_name: string;
  client_type: string;
}

export interface DownloadStatus {
  total_speed: number;
  queue_size: number;
  paused: boolean;
  queue: DownloadItem[];
  history: DownloadHistoryItem[];
}

export interface TimelineUpdate {
  ratingKey: string;
  key: string;
  state: 'playing' | 'paused' | 'stopped';
  time: number;
  duration: number;
}

export interface LibraryItems {
  items: PlexMediaItem[];
  totalSize: number;
  offset: number;
  size: number;
}
