export interface MediaBase {
  id: string;
  title: string;
  year: string;
  watched: boolean;
}

export interface Movie extends MediaBase {
  type: 'movie';
  rating: string;
  runtime: string;
  resolution: string;
  audio: string;
  genres: string[];
  synopsis: string;
  director: string;
  writers: string;
}

export interface Show extends MediaBase {
  type: 'show';
  rating: string;
  seasonCount: number;
  episodeCount: number;
  resolution: string;
  audio: string;
  genres: string[];
  synopsis: string;
  creator: string;
  writers: string;
}

export interface Season {
  id: string;
  showId: string;
  number: number;
  episodeCount: number;
  synopsis: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  showId: string;
  seasonNumber: number;
  episodeNumber: number;
  code: string;
  title: string;
  runtime: string;
  watched: boolean;
  synopsis: string;
  director?: string;
  writer?: string;
}

export interface ContinueWatchingItem {
  id: string;
  title: string;
  sub: string;
  progress: number;
  runtime: string;
  episode?: string;
}

export interface CastMember {
  name: string;
  role: string;
}

export interface Collection {
  id: string;
  title: string;
  itemCount: string;
}

export interface CalendarDay {
  day: string;
  date: string;
  items: CalendarItem[];
}

export interface CalendarItem {
  title: string;
  kind: 'episode' | 'release' | 'request';
  status: 'scheduled' | 'pending';
  time: string;
}

export type PosterPlacement = 'overlap' | 'inline' | 'fanout';
export type TransportVariant = 'classic' | 'stacked' | 'minimal';
export type KeyboardVariant = 'qwerty' | 'tilegrid';
export type FilterVariant = 'compact' | 'segmented';
export type HeroVariant = 'classic' | 'cinematic';
