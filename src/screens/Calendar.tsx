import { ScrollView, Text, View } from 'react-native';
import { C, F, px } from '../theme';
import { Focusable } from '../ui';
import { TITLES, useStore } from '../store';

const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COUNTS = [2, 1, 3, 2, 1, 0, 2];

export function CalendarScreen() {
  const { a } = useStore();

  const days = DOWS.map((d, i) => {
    const today = i === 2;
    const items = [];
    const n = COUNTS[i];
    for (let j = 0; j < n; j++) {
      const t = TITLES[(i * 3 + j) % TITLES.length];
      const st = i < 2 ? 'downloaded' : today ? 'today' : 'unaired';
      items.push({
        key: j,
        text: t.t + ' S0' + (1 + (j % 3)) + 'E0' + (2 + j),
        sub: st === 'downloaded' ? 'Downloaded' : st === 'today' ? 'Airs tonight' : 'Unaired',
        bg: st === 'downloaded' ? 'rgba(0,212,116,.12)' : st === 'today' ? 'rgba(255,209,102,.13)' : 'rgba(138,180,255,.1)',
        accent: st === 'downloaded' ? '#00D474' : st === 'today' ? '#ffd166' : '#8ab4ff',
      });
    }
    return { dow: d, num: String(8 + i), items, today };
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingHorizontal: px(64), paddingTop: px(150), paddingBottom: px(90) }}
    >
      <Text style={{ fontFamily: F.head, fontSize: px(44), color: C.text }}>Calendar</Text>
      <Text style={{ fontSize: px(17), color: '#7f868c', marginTop: px(8) }}>Sonarr · Radarr · this week</Text>
      <View style={{ flexDirection: 'row', gap: px(18), marginTop: px(20), marginBottom: px(26) }}>
        {[
          { label: 'Downloaded', color: '#00D474' },
          { label: 'Airs today', color: '#ffd166' },
          { label: 'Unaired', color: '#8ab4ff' },
        ].map((l) => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
            <View style={{ width: px(10), height: px(10), borderRadius: px(5), backgroundColor: l.color }} />
            <Text style={{ fontSize: px(14), color: C.textMut }}>{l.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: px(14) }}>
        {days.map((day, di) => (
          <View
            key={day.dow}
            style={{
              flex: 1,
              backgroundColor: day.today ? 'rgba(0,212,116,.06)' : '#0d0f12',
              borderWidth: px(1),
              borderColor: day.today ? 'rgba(0,212,116,.35)' : 'rgba(255,255,255,.06)',
              borderRadius: px(14),
              padding: px(14),
              minHeight: px(560),
            }}
          >
            <Text style={{ fontSize: px(13), color: '#7f868c', textTransform: 'uppercase', letterSpacing: px(1) }}>{day.dow}</Text>
            <Text style={{ fontFamily: F.head, fontSize: px(26), color: day.today ? C.accent : C.text, marginTop: px(4) }}>{day.num}</Text>
            <View style={{ gap: px(10), marginTop: px(14) }}>
              {day.items.map((it) => (
                <Focusable
                  key={it.key}
                  hasTV={di === 0 && it.key === 0}
                  onPress={() => a.openTitle(TITLES[(di * 3 + it.key) % TITLES.length].id)}
                  focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
                  style={{ backgroundColor: it.bg, borderRadius: px(10), padding: px(12), borderLeftWidth: px(3), borderLeftColor: it.accent }}
                >
                  <Text numberOfLines={2} style={{ fontSize: px(14), fontWeight: '600', color: C.text }}>{it.text}</Text>
                  <Text style={{ fontSize: px(12), color: it.accent, marginTop: px(4) }}>{it.sub}</Text>
                </Focusable>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
