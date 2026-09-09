import { ScrollView, Text, View } from 'react-native';
import { C, F, px } from '../theme';
import { Btn, Focusable, Grad } from '../ui';
import { EP_OV, EP_TITLES, episodesFor, titleById, useStore } from '../store';

export function EpisodeScreen() {
  const { s, a } = useStore();
  const T = titleById(s.titleId);
  const episodes = episodesFor(s, T);
  const idx = s.epIndex;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingHorizontal: px(64), paddingTop: px(150), paddingBottom: px(90) }}
    >
      <Focusable onPress={() => a.nav('detail', { titleId: s.titleId, season: s.season })} focusStyle={{ transform: [{ scale: 1.05 }] }} style={{ alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: px(16), color: '#8f969c' }}>
          <Text style={{ color: C.textDim }}>{T.t}</Text>  ›  Season {s.season}
        </Text>
      </Focusable>
      <View style={{ flexDirection: 'row', gap: px(40), marginTop: px(28) }}>
        <View style={{ width: px(560) }}>
          <Grad art={T.art} style={{ height: px(316), borderRadius: px(16) }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: px(16), color: '#8f969c' }}>S0{s.season} · E0{idx + 1}</Text>
          <Text style={{ fontFamily: F.head, fontSize: px(40), color: C.text, marginTop: px(8), letterSpacing: -px(0.5) }}>
            {EP_TITLES[(idx + s.season) % EP_TITLES.length]}
          </Text>
          <Text style={{ fontSize: px(16), color: '#9aa1a7', marginTop: px(10) }}>
            42m {idx + 3}s · Aired {12 + idx} Mar {T.yr} · TV-14
          </Text>
          <Text style={{ fontSize: px(18), lineHeight: px(28), color: C.textDim, marginTop: px(16) }}>
            {EP_OV} Vale takes the log off the record, and Yun starts counting the gaps between transmissions instead of the transmissions themselves.
          </Text>
          <View style={{ flexDirection: 'row', gap: px(14), marginTop: px(24) }}>
            <Btn hasTV kind="accent" label={idx === 3 ? '▶ Resume episode' : '▶ Play episode'} onPress={() => a.play(T.id, 'Playing ' + EP_TITLES[(idx + s.season) % EP_TITLES.length])} />
            <Btn kind="soft" label={idx < 3 ? 'Mark as unwatched' : 'Mark as watched'} onPress={() => a.flash(idx < 3 ? 'Marked unwatched' : 'Marked watched')} />
          </View>
          <Text style={{ fontSize: px(15), color: '#8f969c', marginTop: px(14) }}>
            {idx === 3 ? '13m 04s in · 31% watched' : idx < 3 ? 'Watched' : 'Not watched'}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: px(40), gap: px(12), maxWidth: px(960) }}>
        {[
          { label: 'Video', value: '2160p HEVC · HDR10 · 24.0 fps' },
          { label: 'Audio', value: 'English TrueHD Atmos 7.1 · 3 tracks' },
          { label: 'Subtitles', value: '4 embedded tracks · no external search' },
          { label: 'File', value: '18.6 GB · /mnt/media/tv/' + T.t.replace(/ /g, '.') },
        ].map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', gap: px(20), borderBottomWidth: px(1), borderBottomColor: 'rgba(255,255,255,.05)', paddingBottom: px(12) }}>
            <Text style={{ width: px(120), fontSize: px(15), color: '#7f868c' }}>{r.label}</Text>
            <Text style={{ flex: 1, fontSize: px(15), color: C.textDim }}>{r.value}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontFamily: F.head, fontSize: px(26), color: C.text, marginTop: px(44), marginBottom: px(18) }}>Episodes</Text>
      <View style={{ gap: px(10) }}>
        {episodes.map((e, i) => (
          <Focusable
            key={e.num}
            hasTV={i === 0}
            onPress={() => a.nav('episode', { epIndex: i })}
            focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(18),
              maxWidth: px(960),
              backgroundColor: i === idx ? 'rgba(0,212,116,.1)' : '#0f1114',
              borderWidth: px(1),
              borderColor: i === idx ? 'rgba(0,212,116,.4)' : 'rgba(255,255,255,.06)',
              borderRadius: px(12),
              padding: px(12),
            }}
          >
            <Grad art={T.art} style={{ width: px(120), height: px(70), borderRadius: px(8) }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: px(13), color: '#8f969c' }}>{e.num} · {e.dur}</Text>
              <Text style={{ fontSize: px(16), fontWeight: '600', color: C.text, marginTop: px(2) }}>{e.title}</Text>
            </View>
            {e.state ? <Text style={{ fontSize: px(13), fontWeight: '700', color: e.stateColor }}>{e.state}</Text> : null}
          </Focusable>
        ))}
      </View>
    </ScrollView>
  );
}
