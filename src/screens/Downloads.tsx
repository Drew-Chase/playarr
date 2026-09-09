import { ScrollView, Text, View } from 'react-native';
import { C, F, asPct, px } from '../theme';
import { Focusable } from '../ui';
import { useStore } from '../store';

const QUEUE = [
  { t: 'Vault.of.Ash.S01E03.2160p.WEB-DL.DV.HDR10-PLAYARR', size: '18.6 GB', speed: '64.2 MB/s', eta: '4m 12s', pct: '68%', color: '#00D474', sub: 'Importing to /mnt/media/tv · Sonarr' },
  { t: 'Rift.Runners.2025.1080p.BluRay.REMUX-PLAYARR', size: '34.1 GB', speed: '41.8 MB/s', eta: '11m 40s', pct: '34%', color: '#00D474', sub: 'Radarr · quality profile Remux' },
  { t: 'Copperline.S02E08.1080p.WEB-DL.DDP5.1-PLAYARR', size: '6.2 GB', speed: '—', eta: 'Queued', pct: '0%', color: '#8ab4ff', sub: 'Waiting on slot 3 of 3' },
  { t: 'Saltmark.S01E01.2160p.WEB-DL.HEVC-PLAYARR', size: '12.4 GB', speed: '—', eta: 'Done', pct: '100%', color: '#7dffc0', sub: 'Imported 12 minutes ago' },
];

const REQUEST_ROWS = [
  { t: 'Harbourlight', status: 'Downloading', sub: 'Sonarr · S01 pack · NZBgeek · 2160p WEB-DL', pct: '68%', eta: '4m left', pill: 'go', color: '#00D474', pillBg: 'rgba(0,212,116,.14)', pillFg: '#7dffc0' },
  { t: 'Slow Orbit', status: 'Searching', sub: 'Radarr · 14 indexers · no cut-off match yet', pct: '12%', eta: 'Retrying', pill: 'wait', color: '#ffd166', pillBg: 'rgba(255,209,102,.15)', pillFg: '#ffd166' },
  { t: 'Nine Winters', status: 'Imported', sub: 'Available in your library · 1080p Remux', pct: '100%', eta: 'Ready', pill: 'done', color: '#00D474', pillBg: 'rgba(0,212,116,.18)', pillFg: '#7dffc0' },
  { t: 'Bright Fever', status: 'Pending approval', sub: 'Requested by Theo · needs your OK', pct: '0%', eta: 'Awaiting', pill: 'hold', color: '#8ab4ff', pillBg: 'rgba(138,180,255,.15)', pillFg: '#8ab4ff' },
];

export function DownloadsScreen() {
  const { a } = useStore();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingHorizontal: px(64), paddingTop: px(150), paddingBottom: px(90) }}
    >
      <Text style={{ fontFamily: F.head, fontSize: px(44), color: C.text }}>Activity</Text>
      <Text style={{ fontSize: px(17), color: '#7f868c', marginTop: px(8) }}>Downloads &amp; requests</Text>

      <View style={{ flexDirection: 'row', gap: px(18), marginTop: px(30) }}>
        {[
          { label: 'Active', value: '2', color: '#00D474' },
          { label: 'Download rate', value: '106 MB/s', color: '#7dffc0' },
          { label: 'Queued', value: '1', color: '#8ab4ff' },
          { label: 'Imported today', value: '9', color: '#f3f5f6' },
        ].map((st) => (
          <View key={st.label} style={{ flex: 1, backgroundColor: '#0f1114', borderWidth: px(1), borderColor: 'rgba(255,255,255,.06)', borderRadius: px(14), padding: px(22) }}>
            <Text style={{ fontSize: px(14), color: '#7f868c' }}>{st.label}</Text>
            <Text style={{ fontFamily: F.head, fontSize: px(32), color: st.color, marginTop: px(8) }}>{st.value}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontFamily: F.head, fontSize: px(26), color: C.text, marginTop: px(40), marginBottom: px(18) }}>Queue</Text>
      <View style={{ gap: px(12) }}>
        {QUEUE.map((d, i) => (
          <Focusable
            key={d.t}
            hasTV={i === 0}
            onPress={() => a.flash('Opened ' + d.t.split('.')[0])}
            focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
            style={{ backgroundColor: '#0f1114', borderWidth: px(1), borderColor: 'rgba(255,255,255,.06)', borderRadius: px(14), padding: px(20) }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(18) }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: px(16), fontWeight: '600', color: C.text }}>{d.t}</Text>
              <Text style={{ fontSize: px(14), color: '#8f969c' }}>{d.size}</Text>
            </View>
            <Text style={{ fontSize: px(13), color: '#7f868c', marginTop: px(5) }}>{d.sub}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), marginTop: px(14) }}>
              <View style={{ flex: 1, height: px(6), borderRadius: px(3), backgroundColor: 'rgba(255,255,255,.12)' }}>
                <View style={{ height: '100%', borderRadius: px(3), width: asPct(d.pct), backgroundColor: d.color }} />
              </View>
              <Text style={{ fontSize: px(13), fontWeight: '700', color: d.color, minWidth: px(44), textAlign: 'right' }}>{d.pct}</Text>
              <Text style={{ fontSize: px(13), color: '#8f969c', minWidth: px(90), textAlign: 'right' }}>
                {d.speed} · {d.eta}
              </Text>
            </View>
          </Focusable>
        ))}
      </View>

      <Text style={{ fontFamily: F.head, fontSize: px(26), color: C.text, marginTop: px(44), marginBottom: px(18) }}>Requests</Text>
      <View style={{ gap: px(12) }}>
        {REQUEST_ROWS.map((r, i) => (
          <Focusable
            key={r.t}
            hasTV={i === 0 && QUEUE.length === 0}
            onPress={() => a.flash(r.t + ' · ' + r.status)}
            focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
            style={{ backgroundColor: '#0f1114', borderWidth: px(1), borderColor: 'rgba(255,255,255,.06)', borderRadius: px(14), padding: px(20) }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(18) }}>
              <Text style={{ fontSize: px(18), fontWeight: '700', color: C.text }}>{r.t}</Text>
              <View style={{ paddingHorizontal: px(14), paddingVertical: px(6), borderRadius: px(16), backgroundColor: r.pillBg }}>
                <Text style={{ fontSize: px(13), fontWeight: '700', color: r.pillFg }}>{r.status}</Text>
              </View>
            </View>
            <Text style={{ fontSize: px(13), color: '#7f868c', marginTop: px(5) }}>{r.sub}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), marginTop: px(14) }}>
              <View style={{ flex: 1, height: px(6), borderRadius: px(3), backgroundColor: 'rgba(255,255,255,.12)' }}>
                <View style={{ height: '100%', borderRadius: px(3), width: asPct(r.pct), backgroundColor: r.color }} />
              </View>
              <Text style={{ fontSize: px(13), color: '#8f969c' }}>{r.eta}</Text>
            </View>
          </Focusable>
        ))}
      </View>
    </ScrollView>
  );
}
