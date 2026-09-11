import { useEffect, useState } from 'react';
import { playarr } from './playarr';
import type { PlexMediaItem } from './types';

const cache = new Map<string, unknown>();

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], cacheKey?: string): { data: T | null; error: string | null; loading: boolean } {
  const [data, setData] = useState<T | null>(() => (cacheKey ? ((cache.get(cacheKey) as T) ?? null) : null));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(data === null);
  useEffect(() => {
    let alive = true;
    fn()
      .then((d2) => {
        if (!alive) return;
        setData(d2);
        setError(null);
        setLoading(false);
        if (cacheKey) cache.set(cacheKey, d2);
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Request failed');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading };
}

export const useContinueWatching = () => useAsync<PlexMediaItem[]>(() => playarr.continueWatching(), [], 'cw');
export const useRecentlyAdded = () => useAsync<PlexMediaItem[]>(() => playarr.recentlyAdded(), [], 'recent');
export const useLibraries = () => useAsync(() => playarr.libraries(), [], 'libraries');
export const useLibraryItems = (key: string | null) =>
  useAsync<PlexMediaItem[]>(() => (key ? playarr.libraryItems(key).then((r) => r.items) : Promise.resolve([])), [key]);
export const useTrending = () => useAsync(() => playarr.trending(), [], 'trending');
export const useDownloads = () => useAsync(() => playarr.downloads(), []);
export const useMediaDetail = (id: string | null) =>
  useAsync<PlexMediaItem | null>(() => (id ? playarr.media(id) : Promise.resolve(null)), [id]);
export const useMediaChildren = (id: string | null) =>
  useAsync<PlexMediaItem[]>(() => (id ? playarr.mediaChildren(id) : Promise.resolve([])), [id]);
export const useAllLeaves = (id: string | null) =>
  useAsync<PlexMediaItem[]>(() => (id ? playarr.mediaAllLeaves(id) : Promise.resolve([])), [id]);
export const useSearchLibrary = (q: string) =>
  useAsync<PlexMediaItem[]>(() => (q ? playarr.searchLibrary(q) : Promise.resolve([])), [q]);
export const useSearchTmdb = (q: string) =>
  useAsync(() => (q ? playarr.searchTmdb(q).then((r) => [...(r.movies || []), ...(r.tv || [])]) : Promise.resolve([])), [q]);
export const useRadarrCalendar = () => useAsync<Record<string, unknown>[]>(() => playarr.radarrCalendar() as Promise<Record<string, unknown>[]>, []);
export const useSonarrCalendar = () => useAsync<Record<string, unknown>[]>(() => playarr.sonarrCalendar() as Promise<Record<string, unknown>[]>, []);
