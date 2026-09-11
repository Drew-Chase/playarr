import { ScrollView, Text, View } from 'react-native';
import { C, F, asPct, px } from '../theme';
import { Focusable } from '../ui';
import { useStore } from '../store';
import { useDownloads } from '../api/useLive';
import { fmtSize, fmtSpeed } from '../api/mappers';

export function DownloadsScreen() {
  const { a } = useStore();
  const { data: status } = useDownloads();

  const queue = status?.queue ?? [];
  const history = status?.history ?? [];
  const activeCount = queue.filter((d) => !/done|complete|paused/i.test(d.status)).length;
  const rate = status?.total_speed ?? 0;

  const stats = [
    { label: 'Active', value: String(activeCount), color: '#00D474' },
    { label: 'Download rate', value: fmtSpeed(rate), color: '#7dffc0' },
    { label: 'Queued', value: String(status?.queue_size ?? queue.length), color: '#8ab4ff' },
    { label: 'History', value: String(history.length), color: '#f3f5f6' },
  ];

  return (
    <ScrollView removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingHorizontal: px(64), paddingTop: px(150), paddingBottom: px(90) }}
    >
      <Text style={{ fontFamily: F.head, fontSize: px(44), color: C.text }}>Activity</Text>
      <Text style={{ fontSize: px(17), color: '#7f868c', marginTop: px(8) }}>Downloads &amp; requests</Text>

      <View style={{ flexDirection: 'row', gap: px(18), marginTop: px(30) }}>
        {stats.map((st) => (
          <View key={st.label} style={{ flex: 1, backgroundColor: '#0f1114', borderWidth: px(1), borderColor: 'rgba(255,255,255,.06)', borderRadius: px(14), padding: px(22) }}>
            <Text style={{ fontSize: px(14), color: '#7f868c' }}>{st.label}</Text>
            <Text style={{ fontFamily: F.head, fontSize: px(32), color: st.color, marginTop: px(8) }}>{st.value}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontFamily: F.head, fontSize: px(26), color: C.text, marginTop: px(40), marginBottom: px(18) }}>Queue</Text>
      {queue.length === 0 ? (
        <View style={{ backgroundColor: '#0f1114', borderWidth: px(1), borderColor: 'rgba(255,255,255,.06)', borderRadius: px(14), padding: px(28) }}>
          <Text style={{ fontSize: px(17), color: '#7f868c' }}>No active downloads. New requests will appear here as Sonarr and Radarr grab them.</Text>
        </View>
      ) : (
        <View style={{ gap: px(12) }}>
          {queue.map((d, i) => {
            const pct = d.progress > 0 && d.progress <= 1 ? Math.round(d.progress * 100) : Math.round(d.progress || 0);
            return (
              <Focusable
                key={d.name + i}
                hasTV={i === 0}
                onPress={() => a.flash(d.name.split('.')[0] + ' · ' + d.status)}
                focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
                style={{ backgroundColor: '#0f1114', borderWidth: px(1), borderColor: 'rgba(255,255,255,.06)', borderRadius: px(14), padding: px(20) }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(18) }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: px(16), fontWeight: '600', color: C.text }}>{d.name}</Text>
                  <Text style={{ fontSize: px(14), color: '#8f969c' }}>{fmtSize(d.size)}</Text>
                </View>
                <Text style={{ fontSize: px(13), color: '#7f868c', marginTop: px(5) }}>
                  {[d.client_name, d.client_type, d.status].filter(Boolean).join(' · ')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), marginTop: px(14) }}>
                  <View style={{ flex: 1, height: px(6), borderRadius: px(3), backgroundColor: 'rgba(255,255,255,.12)' }}>
                    <View style={{ height: '100%', borderRadius: px(3), width: asPct(String(Math.min(pct, 100))), backgroundColor: pct >= 100 ? '#7dffc0' : '#00D474' }} />
                  </View>
                  <Text style={{ fontSize: px(13), fontWeight: '700', color: '#00D474', minWidth: px(44), textAlign: 'right' }}>{pct}%</Text>
                  <Text style={{ fontSize: px(13), color: '#8f969c', minWidth: px(110), textAlign: 'right' }}>
                    {[fmtSpeed(d.speed), d.eta].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Focusable>
            );
          })}
        </View>
      )}

      <Text style={{ fontFamily: F.head, fontSize: px(26), color: C.text, marginTop: px(44), marginBottom: px(18) }}>History</Text>
      {history.length === 0 ? (
        <View style={{ backgroundColor: '#0f1114', borderWidth: px(1), borderColor: 'rgba(255,255,255,.06)', borderRadius: px(14), padding: px(28) }}>
          <Text style={{ fontSize: px(17), color: '#7f868c' }}>No download history yet.</Text>
        </View>
      ) : (
        <View style={{ gap: px(12) }}>
          {history.slice(0, 12).map((d, i) => (
            <Focusable
              key={d.name + i}
              hasTV={false}
              onPress={() => a.flash(d.name.split('.')[0] + ' · ' + d.status)}
              focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
              style={{ backgroundColor: '#0f1114', borderWidth: px(1), borderColor: 'rgba(255,255,255,.06)', borderRadius: px(14), padding: px(20) }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(18) }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: px(16), fontWeight: '600', color: C.text }}>{d.name}</Text>
                <Text style={{ fontSize: px(13), fontWeight: '700', color: /import|completed|done/i.test(d.status) ? '#7dffc0' : '#ffd166' }}>{d.status}</Text>
              </View>
              <Text style={{ fontSize: px(13), color: '#7f868c', marginTop: px(5) }}>
                {[fmtSize(d.size), d.client_name, d.completed_at ? new Date(d.completed_at).toLocaleString() : null].filter(Boolean).join(' · ')}
              </Text>
            </Focusable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
