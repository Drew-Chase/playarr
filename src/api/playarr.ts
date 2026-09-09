import { request, setAuthHook } from './client';
import {
  DiscoverResults,
  LibraryItems,
  PlexLibrary,
  PlexMediaItem,
  PlexPin,
  PinPollResult,
  PlexUser,
  StreamInfo,
  TimelineUpdate,
} from './types';

export const playarr = {
  // auth
  guestAvailable: () => request<{ available: boolean }>('/auth/guest'),
  guestLogin: () => request<{ ok?: boolean }>('/auth/guest-login', { method: 'POST' }),
  currentUser: () => request<PlexUser>('/auth/user'),
  requestPin: () => request<PlexPin>('/auth/pin', { method: 'POST' }),
  pollPin: (id: number) => request<PinPollResult>(`/auth/pin/${id}`),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  // hubs
  continueWatching: () => request<PlexMediaItem[]>('/hubs/continue-watching'),
  onDeck: () => request<PlexMediaItem[]>('/hubs/on-deck'),
  recentlyAdded: () => request<PlexMediaItem[]>('/hubs/recently-added'),

  // libraries
  libraries: () => request<PlexLibrary[]>('/libraries'),
  libraryItems: (key: string, params?: Record<string, string>) =>
    request<LibraryItems>(`/libraries/${key}/items`, { params }),

  // media
  media: (id: string) => request<PlexMediaItem>(`/media/${id}`),
  mediaChildren: (id: string) => request<PlexMediaItem[]>(`/media/${id}/children`),
  mediaAllLeaves: (id: string) => request<PlexMediaItem[]>(`/media/${id}/allLeaves`),
  mediaRelated: (id: string) => request<{ MediaContainer?: { Metadata?: PlexMediaItem[] } }>(`/media/${id}/related`),
  mediaOnDeckEpisode: (id: string) => request<PlexMediaItem>(`/media/${id}/onDeck`),
  stream: (id: string) => request<StreamInfo>(`/media/${id}/stream`),
  timeline: (body: TimelineUpdate) => request<void>('/player/timeline', { method: 'POST', body }),
  scrobble: (id: string) => request<void>(`/player/scrobble/${id}`, { method: 'POST' }),
  unscrobble: (id: string) => request<void>(`/player/unscrobble/${id}`, { method: 'POST' }),
  stop: () => request<void>('/player/stop', { method: 'POST' }),

  // discover
  trending: () => request<DiscoverResults>('/discover/trending'),
  recent: () => request<DiscoverResults>('/discover/recent'),
  upcoming: () => request<DiscoverResults>('/discover/upcoming'),
  searchTmdb: (query: string) => request<DiscoverResults>('/discover/search', { params: { query } }),
  searchLibrary: (query: string) => request<PlexMediaItem[]>('/search', { params: { query } }),
};

export async function ensureGuestAuth(): Promise<boolean> {
  try {
    await playarr.guestLogin();
    return true;
  } catch {
    return false;
  }
}

setAuthHook(ensureGuestAuth);
