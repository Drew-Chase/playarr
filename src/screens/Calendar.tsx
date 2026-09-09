import { ScrollView, Text, View } from 'react-native';
import { C, F, px } from '../theme';
import { Focusable } from '../ui';
import { TITLES, useStore } from '../store';
import { useRadarrCalendar, useSonarrCalendar } from '../api/useLive';

const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalEvent {
  text: string;
  sub: string;
  color: string;
  bg: string;
  dateKey: string;
  targetId: string | null;
}

function weekDates(): { dow: string; num: string; dateKey: string; isToday: boolean }[] {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  return DOWS.map((d, i) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const isToday = day.toDateString() === now.toDateString();
    return {
      dow: d,
      num: String(day.getDate()),
      dateKey: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
      isToday,
    };
  });
}

function toDay(dateish: string | null | undefined): string {
  if (!dateish) return '';
  return dateish.slice(0, 10);
}

export function CalendarScreen() {
  const { a } = useStore();
  const { data: radarr } = useRadarrCalendar();
  const { data: sonarr } = useSonarrCalendar();
  const days = weekDates();
  const todayKey = days.find((d) => d.isToday)?.dateKey ?? '';

  const perDay = new Map<string, CalEvent[]>();
  const add = (dateKey: string, ev: CalEvent) => {
    const list = perDay.get(dateKey) ?? [];
    list.push(ev);
    perDay.set(dateKey, list);
  };

  for (const movie of radarr ?? []) {
    const title = String(movie.title ?? 'Unknown');
    const target = typeof movie.tmdbId === 'number' ? 'tmdb:' + movie.tmdbId : null;
    const ev = (kind: string): Omit<CalEvent, 'dateKey'> => ({
      text: title,
      sub: kind + (movie.hasFile ? ' · Downloaded' : ''),
      color: movie.hasFile ? '#00D474' : kind === 'Digital' ? '#ffd166' : '#8ab4ff',
      bg: movie.hasFile ? 'rgba(0,212,116,.12)' : 'rgba(138,180,255,.1)',
      targetId: target,
    });
    const phys = toDay(movie.physicalRelease as string);
    const dig = toDay(movie.digitalRelease as string);
    const cin = toDay(movie.inCinemas as string);
    if (phys) add(phys, { ...ev('Physical release'), dateKey: phys });
    if (dig && dig !== phys) add(dig, { ...ev('Digital release'), dateKey: dig });
    if (cin && cin !== dig && cin !== phys) add(cin, { ...ev('In cinemas'), dateKey: cin });
  }

  for (const ep of sonarr ?? []) {
    const series = (ep.series as { title?: string } | undefined)?.title ?? (ep.seriesTitle as string) ?? 'Episode';
    const title = String(ep.title ?? '');
    const se = ep.seasonNumber != null && ep.episodeNumber != null ? `S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}` : '';
    const air = toDay(ep.airDate as string);
    if (!air) continue;
    add(air, {
      text: `${series} ${se}`,
      sub: title + (ep.hasFile ? ' · Downloaded' : air === todayKey ? ' · Airs tonight' : ' · Unaired'),
      color: ep.hasFile ? '#00D474' : air === todayKey ? '#ffd166' : '#8ab4ff',
      bg: ep.hasFile ? 'rgba(0,212,116,.12)' : air === todayKey ? 'rgba(255,209,102,.13)' : 'rgba(138,180,255,.1)',
      dateKey: air,
      targetId: null,
    });
  }

  const live = !!radarr || !!sonarr;

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
          { label: 'Upcoming', color: '#8ab4ff' },
        ].map((l) => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
            <View style={{ width: px(10), height: px(10), borderRadius: px(5), backgroundColor: l.color }} />
            <Text style={{ fontSize: px(14), color: C.textMut }}>{l.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: px(14) }}>
        {days.map((day, di) => {
          const items = perDay.get(day.dateKey) ?? [];
          return (
            <View
              key={day.dow}
              style={{
                flex: 1,
                backgroundColor: day.isToday ? 'rgba(0,212,116,.06)' : '#0d0f12',
                borderWidth: px(1),
                borderColor: day.isToday ? 'rgba(0,212,116,.35)' : 'rgba(255,255,255,.06)',
                borderRadius: px(14),
                padding: px(14),
                minHeight: px(560),
              }}
            >
              <Text style={{ fontSize: px(13), color: '#7f868c', textTransform: 'uppercase', letterSpacing: px(1) }}>{day.dow}</Text>
              <Text style={{ fontFamily: F.head, fontSize: px(26), color: day.isToday ? C.accent : C.text, marginTop: px(4) }}>{day.num}</Text>
              <View style={{ gap: px(10), marginTop: px(14) }}>
                {items.map((it, i) => (
                  <Focusable
                    key={i}
                    hasTV={di === 0 && i === 0}
                    onPress={() => a.flash(it.text + ' · ' + it.sub)}
                    focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
                    style={{ backgroundColor: it.bg, borderRadius: px(10), padding: px(12), borderLeftWidth: px(3), borderLeftColor: it.color }}
                  >
                    <Text numberOfLines={2} style={{ fontSize: px(14), fontWeight: '600', color: C.text }}>{it.text}</Text>
                    <Text style={{ fontSize: px(12), color: it.color, marginTop: px(4) }}>{it.sub}</Text>
                  </Focusable>
                ))}
                {live && items.length === 0 ? (
                  <Text style={{ fontSize: px(12), color: '#4a5056' }}>—</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      {!live ? (
        <Text style={{ fontSize: px(14), color: '#5d646a', marginTop: px(18) }}>
          Loading calendar from Sonarr and Radarr… (Demo items: {TITLES.length} titles available offline.)
        </Text>
      ) : null}
    </ScrollView>
  );
}
