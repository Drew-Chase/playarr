import { PlexMediaItem, TmdbItem } from './types';

export const API_BASE = 'https://playarr.dclabs.app/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

let authHook: (() => Promise<boolean>) | null = null;
export function setAuthHook(fn: () => Promise<boolean>) {
  authHook = fn;
}

export async function request<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const { method = 'GET', params, body, headers } = opts;
  let url = `${API_BASE}${path}`;
  if (params) url += `?${new URLSearchParams(params).toString()}`;

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if ((res.status === 401 || res.status === 403) && !retried && authHook) {
    const ok = await authHook();
    if (ok) return request<T>(path, opts, true);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new ApiError((err as { error?: string }).error || `Request failed: ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function mediaThumbUrl(item: Pick<PlexMediaItem, 'ratingKey'>): string {
  return `${API_BASE}/media/${item.ratingKey}/thumb`;
}

export function mediaArtUrl(item: Pick<PlexMediaItem, 'ratingKey'>): string {
  return `${API_BASE}/media/${item.ratingKey}/art`;
}

export function tmdbPosterUrl(item: Pick<TmdbItem, 'poster_path'>, size = 'w342'): string | null {
  if (!item.poster_path) return null;
  return `https://image.tmdb.org/t/p/${size}${item.poster_path}`;
}

export function tmdbBackdropUrl(item: Pick<TmdbItem, 'backdrop_path'>, size = 'w780'): string | null {
  if (!item.backdrop_path) return null;
  return `https://image.tmdb.org/t/p/${size}${item.backdrop_path}`;
}
