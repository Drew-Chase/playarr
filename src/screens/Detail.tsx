import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { C, F, pctOf, px } from '../theme';
import { Avatar, Btn, Focusable, Grad, ImgOrGrad, Rail, TitleGlyph } from '../ui';
import { EP_COUNT, TITLES, episodesFor, titleById, useStore } from '../store';
import { artUrl, fmtDuration, posterUrl, subFor, thumbUrl } from '../api/mappers';
import { useAllLeaves, useMediaChildren, useMediaDetail } from '../api/useLive';
import type { PlexMediaItem } from '../api/types';

export function DetailScreen() {
  const { s } = useStore();
  const live = !TITLES.some((t) => t.id === s.titleId);
  const { data: meta } = useMediaDetail(live ? s.titleId : null);
  const { data: seasons } = useMediaChildren(live ? s.titleId : null);
  const { data: leaves } = useAllLeaves(live ? s.titleId : null);

  if (live && meta) {
    return <LiveDetail key={s.titleId} meta={meta} seasons={seasons ?? []} leaves={leaves ?? []} />;
  }
  return <DemoDetail />;
}

function LiveDetail({
  meta,
  seasons,
  leaves,
}: {
  meta: PlexMediaItem;
  seasons: PlexMediaItem[];
  leaves: PlexMediaItem[];
}) {
  const { s, a } = useStore();
  const [seasonKey, setSeasonKey] = useState<string | null>(null);
  const isShow = (meta.childCount ?? 0) > 0 || meta.type === 'show';
  const activeSeason = seasons.find((x) => x.ratingKey === seasonKey) ?? seasons[0] ?? null;
  const seasonEpisodes = leaves
    .filter((l) => l.parentRatingKey === (activeSeason?.ratingKey ?? ''))
    .sort((x, y) => (x.index ?? 0) - (y.index ?? 0));
  const resume = !!meta.viewOffset && meta.viewOffset > 0;

  const liveMeta = {
    title: meta.title,
    sub: subFor(meta),
    art: artUrl(meta),
  };

  const similar = TITLES.filter((t) => t.id !== meta.title).slice(0, 7);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingBottom: px(90) }}
    >
      <View style={{ height: px(560), overflow: 'hidden' }}>
        <ImgOrGrad uri={artUrl(meta)} art={['#1b3566', '#101a3a', '#05060c']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        <Grad art={['rgba(7,8,10,.2)', 'rgba(7,8,10,.85)', '#07080a']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', left: px(64), right: px(64), bottom: px(40), flexDirection: 'row', gap: px(36) }}>
          <Focusable hasTV onPress={() => a.play(meta.ratingKey, 'Playing ' + meta.title, liveMeta)} focusStyle={{ transform: [{ scale: 1.06 }] }} style={{ width: px(230) }}>
            <View style={{ height: px(340), borderRadius: px(14), overflow: 'hidden', backgroundColor: '#000' }}>
              <ImgOrGrad uri={posterUrl(meta)} art={['#1b3566', '#101a3a', '#05060c']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
              {resume ? (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(5), backgroundColor: 'rgba(255,255,255,.2)' }}>
                  <View style={{ height: '100%', width: pctOf(((meta.viewOffset ?? 0) / (meta.duration || 1)) * 100), backgroundColor: C.accent }} />
                </View>
              ) : null}
            </View>
          </Focusable>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), marginBottom: px(14), flexWrap: 'wrap' }}>
              {(meta.Genre ?? []).slice(0, 4).map((g) => (
                <View key={g.tag} style={{ paddingHorizontal: px(14), paddingVertical: px(6), borderRadius: px(16), backgroundColor: 'rgba(255,255,255,.08)' }}>
                  <Text style={{ fontSize: px(14), color: C.textDim }}>{g.tag}</Text>
                </View>
              ))}
            </View>
            <TitleGlyph t={meta.title} ink="#ffffff" size={meta.title.length > 18 ? 48 : 64} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(16), marginTop: px(14), flexWrap: 'wrap' }}>
              {meta.audienceRating ? <Text style={{ fontSize: px(17), fontWeight: '700', color: C.accent }}>{meta.audienceRating.toFixed(1)} ★</Text> : null}
              <Text style={{ fontSize: px(17), color: '#c2c8cd' }}>
                {[meta.year, meta.contentRating, isShow ? `${meta.leafCount ?? meta.childCount ?? ''} episodes` : fmtDuration(meta.duration), '2160p HDR · Atmos']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: px(14), marginTop: px(22) }}>
              <Btn hasTV kind="accent" label={resume ? '▶ Resume' : '▶ Play'} onPress={() => a.play(meta.ratingKey, 'Playing ' + meta.title, liveMeta, resume ? (meta.viewOffset ?? 0) / 1000 : undefined)} />
              <Btn
                kind="soft"
                label={s.listed[meta.ratingKey] ? 'In my list ✓' : 'Add to my list'}
                onPress={() => {
                  const on = !s.listed[meta.ratingKey];
                  a.set({ listed: { ...s.listed, [meta.ratingKey]: on } });
                  a.flash(on ? meta.title + ' added to your list' : meta.title + ' removed from your list');
                }}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: px(64), gap: px(44) }}>
        <View style={{ flexDirection: 'row', gap: px(48) }}>
          <Text style={{ flex: 1, fontSize: px(19), lineHeight: px(30), color: C.textDim }}>{meta.summary || 'No summary available.'}</Text>
          {(meta.Role ?? []).length ? (
            <View style={{ width: px(420), gap: px(16) }}>
              <Text style={{ fontSize: px(14), color: '#7f868c', marginBottom: px(6) }}>CAST</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(10) }}>
                {(meta.Role ?? []).slice(0, 6).map((r) => (
                  <View key={r.tag} style={{ flexDirection: 'row', alignItems: 'center', gap: px(8), backgroundColor: 'rgba(255,255,255,.06)', borderRadius: px(24), paddingRight: px(14), paddingLeft: px(6), paddingVertical: px(6) }}>
                    <Avatar initials={r.tag.split(' ').map((x) => x[0]).slice(0, 2).join('')} art={['#2a2f36', '#12151a']} size={30} />
                    <Text style={{ fontSize: px(14), color: C.textDim }}>{r.tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {isShow && seasons.length ? (
          <View>
            <Text style={{ fontFamily: F.head, fontSize: px(28), color: C.text, marginBottom: px(20) }}>Seasons</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: px(12) }}>
              {seasons.map((sn, i) => {
                const on = activeSeason?.ratingKey === sn.ratingKey;
                return (
                  <Focusable
                    key={sn.ratingKey}
                    hasTV={i === 0}
                    onPress={() => setSeasonKey(sn.ratingKey)}
                    focusStyle={{ transform: [{ scale: 1.05 }] }}
                    style={{ width: px(300), marginRight: px(22), borderRadius: px(14), borderWidth: px(2), borderColor: on ? C.accent : 'rgba(255,255,255,.08)', overflow: 'hidden' }}
                  >
                    <View style={{ height: px(130) }}>
                      <ImgOrGrad uri={posterUrl(sn)} art={['#1b3566', '#101a3a', '#05060c']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                      <Grad art={['rgba(0,0,0,.25)', 'rgba(0,0,0,.55)']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                      <View style={{ position: 'absolute', left: px(20), bottom: px(16) }}>
                        <Text style={{ fontFamily: F.head, fontSize: px(22), color: '#fff' }}>{sn.title}</Text>
                        <Text style={{ fontSize: px(14), color: 'rgba(255,255,255,.7)', marginTop: px(3) }}>
                          {`${sn.childCount ?? leaves.filter((l) => l.parentRatingKey === sn.ratingKey).length} episodes`}
                        </Text>
                      </View>
                    </View>
                  </Focusable>
                );
              })}
            </ScrollView>
            <View style={{ gap: px(10), marginTop: px(24) }}>
              {seasonEpisodes.map((ep, i) => {
                const watched = !!ep.viewCount || (!!ep.viewOffset && ep.duration ? ep.viewOffset / ep.duration > 0.95 : false);
                const inProgress = !!ep.viewOffset && ep.duration ? ep.viewOffset / ep.duration <= 0.95 : false;
                return (
                  <Focusable
                    key={ep.ratingKey}
                    hasTV={i === 0}
                    onPress={() => {
                      a.set({ liveEpisodes: seasonEpisodes, epIndex: i });
                      a.nav('episode');
                    }}
                    focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: px(20),
                      backgroundColor: 'rgba(0,212,116,.1)',
                      borderWidth: px(1),
                      borderColor: 'rgba(255,255,255,.08)',
                      borderRadius: px(14),
                      padding: px(14),
                    }}
                  >
                    <ImgOrGrad uri={thumbUrl(ep)} art={['#1b3566', '#101a3a', '#05060c']} style={{ width: px(150), height: px(86), borderRadius: px(10) }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: px(14), color: '#8f969c' }}>
                        {`E${ep.index ?? i + 1}`} · {fmtDuration(ep.duration)}
                      </Text>
                      <Text style={{ fontSize: px(18), fontWeight: '600', color: C.text, marginTop: px(3) }}>{ep.title}</Text>
                      <Text numberOfLines={1} style={{ fontSize: px(14), color: '#8a9197', marginTop: px(3) }}>{ep.summary || ''}</Text>
                    </View>
                    {inProgress ? <Text style={{ fontSize: px(14), fontWeight: '700', color: C.amber }}>In progress</Text> : watched ? <Text style={{ fontSize: px(14), fontWeight: '700', color: '#7dffc0' }}>Watched</Text> : null}
                  </Focusable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: px(24) }}>
            <Btn kind="soft" label="Mark as watched" onPress={() => a.flash('Marked watched')} />
            <Btn kind="soft" label="Play from start" onPress={() => a.play(meta.ratingKey, 'Playing ' + meta.title, liveMeta)} />
          </View>
        )}

        <Rail
          label="More like this"
          items={similar.map((t) => ({
            key: t.id,
            t: t.t,
            sub: String(t.yr),
            art: t.art,
            ink: t.ink,
            onPress: () => a.openTitle(t.id),
          }))}
        />
      </View>
    </ScrollView>
  );
}

function DemoDetail() {
  const { s, a } = useStore();
  const T = titleById(s.titleId);
  const episodes = episodesFor(s, T);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingBottom: px(90) }}
    >
      <View style={{ height: px(560), overflow: 'hidden' }}>
        <ImgOrGrad art={T.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        <Grad art={['rgba(7,8,10,.2)', 'rgba(7,8,10,.85)', '#07080a']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', left: px(64), right: px(64), bottom: px(40), flexDirection: 'row', gap: px(36) }}>
          <Focusable hasTV onPress={() => a.play(T.id, 'Playing ' + T.t)} focusStyle={{ transform: [{ scale: 1.06 }] }} style={{ width: px(230) }}>
            <View style={{ height: px(340), borderRadius: px(14), overflow: 'hidden', backgroundColor: '#000' }}>
              <ImgOrGrad art={T.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
              {T.prog ? (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(5), backgroundColor: 'rgba(255,255,255,.2)' }}>
                  <View style={{ height: '100%', width: pctOf(T.prog * 100), backgroundColor: C.accent }} />
                </View>
              ) : null}
            </View>
          </Focusable>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), marginBottom: px(14) }}>
              {T.gen.map((g) => (
                <View key={g} style={{ paddingHorizontal: px(14), paddingVertical: px(6), borderRadius: px(16), backgroundColor: 'rgba(255,255,255,.08)' }}>
                  <Text style={{ fontSize: px(14), color: C.textDim }}>{g}</Text>
                </View>
              ))}
            </View>
            <TitleGlyph t={T.t} ink="#ffffff" size={64} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(16), marginTop: px(14) }}>
              <Text style={{ fontSize: px(17), fontWeight: '700', color: C.accent }}>{T.rating} ★</Text>
              <Text style={{ fontSize: px(17), color: '#c2c8cd' }}>
                {T.yr} · {T.kind === 'show' ? T.seasons + ' seasons' : T.ep} · 2160p HDR · Atmos
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: px(14), marginTop: px(22) }}>
              <Btn hasTV kind="accent" label={T.prog ? '▶ Resume ' + T.ep.split('—')[0].trim() : '▶ Play'} onPress={() => a.play(T.id, 'Playing ' + T.t)} />
              <Btn
                kind="soft"
                label={s.listed[T.id] ? 'In my list ✓' : 'Add to my list'}
                onPress={() => {
                  const on = !s.listed[T.id];
                  a.set({ listed: { ...s.listed, [T.id]: on } });
                  a.flash(on ? T.t + ' added to your list' : T.t + ' removed from your list');
                }}
              />
              <Btn kind="outline" label="Releases" onPress={() => a.set({ modal: 'releases' })} />
            </View>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: px(64), gap: px(44) }}>
        <View style={{ flexDirection: 'row', gap: px(48) }}>
          <Text style={{ flex: 1, fontSize: px(19), lineHeight: px(30), color: C.textDim }}>{T.ov}</Text>
          <View style={{ width: px(360), gap: px(16) }}>
            <View>
              <Text style={{ fontSize: px(14), color: '#7f868c', marginBottom: px(6) }}>CAST</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(10) }}>
                {['Ana Reyes', 'Miles Okafor', 'Ingrid Sol', 'Petra Lange'].map((n) => (
                  <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: px(8), backgroundColor: 'rgba(255,255,255,.06)', borderRadius: px(24), paddingRight: px(14), paddingLeft: px(6), paddingVertical: px(6) }}>
                    <Avatar initials={n.split(' ').map((x) => x[0]).join('')} art={['#2a2f36', '#12151a']} size={30} />
                    <Text style={{ fontSize: px(14), color: C.textDim }}>{n}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {T.kind === 'show' ? (
          <View>
            <Text style={{ fontFamily: F.head, fontSize: px(28), color: C.text, marginBottom: px(20) }}>Seasons</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: px(12) }}>
              {Array.from({ length: Math.max(T.seasons, 1) }, (_, i) => {
                const on = s.season === i + 1;
                return (
                  <Focusable
                    key={i}
                    hasTV={i === 0}
                    onPress={() => a.set({ season: i + 1 })}
                    focusStyle={{ transform: [{ scale: 1.05 }] }}
                    style={{ width: px(300), marginRight: px(22), borderRadius: px(14), borderWidth: px(2), borderColor: on ? C.accent : 'rgba(255,255,255,.08)', overflow: 'hidden' }}
                  >
                    <View style={{ height: px(130) }}>
                      <Grad art={T.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                      <Grad art={['rgba(0,0,0,.25)', 'rgba(0,0,0,.55)']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                      <View style={{ position: 'absolute', left: px(20), bottom: px(16) }}>
                        <Text style={{ fontFamily: F.head, fontSize: px(22), color: '#fff' }}>Season {i + 1}</Text>
                        <Text style={{ fontSize: px(14), color: 'rgba(255,255,255,.7)', marginTop: px(3) }}>
                          {(i === 0 ? EP_COUNT : 8 + i) + ' episodes' + (i === 0 ? ' · 3 watched' : '')}
                        </Text>
                      </View>
                    </View>
                  </Focusable>
                );
              })}
            </ScrollView>
            <View style={{ gap: px(10), marginTop: px(24) }}>
              {episodes.map((e, i) => (
                <Focusable
                  key={e.num}
                  hasTV={i === 0 && !T.prog}
                  onPress={() => a.nav('episode', { epIndex: i })}
                  focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: px(20),
                    backgroundColor: i === s.epIndex ? 'rgba(0,212,116,.1)' : '#0f1114',
                    borderWidth: px(1),
                    borderColor: i === s.epIndex ? 'rgba(0,212,116,.4)' : 'rgba(255,255,255,.06)',
                    borderRadius: px(14),
                    padding: px(14),
                  }}
                >
                  <Grad art={T.art} style={{ width: px(150), height: px(86), borderRadius: px(10) }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: px(14), color: '#8f969c' }}>{e.num} · {e.dur}</Text>
                    <Text style={{ fontSize: px(18), fontWeight: '600', color: C.text, marginTop: px(3) }}>{e.title}</Text>
                    <Text numberOfLines={1} style={{ fontSize: px(14), color: '#8a9197', marginTop: px(3) }}>{e.ov}</Text>
                  </View>
                  {e.state ? (
                    <Text style={{ fontSize: px(14), fontWeight: '700', color: e.stateColor }}>{e.state}</Text>
                  ) : null}
                </Focusable>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: px(24) }}>
            <Btn kind="soft" label="Mark as watched" onPress={() => a.flash('Marked watched')} />
            <Btn kind="soft" label="Play from start" onPress={() => a.play(T.id, 'Playing ' + T.t)} />
          </View>
        )}

        <Rail
          label="More like this"
          items={TITLES.filter((t) => t.id !== T.id).slice(0, 7).map((t) => ({
            key: t.id,
            t: t.t,
            sub: String(t.yr),
            art: t.art,
            ink: t.ink,
            onPress: () => a.openTitle(t.id),
          }))}
        />
      </View>
    </ScrollView>
  );
}
