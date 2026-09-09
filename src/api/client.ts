import { PlexMediaItem, TmdbItem } from './types';

const DEFAULT_SERVER = 'https://playarr.dclabs.app';

let serverBase = DEFAULT_SERVER;
let authToken: string | null = null;

export function configureApi(serverUrl: string | null, token: string | null) {
  if (serverUrl) {
    serverBase = serverUrl.replace(/\/+$/, '');
  }
  authToken = token;
}

export function currentServerBase(): string {
  return serverBase;
}

export function currentAuthToken(): string | null {
  return authToken;
}

export function resolveServerUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return serverBase + path;
}

export function apiBase(): string {
  return `${serverBase}/api`;
}

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

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body, headers } = opts;
  let url = `${apiBase()}${path}`;
  if (params) url += `?${new URLSearchParams(params).toString()}`;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (authToken) finalHeaders.Cookie = `plex_user_token=${authToken}`;

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new ApiError((err as { error?: string }).error || `Request failed: ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function requestRaw<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return request<T>(path, opts);
}

export function mediaThumbUrl(item: Pick<PlexMediaItem, 'ratingKey'>): string {
  return `${apiBase()}/media/${item.ratingKey}/thumb`;
}

export function mediaArtUrl(item: Pick<PlexMediaItem, 'ratingKey'>): string {
  return `${apiBase()}/media/${item.ratingKey}/art`;
}

export function tmdbPosterUrl(item: Pick<TmdbItem, 'poster_path'>, size = 'w342'): string | null {
  if (!item.poster_path) return null;
  return `https://image.tmdb.org/t/p/${size}${item.poster_path}`;
}

export function tmdbBackdropUrl(item: Pick<TmdbItem, 'backdrop_path'>, size = 'w780'): string | null {
  if (!item.backdrop_path) return null;
  return `https://image.tmdb.org/t/p/${size}${item.backdrop_path}`;
}
