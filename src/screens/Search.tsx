import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { C, F, px } from '../theme';
import { Focusable, ImgOrGrad, TitleGlyph } from '../ui';
import { DISCOVER, TITLES, useStore } from '../store';
import { thumbUrl, tmdbDiscoverItem } from '../api/mappers';
import { tmdbPosterUrl } from '../api/client';
import { useRecentlyAdded, useSearchLibrary, useSearchTmdb } from '../api/useLive';
import type { TmdbItem } from '../api/types';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U'],
  ['I', 'O', 'P', 'A', 'S', 'D', 'F'],
  ['G', 'H', 'J', 'K', 'L', 'Z', 'X'],
  ['C', 'V', 'B', 'N', 'M'],
];

interface ResultItem {
  key: string;
  t: string;
  sub: string;
  uri: string | null;
  liveId: string | null;
  tmdb: TmdbItem | null;
}

export function SearchScreen() {
  const { s, a } = useStore();
  const [liveQ, setLiveQ] = useState('');
  const { data: recentlyAdded } = useRecentlyAdded();

  useEffect(() => {
    const t = setTimeout(() => setLiveQ(s.query.trim()), 400);
    return () => clearTimeout(t);
  }, [s.query]);

  const { data: libResults } = useSearchLibrary(liveQ);
  const { data: tmdbResults } = useSearchTmdb(liveQ);

  const q = s.query.trim().toLowerCase();
  const liveMode = liveQ.length > 0;

  const libItems: ResultItem[] = (libResults ?? []).map((m) => ({
    key: m.ratingKey,
    t: m.title,
    sub: [m.year ? String(m.year) : '', m.type === 'episode' ? m.grandparentTitle || '' : ''].filter(Boolean).join(' · '),
    uri: thumbUrl(m),
    liveId: m.ratingKey,
    tmdb: null,
  }));

  const tmdbItems: ResultItem[] = (tmdbResults ?? []).slice(0, 12).map((item) => ({
    key: 'tmdb:' + item.id,
    t: item.title || item.name || 'Unknown',
    sub: (item.release_date || item.first_air_date || '').slice(0, 4) + ' · ' + (item.media_type === 'tv' ? 'Series' : 'Movie'),
    uri: tmdbPosterUrl(item),
    liveId: null,
    tmdb: item,
  }));

  const suggestions: ResultItem[] = recentlyAdded?.length
    ? recentlyAdded.slice(0, 8).map((m) => ({
        key: m.ratingKey,
        t: m.title,
        sub: m.year ? String(m.year) : '',
        uri: thumbUrl(m),
        liveId: m.grandparentRatingKey || m.parentRatingKey || m.ratingKey,
        tmdb: null,
      }))
    : TITLES.slice(0, 8).map((t) => ({
        key: t.id,
        t: t.t,
        sub: String(t.yr),
        uri: null,
        liveId: null,
        tmdb: null,
      }));

  const demoFallback = q ? TITLES.filter((t) => t.t.toLowerCase().includes(q)) : [];
  const total = liveMode ? libItems.length + tmdbItems.length : demoFallback.length;

  return (
    <ScrollView removeClippedSubviews={false}
      focusable={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: px(64), paddingTop: px(150), paddingBottom: px(90) }}
    >
      <Text style={{ fontFamily: F.head, fontSize: px(44), color: C.text }}>Search</Text>
      <View
        style={{
          marginTop: px(24),
          borderRadius: px(14),
          backgroundColor: '#101317',
          borderWidth: px(1),
          borderColor: 'rgba(255,255,255,.08)',
          paddingHorizontal: px(26),
          paddingVertical: px(22),
        }}
      >
        <Text style={{ fontSize: px(22), fontWeight: '600', color: s.query ? C.text : '#5d646a' }} numberOfLines={1}>
          {s.query || 'Search your server and TMDB…'}
        </Text>
      </View>

      <View style={{ gap: px(10), marginTop: px(22) }}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: px(10), justifyContent: 'center' }}>
            {row.map((k, ki) => (
              <Focusable
                key={k}
                hasTV={ri === 0 && ki === 0}
                onPress={() => a.set({ query: s.query + k })}
                focusStyle={{ borderColor: C.accent, borderWidth: px(2), transform: [{ scale: 1.08 }] }}
                style={{ width: px(64), height: px(64), borderRadius: px(10), backgroundColor: '#14181c', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: px(22), fontWeight: '700', color: '#e9ecee' }}>{k}</Text>
              </Focusable>
            ))}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: px(10), justifyContent: 'center' }}>
          {[
            { label: 'Space', act: () => a.set({ query: s.query + ' ' }) },
            { label: 'Delete', act: () => a.set({ query: s.query.slice(0, -1) }) },
            { label: 'Clear', act: () => a.set({ query: '' }), accent: true },
          ].map((k, i) => (
            <Focusable
              key={k.label}
              hasTV={false}
              onPress={k.act}
              focusStyle={{ borderColor: C.accent, borderWidth: px(2), transform: [{ scale: 1.05 }] }}
              style={{
                width: px(148),
                height: px(64),
                borderRadius: px(10),
                backgroundColor: k.accent ? 'rgba(0,212,116,.16)' : '#14181c',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: px(17), fontWeight: '600', color: k.accent ? '#7dffc0' : '#e9ecee' }}>{k.label}</Text>
            </Focusable>
          ))}
        </View>
      </View>

      <Text style={{ fontSize: px(16), color: '#7f868c', marginTop: px(34), marginBottom: px(18) }}>
        {liveMode
          ? total + (total === 1 ? ' result' : ' results') + ' for “' + s.query + '”'
          : 'Suggested from your library'}
      </Text>

      {!liveMode ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(24) }}>
          {suggestions.map((it, i) => (
            <ResultCard key={it.key} it={it} hasTV={i === 0} />
          ))}
        </View>
      ) : (
        <>
          {libItems.length ? (
            <>
              <Text style={{ fontSize: px(15), fontWeight: '700', color: '#7dffc0', marginBottom: px(14), letterSpacing: px(0.6), textTransform: 'uppercase' }}>
                In your library
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(24), marginBottom: px(30) }}>
                {libItems.map((it, i) => (
                  <ResultCard key={it.key} it={it} hasTV={i === 0} />
                ))}
              </View>
            </>
          ) : null}
          {tmdbItems.length ? (
            <>
              <Text style={{ fontSize: px(15), fontWeight: '700', color: '#ffd166', marginBottom: px(14), letterSpacing: px(0.6), textTransform: 'uppercase' }}>
                On TMDB
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(24) }}>
                {tmdbItems.map((it, i) => (
                  <ResultCard key={it.key} it={it} hasTV={i === 0 && !libItems.length} />
                ))}
              </View>
            </>
          ) : null}
          {total === 0 ? (
            <Text style={{ fontSize: px(17), color: '#7f868c', marginTop: px(10) }}>Nothing found. Try a different search.</Text>
          ) : null}
          {demoFallback.length && total === 0 ? null : null}
        </>
      )}
    </ScrollView>
  );
}

function ResultCard({ it, hasTV }: { it: ResultItem; hasTV?: boolean }) {
  const { a } = useStore();
  const demo = TITLES.find((t) => t.id === it.key) || DISCOVER.find((d) => d.id === it.key);
  const discover = it.tmdb ? tmdbDiscoverItem(it.tmdb) : null;
  const press = () => {
    if (it.liveId) a.openTitle(it.liveId);
    else if (discover) a.set({ modal: 'request', reqTmdbItem: discover, reqFields: [0, 0, 0, 0] });
  };
  return (
    <Focusable hasTV={hasTV} onPress={press} focusStyle={{ transform: [{ scale: 1.05 }] }} style={{ width: px(220) }}>
      <View style={{ height: px(220), borderRadius: px(12), overflow: 'hidden' }}>
        <ImgOrGrad uri={demo ? null : it.uri} art={demo ? demo.art : ['#1b3566', '#101a3a', '#05060c']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        {demo ? (
          <View style={{ position: 'absolute', left: px(14), right: px(14), bottom: px(12) }}>
            <TitleGlyph t={it.t} ink={demo.ink} size={22} />
          </View>
        ) : null}
      </View>
      {demo ? (
        <Text numberOfLines={1} style={{ marginTop: px(10), fontSize: px(15), fontWeight: '600', color: C.text }}>{it.t}</Text>
      ) : (
        <>
          <Text numberOfLines={1} style={{ marginTop: px(10), fontSize: px(15), fontWeight: '600', color: C.text }}>{it.t}</Text>
          <Text style={{ fontSize: px(13), color: it.liveId ? '#7dffc0' : '#ffd166', marginTop: px(2) }}>
            {it.liveId ? 'In library' : 'Discover'}{it.sub ? ' · ' + it.sub : ''}
          </Text>
        </>
      )}
    </Focusable>
  );
}
