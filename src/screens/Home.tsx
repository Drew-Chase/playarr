import { ScrollView, Text, View } from 'react-native';
import { C, F, asPct, pctOf, px } from '../theme';
import { Avatar, Btn, Chip, Focusable, Grad, ImgOrGrad, Rail, TitleGlyph, type PosterData } from '../ui';
import { DISCOVER, FRIENDS, TITLES, useStore } from '../store';
import {
  artUrl,
  detailTarget,
  displayTitle,
  progressPct,
  subFor,
  thumbUrl,
  tmdbDiscoverItem,
  tmdbToPoster,
  toPoster,
  fmtDuration,
} from '../api/mappers';
import { useContinueWatching, useLibraryItems, useLibraries, useRecentlyAdded, useTrending } from '../api/useLive';
import type { PlexMediaItem, TmdbItem } from '../api/types';



export function HomeScreen() {
  const { s, a } = useStore();
  const { data: cw } = useContinueWatching();
  const { data: ra } = useRecentlyAdded();
  const { data: libs } = useLibraries();
  const { data: trending } = useTrending();
  const movieLib = libs?.find((l) => l.type === 'movie');
  const showLib = libs?.find((l) => l.type === 'show');
  const { data: movieItems } = useLibraryItems(movieLib?.key ?? null);
  const { data: showItems } = useLibraryItems(showLib?.key ?? null);

  const heroModel = (m: PlexMediaItem) => {
    const artId = m.type === 'episode' ? m.grandparentRatingKey || m.ratingKey : m.ratingKey;
    const resume = !!m.viewOffset && m.viewOffset > 0;
    return {
      tag: m.type === 'episode' ? 'Continue watching' : 'New in your library',
      title: displayTitle(m),
      rating: m.audienceRating ? m.audienceRating.toFixed(1) + ' ★' : null,
      meta: [
        m.year ? String(m.year) : '',
        m.contentRating || '',
        m.type === 'episode'
          ? `S${m.parentIndex} · E${m.index}`
          : m.type === 'show'
            ? `${m.childCount ?? ''} seasons`
            : fmtDuration(m.duration),
      ]
        .filter(Boolean)
        .join(' · '),
      overview: m.summary || 'No overview available.',
      playLabel: resume ? '▶ Resume' : '▶ Play',
      art: artUrl({ ratingKey: artId }),
      onPlay: () =>
        a.play(
          m.ratingKey,
          'Playing ' + displayTitle(m),
          {
            title: displayTitle(m),
            sub: subFor(m),
            art: artUrl({ ratingKey: artId }),
          },
          m.viewOffset ? m.viewOffset / 1000 : undefined
        ),
      onInfo: () => a.openTitle(detailTarget(m)),
    };
  };

  const heroSource: PlexMediaItem[] = [
    ...(cw ?? []).slice(0, 2),
    ...(ra ?? []).filter((x) => x.type === 'movie' || x.type === 'show').slice(0, 3),
  ];
  const liveHeroOn = heroSource.length > 0;
  const liveHero = liveHeroOn ? heroModel(heroSource[s.hero % heroSource.length]) : null;
  const demoHero = TITLES[s.hero % 4];

  const demoRailItem = (t: (typeof TITLES)[number]): PosterData => ({
    key: t.id,
    t: t.t,
    sub: t.yr + ' · ' + (t.kind === 'show' ? t.seasons + ' seasons' : t.ep),
    art: t.art,
    ink: t.ink,
    progPct: t.prog ? pctOf(t.prog * 100) : undefined,
    onPress: () => a.openTitle(t.id),
  });

  const continueItems: PosterData[] = cw?.length
    ? cw.map((m) => toPoster(m, () => a.openTitle(detailTarget(m))))
    : TITLES.filter((t) => t.prog).map(demoRailItem);

  const recentItems: PosterData[] = ra?.length
    ? ra.slice(0, 12).map((m) => toPoster(m, () => a.openTitle(detailTarget(m))))
    : TITLES.slice(4, 12).map(demoRailItem);

  const movieRail: PosterData[] = movieItems?.length
    ? movieItems.slice(0, 12).map((m) => toPoster(m, () => a.openTitle(m.ratingKey)))
    : TITLES.filter((t) => t.kind === 'movie').map(demoRailItem);

  const showRail: PosterData[] = showItems?.length
    ? showItems.slice(0, 12).map((m) => toPoster(m, () => a.openTitle(m.ratingKey)))
    : TITLES.filter((t) => t.kind === 'show').map(demoRailItem);

  const partyCards = [
    { name: "Drew's Movie Night", watching: 'Rift Runners · 41:20 remaining', pct: '38%', live: true, members: FRIENDS.slice(0, 3) },
    { name: 'Sunday Rewatch', watching: 'Copperline · S02 E07', pct: '62%', live: true, members: FRIENDS.slice(1, 4) },
    { name: 'Anime Club', watching: 'Paper Cranes · starts in 20 min', pct: '0%', live: false, members: FRIENDS.slice(0, 2) },
    { name: 'Late Shift', watching: 'Hollow Signal · S03 E04', pct: '31%', live: true, members: FRIENDS.slice(2, 4) },
  ];

  const demoDiscCard = (d: (typeof DISCOVER)[number], hasTV: boolean) => (
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
          backgroundColor: s.requested[d.id] ? 'rgba(0,212,116,.9)' : 'rgba(255,255,255,.16)',
        }}
      >
        <Text style={{ fontSize: px(15), fontWeight: '700', color: s.requested[d.id] ? '#04120b' : C.text }}>
          {s.requested[d.id] ? 'Requested ✓' : '+ Request'}
        </Text>
      </View>
    </Focusable>
  );

  const liveDiscCard = (item: TmdbItem, hasTV: boolean) => {
    const id = 'tmdb:' + item.id;
    const poster = tmdbToPoster(item, () => a.set({ modal: 'request', reqTmdbItem: tmdbDiscoverItem(item), reqFields: [0, 0, 0, 0] }));
    return (
      <Focusable
        key={id}
        hasTV={hasTV}
        onPress={poster.onPress}
        focusStyle={{ transform: [{ scale: 1.05 }] }}
        style={{ width: px(300), marginRight: px(22) }}
      >
        <View style={{ height: px(170), borderRadius: px(14), overflow: 'hidden', backgroundColor: '#000' }}>
          <ImgOrGrad uri={poster.uri} art={poster.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
          <Grad art={['rgba(0,0,0,0)', 'rgba(0,0,0,.75)']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', left: px(16), right: px(16), bottom: px(14) }}>
            <TitleGlyph t={poster.t} ink={poster.ink} size={24} />
            <Text style={{ fontSize: px(14), color: 'rgba(255,255,255,.75)', marginTop: px(4) }}>
              {item.vote_average ? item.vote_average.toFixed(1) + ' ★' : ''}
            </Text>
          </View>
        </View>
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: px(12),
            paddingHorizontal: px(18),
            paddingVertical: px(10),
            borderRadius: px(20),
            backgroundColor: s.requested[id] ? 'rgba(0,212,116,.9)' : 'rgba(255,255,255,.16)',
          }}
        >
          <Text style={{ fontSize: px(15), fontWeight: '700', color: s.requested[id] ? '#04120b' : C.text }}>
            {s.requested[id] ? 'Requested ✓' : '+ Request'}
          </Text>
        </View>
      </Focusable>
    );
  };

  const trendingAll: TmdbItem[] | null = trending ? [...(trending.movies || []), ...(trending.tv || [])] : null;
  const discoverSets: { label: string; items: TmdbItem[] }[] | null = trending
    ? [
        { label: s.discoverTab === 'Trending' ? 'Trending this week' : s.discoverTab, items: s.discoverTab === 'Popular movies' ? trending.movies || [] : s.discoverTab === 'Popular shows' ? trending.tv || [] : trendingAll || [] },
        { label: 'Popular on TMDB', items: (trending.tv || []).slice(0, 10) },
        { label: 'Popular movies on TMDB', items: (trending.movies || []).slice(0, 10) },
      ]
    : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingBottom: px(90) }}
    >
      <View style={{ height: px(820), overflow: 'hidden' }}>
        {liveHero && liveHeroOn ? (
          <ImgOrGrad uri={liveHero.art} art={demoHero.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        ) : (
          <ImgOrGrad art={demoHero.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        )}
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
              {liveHeroOn && liveHero ? liveHero.tag : demoHero.prog ? 'Continue watching' : 'New in your library'}
            </Text>
          </View>
          <View style={{ marginTop: px(22) }}>
            <TitleGlyph t={liveHeroOn && liveHero ? liveHero.title : demoHero.t} ink="#ffffff" size={liveHeroOn && liveHero && liveHero.title.length > 16 ? 64 : 92} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(18), marginTop: px(20) }}>
            {liveHeroOn && liveHero && liveHero.rating ? (
              <Text style={{ fontSize: px(18), fontWeight: '700', color: C.accent }}>{liveHero.rating}</Text>
            ) : (
              <Text style={{ fontSize: px(18), fontWeight: '700', color: C.accent }}>{demoHero.rating} ★</Text>
            )}
            <Text numberOfLines={1} style={{ fontSize: px(18), color: '#c2c8cd', flexShrink: 1 }}>
              {liveHeroOn && liveHero ? liveHero.meta : `${demoHero.yr} · ${demoHero.gen.join(' / ')} · ${demoHero.kind === 'show' ? demoHero.seasons + ' seasons' : demoHero.ep}`}
            </Text>
          </View>
          <Text numberOfLines={3} style={{ fontSize: px(20), lineHeight: px(30), color: C.textDim, marginTop: px(18), maxWidth: px(700) }}>
            {liveHeroOn && liveHero ? liveHero.overview : demoHero.ov}
          </Text>
          <View style={{ flexDirection: 'row', gap: px(16), marginTop: px(34) }}>
            <Btn
              hasTV
              kind="accent"
              label={liveHeroOn && liveHero ? liveHero.playLabel : demoHero.prog ? '▶ Resume ' + demoHero.ep.split('—')[0].trim() : '▶ Play'}
              onPress={() => {
                if (liveHeroOn && liveHero) liveHero.onPlay();
                else a.play(demoHero.id, 'Playing ' + demoHero.t);
              }}
            />
            <Btn
              kind="soft"
              label="More info"
              onPress={() => (liveHeroOn && liveHero ? liveHero.onInfo() : a.openTitle(demoHero.id))}
            />
            <Btn kind="outline" label="Start watch party" onPress={() => a.set({ modal: 'create' })} />
          </View>
        </View>
        <View style={{ position: 'absolute', right: px(64), bottom: px(250), flexDirection: 'row', gap: px(10) }}>
          {Array.from({ length: 4 }, (_, i) => i).map((i) => {
            const on = liveHeroOn ? i === s.hero % Math.min(heroSource.length, 4) : i === s.hero % 4;
            return (
              <Focusable
                key={i}
                hasTV={false}
                onPress={() => a.set({ hero: i })}
                focusStyle={{ borderColor: 'rgba(255,255,255,.6)', borderWidth: px(2) }}
                style={{
                  width: on ? px(34) : px(8),
                  height: px(8),
                  borderRadius: px(4),
                  backgroundColor: on ? C.accent : 'rgba(255,255,255,.3)',
                }}
              />
            );
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: px(64), marginTop: -px(70), gap: px(52) }}>
        <Rail label="Continue watching" note="Picks up where every device left off" items={continueItems} />

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

        <Rail label="Recently added" note="From your libraries" items={recentItems} />
        <Rail label="Movies in your library" note={movieLib ? movieLib.title : undefined} items={movieRail} />
        <Rail label="TV in your library" note={showLib ? showLib.title : undefined} items={showRail} />

        <View>
          <Text style={{ fontFamily: F.head, fontSize: px(28), color: C.text, marginBottom: px(4) }}>Discover</Text>
          <Text style={{ fontSize: px(16), color: '#7f868c', marginBottom: px(20) }}>From TMDB · request anything for your server</Text>
          <View style={{ flexDirection: 'row', marginBottom: px(26) }}>
            {(['Trending', 'Popular movies', 'Popular shows'] as const).map((f, i) => (
              <Chip key={f} label={f} active={s.discoverTab === f} hasTV={i === 0} onPress={() => a.set({ discoverTab: f })} />
            ))}
          </View>
          {discoverSets ? (
            <View style={{ gap: px(40) }}>
              {discoverSets.map((set) => (
                <View key={set.label}>
                  <Text style={{ fontFamily: F.head, fontSize: px(24), color: C.text, marginBottom: px(18) }}>{set.label}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {set.items.map((item, i) => liveDiscCard(item, i === 0))}
                  </ScrollView>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: px(40) }}>
              <View>
                <Text style={{ fontFamily: F.head, fontSize: px(24), color: C.text, marginBottom: px(18) }}>
                  {s.discoverTab === 'Trending' ? 'Trending this week' : s.discoverTab}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {DISCOVER.map((d, i) => demoDiscCard(d, i === 0))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
