import { apiBase, tmdbPosterUrl } from './client';
import type { PlexMediaItem, TmdbItem } from './types';
import type { PosterData } from '../ui';
import { asPct } from '../theme';

export const FALLBACK_ART: [string, string, string] = ['#1b3566', '#101a3a', '#05060c'];
export const FALLBACK_INK = '#cfe9ff';

export function thumbUrl(m: Pick<PlexMediaItem, 'ratingKey'>): string {
  return `${apiBase()}/media/${m.ratingKey}/thumb`;
}

export function artUrl(m: Pick<PlexMediaItem, 'ratingKey'>): string {
  return `${apiBase()}/media/${m.ratingKey}/art`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function displayTitle(m: PlexMediaItem): string {
  if (m.type === 'episode') return m.grandparentTitle || m.title;
  if (m.type === 'season') return m.parentTitle || m.title;
  return m.title;
}

export function subFor(m: PlexMediaItem): string {
  if (m.type === 'episode') {
    const se = m.parentIndex != null && m.index != null ? `S${pad2(m.parentIndex)} · E${pad2(m.index)}` : '';
    return [se, m.year ? String(m.year) : ''].filter(Boolean).join(' · ');
  }
  if (m.type === 'season') return `Season ${m.index ?? '?'}${m.childCount ? ` · ${m.childCount} episodes` : ''}`;
  if (m.type === 'show') return [m.year ? String(m.year) : '', m.childCount ? `${m.childCount} seasons` : ''].filter(Boolean).join(' · ');
  return [m.year ? String(m.year) : '', fmtDuration(m.duration)].filter(Boolean).join(' · ');
}

export function fmtDuration(ms?: number): string {
  if (!ms) return '';
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}h ${pad2(min % 60)}m` : `${min}m`;
}

export function progressPct(m: PlexMediaItem): `${number}%` | undefined {
  if (!m.viewOffset || !m.duration || m.duration <= 0) return undefined;
  const pct = Math.round((m.viewOffset / m.duration) * 100);
  return pct > 0 ? asPct(String(pct)) : undefined;
}

export function toPoster(m: PlexMediaItem, onPress: () => void): PosterData {
  return {
    key: m.ratingKey,
    t: displayTitle(m),
    sub: subFor(m),
    art: FALLBACK_ART,
    ink: FALLBACK_INK,
    progPct: progressPct(m),
    uri: thumbUrl(m),
    onPress,
  };
}

export function detailTarget(m: PlexMediaItem): string {
  if (m.type === 'episode') return m.grandparentRatingKey || m.parentRatingKey || m.ratingKey;
  if (m.type === 'season') return m.parentRatingKey || m.ratingKey;
  return m.ratingKey;
}

export function tmdbToPoster(item: TmdbItem, onPress: () => void): PosterData {
  const kind = item.media_type === 'tv' ? 'Series' : 'Movie';
  const date = item.release_date || item.first_air_date || '';
  return {
    key: 'tmdb:' + item.id,
    t: item.title || item.name || 'Unknown',
    sub: [date.slice(0, 4), kind].filter(Boolean).join(' · '),
    art: FALLBACK_ART,
    ink: FALLBACK_INK,
    uri: tmdbPosterUrl(item),
    onPress,
  };
}

export function fmtSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '—';
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB/s';
  if (mb >= 1) return mb.toFixed(1) + ' MB/s';
  return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
}

export function fmtSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return gb.toFixed(1) + ' GB';
  return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
}

export function tmdbDiscoverItem(item: TmdbItem): DiscoverShape {
  return {
    id: 'tmdb:' + item.id,
    t: item.title || item.name || 'Unknown',
    yr: Number((item.release_date || item.first_air_date || '0').slice(0, 4)) || 0,
    rating: (item.vote_average || 0).toFixed(1),
    kind: item.media_type === 'tv' ? 'show' : 'movie',
    ink: FALLBACK_INK,
    art: FALLBACK_ART,
    ov: item.overview || 'No overview available.',
    remote: String(item.id),
  };
}

export interface DiscoverShape {
  id: string;
  t: string;
  yr: number;
  rating: string;
  kind: 'movie' | 'show';
  ink: string;
  art: [string, string, string];
  ov: string;
  remote?: string;
}
