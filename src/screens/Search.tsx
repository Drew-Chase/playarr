import { ScrollView, Text, View } from 'react-native';
import { C, F, px } from '../theme';
import { Focusable, ImgOrGrad, TitleGlyph } from '../ui';
import { DISCOVER, TITLES, useStore } from '../store';
import type { DiscoverItem, Title } from '../data';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U'],
  ['I', 'O', 'P', 'A', 'S', 'D', 'F'],
  ['G', 'H', 'J', 'K', 'L', 'Z', 'X'],
  ['C', 'V', 'B', 'N', 'M'],
];

export function SearchScreen() {
  const { s, a } = useStore();
  const q = s.query.trim().toLowerCase();
  const searchPool: (Title | DiscoverItem)[] = [...TITLES, ...DISCOVER];
  const results = q ? searchPool.filter((t) => t.t.toLowerCase().includes(q)) : TITLES.slice(0, 8);

  return (
    <ScrollView
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
              hasTV={i === 0 && ROWS.length === 0}
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
        {q ? results.length + ' results for “' + s.query + '”' : 'Suggested from your library'}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(24) }}>
        {results.map((t, i) => {
          const inLib = TITLES.some((x) => x.id === t.id);
          return (
            <Focusable
              key={t.id}
              hasTV={i === 0}
              onPress={() => (inLib ? a.openTitle(t.id) : a.set({ modal: 'request', reqTarget: t.id, reqFields: [0, 0, 0, 0] }))}
              focusStyle={{ transform: [{ scale: 1.05 }] }}
              style={{ width: px(220) }}
            >
              <View style={{ height: px(220), borderRadius: px(12), overflow: 'hidden' }}>
                <ImgOrGrad art={t.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                <View style={{ position: 'absolute', left: px(14), right: px(14), bottom: px(12) }}>
                  <TitleGlyph t={t.t} ink={t.ink} size={22} />
                </View>
              </View>
              <Text numberOfLines={1} style={{ marginTop: px(10), fontSize: px(15), fontWeight: '600', color: C.text }}>{t.t}</Text>
              <Text style={{ fontSize: px(13), color: inLib ? '#7dffc0' : '#ffd166', marginTop: px(2) }}>
                {inLib ? 'In library' : 'Discover'} · {t.yr}
              </Text>
            </Focusable>
          );
        })}
      </View>
    </ScrollView>
  );
}
