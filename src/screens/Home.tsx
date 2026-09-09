import { ScrollView, Text, View } from 'react-native';
import { C, F, asPct, pctOf, px } from '../theme';
import { Avatar, Btn, Chip, Focusable, Grad, ImgOrGrad, Rail, TitleGlyph, type PosterData } from '../ui';
import { DISCOVER, FRIENDS, TITLES, useStore } from '../store';
import { mediaThumbUrl } from '../api/client';
import type { PlexMediaItem } from '../api/types';

export function plexPoster(m: PlexMediaItem, onPress: () => void): PosterData {
  return {
    key: m.ratingKey,
    t: m.title,
    sub: (m.year ? m.year + ' · ' : '') + (m.type === 'movie' ? 'Movie' : 'Series'),
    art: ['#0d4d55', '#0a2030', '#04070c'],
    ink: '#cfe9ff',
    progPct: m.viewOffset && m.duration ? pctOf((m.viewOffset / m.duration) * 100) : undefined,
    uri: mediaThumbUrl(m),
    onPress,
  };
}

export function HomeScreen() {
  const { s, a } = useStore();
  const hero = TITLES[s.hero % 4];

  const railItem = (t: (typeof TITLES)[number]): PosterData => ({
    key: t.id,
    t: t.t,
    sub: t.yr + ' · ' + (t.kind === 'show' ? t.seasons + ' seasons' : t.ep),
    art: t.art,
    ink: t.ink,
    progPct: t.prog ? pctOf(t.prog * 100) : undefined,
    onPress: () => a.openTitle(t.id),
  });

  const libMovies = TITLES.filter((t) => t.kind === 'movie');
  const partyCards = [
    { name: "Drew's Movie Night", watching: 'Rift Runners · 41:20 remaining', pct: '38%', live: true, members: FRIENDS.slice(0, 3) },
    { name: 'Sunday Rewatch', watching: 'Copperline · S02 E07', pct: '62%', live: true, members: FRIENDS.slice(1, 4) },
    { name: 'Anime Club', watching: 'Paper Cranes · starts in 20 min', pct: '0%', live: false, members: FRIENDS.slice(0, 2) },
    { name: 'Late Shift', watching: 'Hollow Signal · S03 E04', pct: '31%', live: true, members: FRIENDS.slice(2, 4) },
  ];

  const discCard = (d: (typeof DISCOVER)[number], hasTV: boolean) => {
    const done = !!s.requested[d.id];
    return (
      <Focusable
        key={d.id}
        hasTV={hasTV}
        onPress={() => a.set({ modal: 'request', reqTarget: d.id, reqFields: [0, 0, 0, 0] })}
        focusStyle={{ transform: [{ scale: 1.05 }] }}
        style={{ width: px(300), marginRight: px(22) }}
      >
        <View style={{ height: px(170), borderRadius: px(14), overflow: 'hidden' }}>
          <ImgOrGrad art={d.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
          <Grad art={['rgba(0,0,0,0)', 'rgba(0,0,0,.75)']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', left: px(16), right: px(16), bottom: px(14) }}>
            <TitleGlyph t={d.t} ink={d.ink} size={24} />
            <Text style={{ fontSize: px(14), color: 'rgba(255,255,255,.75)', marginTop: px(4) }}>{d.rating} ★</Text>
          </View>
        </View>
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: px(12),
            paddingHorizontal: px(18),
            paddingVertical: px(10),
            borderRadius: px(20),
            backgroundColor: done ? 'rgba(0,212,116,.9)' : 'rgba(255,255,255,.16)',
          }}
        >
          <Text style={{ fontSize: px(15), fontWeight: '700', color: done ? '#04120b' : C.text }}>
            {done ? 'Requested ✓' : '+ Request'}
          </Text>
        </View>
      </Focusable>
    );
  };

  const pool = s.discoverTab === 'Popular movies'
    ? DISCOVER.filter((d) => d.kind === 'movie')
    : s.discoverTab === 'Popular shows'
      ? DISCOVER.filter((d) => d.kind === 'show')
      : DISCOVER;
  const rot = (n: number) => pool.concat(pool).slice(n, n + Math.max(pool.length, 5));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingBottom: px(90) }}
    >
      <View style={{ height: px(820), overflow: 'hidden' }}>
        <ImgOrGrad art={hero.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        <Grad
          art={['rgba(7,8,10,.95)', 'rgba(7,8,10,.5)', 'rgba(7,8,10,.1)']}
          deg={90}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <Grad art={['rgba(7,8,10,.75)', 'rgba(7,8,10,0)']} deg={180} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: px(220) }} />
        <Grad art={['rgba(7,8,10,0)', '#07080a']} deg={180} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(260) }} />
        <View style={{ position: 'absolute', left: px(64), top: px(230), maxWidth: px(840) }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: px(16),
              paddingVertical: px(8),
              borderRadius: px(20),
              backgroundColor: 'rgba(0,212,116,.15)',
            }}
          >
            <Text style={{ fontSize: px(15), fontWeight: '600', letterSpacing: px(0.6), textTransform: 'uppercase', color: C.accentSoft }}>
              {hero.prog ? 'Continue watching' : 'New in your library'}
            </Text>
          </View>
          <View style={{ marginTop: px(22) }}>
            <TitleGlyph t={hero.t} ink="#ffffff" size={92} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(18), marginTop: px(20) }}>
            <Text style={{ fontSize: px(18), fontWeight: '700', color: C.accent }}>{hero.rating} ★</Text>
            <Text style={{ fontSize: px(18), color: '#c2c8cd' }}>
              {hero.yr} · {hero.gen.join(' / ')} · {hero.kind === 'show' ? hero.seasons + ' seasons' : hero.ep}
            </Text>
          </View>
          <Text style={{ fontSize: px(20), lineHeight: px(30), color: C.textDim, marginTop: px(18), maxWidth: px(700) }}>
            {hero.ov}
          </Text>
          <View style={{ flexDirection: 'row', gap: px(16), marginTop: px(34) }}>
            <Btn
              hasTV
              kind="accent"
              label={(hero.prog ? '▶ Resume ' + hero.ep.split('—')[0].trim() : '▶ Play')}
              onPress={() => a.play(hero.id, 'Playing ' + hero.t)}
            />
            <Btn kind="soft" label="More info" onPress={() => a.openTitle(hero.id)} />
            <Btn kind="outline" label="Start watch party" onPress={() => a.set({ modal: 'create' })} />
          </View>
        </View>
        <View style={{ position: 'absolute', right: px(64), bottom: px(250), flexDirection: 'row', gap: px(10) }}>
          {[0, 1, 2, 3].map((i) => (
            <Focusable
              key={i}
              hasTV={false}
              onPress={() => a.set({ hero: i })}
              focusStyle={{ borderColor: 'rgba(255,255,255,.6)', borderWidth: px(2) }}
              style={{
                width: i === s.hero % 4 ? px(34) : px(8),
                height: px(8),
                borderRadius: px(4),
                backgroundColor: i === s.hero % 4 ? C.accent : 'rgba(255,255,255,.3)',
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: px(64), marginTop: -px(70), gap: px(52) }}>
        <Rail label="Continue watching" note="Picks up where every device left off" items={TITLES.filter((t) => t.prog).map(railItem)} />

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: px(20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(16) }}>
              <Text style={{ fontFamily: F.head, fontSize: px(28), color: C.text }}>Watch parties</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(9), paddingHorizontal: px(14), paddingVertical: px(6), borderRadius: px(18), backgroundColor: 'rgba(0,212,116,.13)' }}>
                <View style={{ width: px(8), height: px(8), borderRadius: px(4), backgroundColor: C.accent }} />
                <Text style={{ fontSize: px(14), fontWeight: '700', color: C.accentSoft }}>3 live now</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: px(12) }}>
              <Focusable
                onPress={() => a.set({ modal: 'create' })}
                focusStyle={{ transform: [{ scale: 1.06 }] }}
                style={{ paddingHorizontal: px(22), paddingVertical: px(11), borderRadius: px(24), backgroundColor: C.accent }}
              >
                <Text style={{ fontSize: px(16), fontWeight: '700', color: C.ink }}>Create party</Text>
              </Focusable>
              <Focusable
                onPress={() => a.set({ modal: 'join' })}
                focusStyle={{ transform: [{ scale: 1.06 }] }}
                style={{ paddingHorizontal: px(22), paddingVertical: px(11), borderRadius: px(24), backgroundColor: 'rgba(255,255,255,.1)' }}
              >
                <Text style={{ fontSize: px(16), fontWeight: '600', color: C.text }}>Join with code</Text>
              </Focusable>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: px(12) }}>
            {partyCards.map((p, i) => (
              <Focusable
                key={p.name}
                hasTV={i === 0}
                onPress={() => {
                  a.set({ party: p.name, partyPanelOpen: true });
                  a.play(TITLES[(i * 3 + 1) % TITLES.length].id, 'Joined ' + p.name + ' — synced');
                }}
                focusStyle={{ transform: [{ scale: 1.04 }], borderColor: C.accent, borderWidth: px(3) }}
                style={{ width: px(430), marginRight: px(22), borderRadius: px(16), overflow: 'hidden' }}
              >
                <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
                  <ImgOrGrad art={TITLES[(i * 3 + 1) % TITLES.length].art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                  <Grad art={['rgba(7,8,10,.93)', 'rgba(7,8,10,.5)']} deg={120} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                </View>
                <View style={{ padding: px(28), minHeight: px(230) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
                    <View style={{ width: px(9), height: px(9), borderRadius: px(5), backgroundColor: p.live ? C.accent : C.amber }} />
                    <Text style={{ fontSize: px(14), fontWeight: '700', letterSpacing: px(0.8), textTransform: 'uppercase', color: p.live ? C.accent : C.amber }}>
                      {p.live ? 'Live now' : 'Scheduled'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: F.head, fontSize: px(27), color: C.text, marginTop: px(14) }}>{p.name}</Text>
                  <Text style={{ fontSize: px(16), color: '#c1c7cc', marginTop: px(7) }}>{p.watching}</Text>
                  <View style={{ height: px(16) }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(9), marginTop: px(18) }}>
                    {p.members.map((m) => (
                      <Avatar key={m.initials} initials={m.initials} art={m.art} size={36} />
                    ))}
                    <Text style={{ fontSize: px(15), color: '#a7aeb4', marginLeft: px(6) }}>{p.members.length} watching</Text>
                  </View>
                  <View style={{ height: px(5), borderRadius: px(3), backgroundColor: 'rgba(255,255,255,.18)', marginTop: px(16) }}>
                    <View style={{ height: '100%', borderRadius: px(3), width: asPct(p.pct), backgroundColor: C.accent }} />
                  </View>
                </View>
              </Focusable>
            ))}
          </ScrollView>
        </View>

        <Rail label="Recently added" note="Imported this week" items={TITLES.slice(4, 12).map(railItem)} />
        <Rail label="Because you watched Hollow Signal" items={TITLES.slice(2, 10).map(railItem)} />
        <Rail label="Movies in your library" note={libMovies.length + ' titles'} items={libMovies.map(railItem)} />

        <View>
          <Text style={{ fontFamily: F.head, fontSize: px(28), color: C.text, marginBottom: px(4) }}>Discover</Text>
          <Text style={{ fontSize: px(16), color: '#7f868c', marginBottom: px(20) }}>From TMDB · request anything for your server</Text>
          <View style={{ flexDirection: 'row', marginBottom: px(26) }}>
            {(['Trending', 'Popular movies', 'Popular shows'] as const).map((f, i) => (
              <Chip key={f} label={f} active={s.discoverTab === f} hasTV={i === 0} onPress={() => a.set({ discoverTab: f })} />
            ))}
          </View>
          <View style={{ gap: px(40) }}>
            <View>
              <Text style={{ fontFamily: F.head, fontSize: px(24), color: C.text, marginBottom: px(18) }}>
                {s.discoverTab === 'Trending' ? 'Trending this week' : s.discoverTab}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {rot(0).map((d, i) => discCard(d, i === 0))}
              </ScrollView>
            </View>
            <View>
              <Text style={{ fontFamily: F.head, fontSize: px(24), color: C.text, marginBottom: px(18) }}>Recommended for your library</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {rot(2).map((d, i) => discCard(d, false))}
              </ScrollView>
            </View>
            <View>
              <Text style={{ fontFamily: F.head, fontSize: px(24), color: C.text, marginBottom: px(18) }}>
                Most requested by your users
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {rot(4).map((d, i) => discCard(d, false))}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
