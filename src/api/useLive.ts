import { useEffect, useState } from 'react';
import { playarr } from './playarr';
import type { PlexMediaItem } from './types';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fn()
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Request failed');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error };
}

export const useContinueWatching = () => useAsync<PlexMediaItem[]>(() => playarr.continueWatching(), []);
export const useRecentlyAdded = () => useAsync<PlexMediaItem[]>(() => playarr.recentlyAdded(), []);
export const useLibraries = () => useAsync(() => playarr.libraries(), []);
export const useLibraryItems = (key: string | null) =>
  useAsync<PlexMediaItem[]>(() => (key ? playarr.libraryItems(key).then((r) => r.items) : Promise.resolve([])), [key]);
export const useTrending = () => useAsync(() => playarr.trending(), []);
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
