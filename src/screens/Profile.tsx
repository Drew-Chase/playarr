import { ScrollView, Text, View } from 'react-native';
import { C, F, px } from '../theme';
import { Avatar, Focusable } from '../ui';
import { FRIENDS, useStore } from '../store';

export function ProfileScreen() {
  const { a } = useStore();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: px(64), paddingTop: px(150), paddingBottom: px(90) }}
    >
      <Text style={{ fontFamily: F.head, fontSize: px(44), color: C.text }}>Profiles</Text>
      <View style={{ flexDirection: 'row', gap: px(28), marginTop: px(36) }}>
        {FRIENDS.map((f, i) => (
          <Focusable
            key={f.name}
            hasTV={i === 0}
            onPress={() => a.flash('Switched to ' + f.name)}
            focusStyle={{ transform: [{ scale: 1.06 }], borderColor: C.accent, borderWidth: px(3) }}
            style={{ alignItems: 'center', width: px(180), borderRadius: px(16), padding: px(10) }}
          >
            <Avatar initials={f.initials} art={f.art} size={110} ring={i === 0 ? C.accent : undefined} />
            <Text style={{ fontSize: px(19), fontWeight: '700', color: C.text, marginTop: px(14) }}>{f.name}</Text>
            <Text style={{ fontSize: px(14), color: '#8f969c', marginTop: px(3) }}>
              {['Owner · 4K', 'Standard', 'Standard', 'Kids'][i]}
            </Text>
          </Focusable>
        ))}
      </View>

      <Text style={{ fontFamily: F.head, fontSize: px(26), color: C.text, marginTop: px(52), marginBottom: px(18) }}>Playback &amp; account</Text>
      <View style={{ gap: px(10), maxWidth: px(900) }}>
        {[
          { label: 'Watch party sync tolerance', value: '±250 ms', color: '#00D474', sub: 'Auto-corrects drift between viewers' },
          { label: 'Preferred quality on this TV', value: '2160p HDR', color: '#00D474', sub: 'Falls back to 1080p on slow links' },
          { label: 'Skip intros automatically', value: 'On', color: '#7dffc0', sub: 'Uses chapter markers when present' },
          { label: 'Request approval', value: 'Owner only', color: '#8ab4ff', sub: 'Who can send new titles to Sonarr / Radarr' },
        ].map((x, i) => (
          <Focusable
            key={x.label}
            hasTV={i === 0}
            onPress={() => a.flash(x.label + ' — ' + x.value)}
            focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#0f1114',
              borderWidth: px(1),
              borderColor: 'rgba(255,255,255,.06)',
              borderRadius: px(14),
              paddingHorizontal: px(24),
              paddingVertical: px(18),
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: px(17), fontWeight: '600', color: C.text }}>{x.label}</Text>
              <Text style={{ fontSize: px(14), color: '#7f868c', marginTop: px(3) }}>{x.sub}</Text>
            </View>
            <Text style={{ fontSize: px(16), fontWeight: '700', color: x.color }}>{x.value}</Text>
          </Focusable>
        ))}
      </View>
    </ScrollView>
  );
}
