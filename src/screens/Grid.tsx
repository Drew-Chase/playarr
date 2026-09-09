import { ScrollView, Text, View } from 'react-native';
import { C, F, pctOf, px } from '../theme';
import { Chip, Focusable, ImgOrGrad, TitleGlyph, type PosterData } from '../ui';
import { TITLES, useStore } from '../store';

export function GridScreen() {
  const { s, a } = useStore();
  const gridSource = s.gridKind === 'movie' ? TITLES.filter((t) => t.kind === 'movie') : TITLES.filter((t) => t.kind === 'show');
  const gridList =
    s.gridFilter === 'In progress'
      ? gridSource.filter((t) => t.prog)
      : s.gridFilter === 'Unwatched'
        ? gridSource.filter((t) => !t.prog)
        : gridSource;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingHorizontal: px(64), paddingTop: px(150), paddingBottom: px(90) }}
    >
      <Text style={{ fontFamily: F.head, fontSize: px(44), color: C.text }}>
        {s.gridKind === 'movie' ? 'Movies' : 'TV Shows'}
      </Text>
      <Text style={{ fontSize: px(17), color: '#7f868c', marginTop: px(8) }}>
        {gridList.length + ' of ' + gridSource.length + ' titles · ' + s.gridFilter}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: px(24), marginBottom: px(34) }}>
        {(['All', 'In progress', 'Unwatched'] as const).map((f, i) => (
          <Chip key={f} label={f} active={s.gridFilter === f} hasTV={i === 0} onPress={() => a.set({ gridFilter: f })} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(26) }}>
        {gridList.map((t, i): React.ReactNode => (
          <Focusable
            key={t.id}
            hasTV={i === 0}
            onPress={() => a.openTitle(t.id)}
            focusStyle={{ transform: [{ scale: 1.05 }] }}
            style={{ width: px(268) }}
          >
            <View style={{ height: px(398), borderRadius: px(14), overflow: 'hidden', backgroundColor: '#000' }}>
              <ImgOrGrad art={t.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
              <View style={{ position: 'absolute', left: px(18), right: px(18), bottom: px(18) }}>
                <TitleGlyph t={t.t} ink={t.ink} size={28} />
              </View>
              {t.prog !== null && t.prog > 0.85 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: px(12),
                    right: px(12),
                    paddingHorizontal: px(10),
                    paddingVertical: px(4),
                    borderRadius: px(6),
                    backgroundColor: 'rgba(0,212,116,.9)',
                  }}
                >
                  <Text style={{ fontSize: px(12), fontWeight: '700', color: C.ink }}>WATCHED</Text>
                </View>
              ) : null}
              {t.prog !== null && t.prog <= 0.85 ? (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(5), backgroundColor: 'rgba(255,255,255,.2)' }}>
                  <View style={{ height: '100%', width: pctOf(t.prog * 100), backgroundColor: C.accent }} />
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={{ marginTop: px(12), fontSize: px(17), fontWeight: '600', color: C.text }}>
              {t.t}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: px(15), color: '#868d93', marginTop: px(3) }}>
              {t.yr} · {t.kind === 'show' ? t.seasons + ' seasons' : t.ep}
            </Text>
          </Focusable>
        ))}
      </View>
    </ScrollView>
  );
}

export type { PosterData };
