/* eslint-disable react-hooks/immutability -- expo-video exposes an imperative player API */
import { useEffect, useRef, useState } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Text, View } from 'react-native';
import { C, F, pctOf, px } from '../theme';
import { Avatar, Focusable, Grad, ImgOrGrad } from '../ui';
import { AUDIO, EP_OV, EP_TITLES, QUALITY, SUBS, TITLES, titleById, useStore } from '../store';
import { playarr } from '../api/playarr';
import { currentAuthToken, resolveServerUrl } from '../api/client';
import type { PlexMediaItem } from '../api/types';

function CircleBtn({
  label,
  size,
  onPress,
  hasTV,
  accent,
}: {
  label: string;
  size: number;
  onPress: () => void;
  hasTV?: boolean;
  accent?: boolean;
}) {
  return (
    <Focusable
      hasTV={hasTV}
      onPress={onPress}
      focusStyle={{ transform: [{ scale: 1.1 }], borderColor: accent ? C.ink : C.accent, borderWidth: px(3) }}
      style={{
        width: px(size),
        height: px(size),
        borderRadius: px(size / 2),
        backgroundColor: accent ? C.accent : 'rgba(255,255,255,.09)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: px(size * 0.26), fontWeight: '700', color: accent ? C.ink : C.text }}>{label}</Text>
    </Focusable>
  );
}

export function PlayerScreen() {
  const { s, a } = useStore();
  const T = titleById(s.titleId);
  const live = s.liveNow;
  const [source, setSource] = useState<{ uri: string; headers: Record<string, string> } | null>(null);
  const [mediaInfo, setMediaInfo] = useState<PlexMediaItem | null>(null);
  const [vtime, setVtime] = useState(0);
  const [vdur, setVdur] = useState(0);
  const [vplaying, setVplaying] = useState(false);

  useEffect(() => {
    if (!live) return;
    let alive = true;
    playarr
      .stream(s.titleId)
      .then((si) => {
        if (!alive) return;
        const uri = resolveServerUrl(si.url);
        const token = currentAuthToken();
        setSource({ uri, headers: token ? { Cookie: `plex_user_token=${token}` } : {} });
      })
      .catch(() => {
        if (alive) a.flash('Stream unavailable for this item');
      });
    playarr
      .media(s.titleId)
      .then((m) => {
        if (alive) setMediaInfo(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [live, s.titleId, a]);

  const player = useVideoPlayer(null);

  const retriedFromZero = useRef(false);
  useEffect(() => {
    if (!source) return;
    retriedFromZero.current = false;
    player.timeUpdateEventInterval = 0.5;
    player.replace(source);
    if (s.t > 0) player.currentTime = s.t;
    player.play();
  }, [source, player, s.t]);

  useEffect(() => {
    const sub = player.addListener('statusChange', (e: { status?: string; newStatus?: string }) => {
      const st = e?.newStatus ?? e?.status;
      if (st === 'error' && !retriedFromZero.current) {
        retriedFromZero.current = true;
        if (source) player.replace(source);
        player.play();
      }
    });
    return () => sub.remove();
  }, [player, source]);

  useEffect(() => {
    const onTime = (e: { currentTime: number; duration?: number }) => {
      setVtime(e.currentTime);
      const d = e.duration ?? player.duration;
      if (d && d > 0) setVdur(d);
    };
    const onEnd = () => {
      if (!live) return;
      const idx = s.liveEpisodes.findIndex((ep) => ep.ratingKey === s.titleId);
      if (idx >= 0 && idx < s.liveEpisodes.length - 1) {
        a.set({ upNext: true, countdown: 10, autoplay: true, playing: false });
      } else {
        a.nav('detail');
      }
    };
    const playSub = player.addListener('playingChange', (e: { isPlaying: boolean }) => setVplaying(e.isPlaying));
    const timeSub = player.addListener('timeUpdate', onTime as never);
    const endSub = player.addListener('playToEnd', onEnd as never);
    return () => {
      playSub.remove();
      timeSub.remove();
      endSub.remove();
    };
  }, [player, live, s.liveEpisodes, s.titleId, a]);

  useEffect(() => {
    if (!live || !mediaInfo) return;
    const report = (state: 'playing' | 'paused' | 'stopped') => {
      playarr
        .timeline({
          ratingKey: s.titleId,
          key: mediaInfo.key ?? s.titleId,
          state,
          time: Math.round((player.currentTime ?? 0) * 1000),
          duration: Math.round((player.duration ?? mediaInfo.duration ?? 0) * 1000) || mediaInfo.duration || 0,
        })
        .catch(() => {});
    };
    const iv = setInterval(() => {
      if (player.playing) report('playing');
    }, 10000);
    return () => {
      clearInterval(iv);
      report('stopped');
    };
  }, [live, mediaInfo, s.titleId, player]);


  useEffect(() => {
    const tick = setInterval(() => {
      if (s.upNext) {
        if (!s.autoplay) return;
        if (s.countdown <= 1) return a.startNext();
        return a.set({ countdown: s.countdown - 1 });
      }
      if (!s.playing || live) return;
      const nt = s.t + 1;
      if (nt >= 3570) a.set({ t: nt, upNext: true, countdown: 10, settingsPane: null });
      else a.set({ t: nt });
    }, 1000);
    return () => clearInterval(tick);
  }, [s.upNext, s.autoplay, s.playing, s.t, s.countdown, live, a]);

  const cur = live ? vtime : s.t;
  const dur = live ? (vdur || 3600) : 3600;
  const pct = pctOf((cur / dur) * 100);
  const chatFeed = s.chat.length
    ? s.chat
    : [
        { name: 'Mara', initials: 'MK', art: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'] as [string, string], text: 'okay that transition was insane' },
        { name: 'Theo', initials: 'TL', art: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'] as [string, string], text: 'pausing for 2, kettle' },
        { name: 'Drew', initials: 'DC', art: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'] as [string, string], text: 'take your time, holding here' },
      ];

  const pane = s.settingsPane;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', overflow: 'hidden' }}>
      {live && source ? (
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#000' }}
        />
      ) : (
        <ImgOrGrad uri={live ? live.art : null} art={T.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
      )}
      <Grad art={['rgba(0,0,0,0)', 'rgba(0,0,0,.85)']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />

      {s.upNext ? null : (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: px(190),
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingHorizontal: px(56),
            paddingTop: px(44),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(22) }}>
            <CircleBtn
              label="←"
              size={56}
              onPress={() => {
                if (live) player.pause();
                a.back();
              }}
            />
            <View>
              <Text style={{ fontFamily: F.head, fontSize: px(30), letterSpacing: -px(0.4), color: C.text }}>{live ? live.title : T.t}</Text>
              <Text style={{ fontSize: px(17), color: '#a7aeb4', marginTop: px(4) }}>
                {live ? live.sub : T.kind === 'show'
                  ? 'S0' + s.season + ' · E0' + (s.epIndex + 1) + ' — ' + EP_TITLES[(s.epIndex + s.season) % EP_TITLES.length]
                  : T.yr + ' · ' + T.ep}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14) }}>
            {s.party ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: px(12),
                  paddingHorizontal: px(20),
                  paddingVertical: px(12),
                  borderRadius: px(32),
                  backgroundColor: 'rgba(0,212,116,.14)',
                  borderWidth: px(1),
                  borderColor: 'rgba(0,212,116,.45)',
                }}
              >
                <View style={{ width: px(10), height: px(10), borderRadius: px(5), backgroundColor: C.accent }} />
                <Text style={{ fontSize: px(16), fontWeight: '600', color: C.accentSoft }}>{s.party} · 3</Text>
              </View>
            ) : null}
            <Focusable
              onPress={() => (s.party ? a.set({ partyPanelOpen: !s.partyPanelOpen }) : a.set({ modal: 'create' }))}
              focusStyle={{ transform: [{ scale: 1.06 }] }}
              style={{ paddingHorizontal: px(26), paddingVertical: px(13), borderRadius: px(32), backgroundColor: 'rgba(255,255,255,.1)' }}
            >
              <Text style={{ fontSize: px(16), fontWeight: '600', color: C.text }}>
                {s.party ? (s.partyPanelOpen ? 'Hide party' : 'Show party') : 'Start watch party'}
              </Text>
            </Focusable>
          </View>
        </View>
      )}

      {s.party && s.partyPanelOpen && !s.upNext ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: px(520),
            backgroundColor: 'rgba(8,10,12,.9)',
            borderLeftWidth: px(1),
            borderLeftColor: 'rgba(255,255,255,.08)',
            zIndex: 20,
          }}
        >
          <View style={{ padding: px(36), borderBottomWidth: px(1), borderBottomColor: 'rgba(255,255,255,.07)' }}>
            <Text style={{ fontFamily: F.head, fontSize: px(24), color: C.text }}>{s.party}</Text>
            <Text style={{ fontSize: px(15), color: '#8f969c', marginTop: px(6) }}>Everyone within ±120 ms · host controls playback</Text>
            <View style={{ flexDirection: 'row', gap: px(12), marginTop: px(22), flexWrap: 'wrap' }}>
              {[
                { name: 'Drew', initials: 'DC', state: 'Host · in sync', color: '#7dffc0' },
                { name: 'Mara', initials: 'MK', state: 'In sync', color: '#7dffc0' },
                { name: 'Theo', initials: 'TL', state: 'Buffering', color: '#ffd166' },
              ].map((m) => (
                <View key={m.initials} style={{ flexDirection: 'row', alignItems: 'center', gap: px(10), paddingHorizontal: px(14), paddingVertical: px(8), paddingLeft: px(8), borderRadius: px(26), backgroundColor: 'rgba(255,255,255,.06)' }}>
                  <Avatar initials={m.initials} art={['#1a2b24', '#0d1a14']} size={34} />
                  <View>
                    <Text style={{ fontSize: px(14), fontWeight: '600', color: C.text }}>{m.name}</Text>
                    <Text style={{ fontSize: px(12), color: m.color }}>{m.state}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View style={{ flex: 1, padding: px(36), gap: px(16) }}>
            {chatFeed.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: px(12), alignItems: 'flex-start' }}>
                <Avatar initials={c.initials} art={c.art[0] === 'rgba(0,0,0,0)' ? ['#1a2b24', '#0d1a14'] : c.art} size={30} />
                <View>
                  <Text style={{ fontSize: px(13), color: '#8f969c' }}>{c.name}</Text>
                  <Text style={{ fontSize: px(16), lineHeight: px(22), color: '#e9ecee' }}>{c.text}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={{ padding: px(36), paddingTop: px(24), borderTopWidth: px(1), borderTopColor: 'rgba(255,255,255,.07)', flexDirection: 'row', gap: px(10), flexWrap: 'wrap' }}>
            {['😂', 'No way', 'Called it', 'Rewind that'].map((x) => (
              <Focusable
                key={x}
                onPress={() => a.set({ chat: [...s.chat, { name: 'Drew', initials: 'DC', art: ['#00D474', '#0b7f5b'], text: x }] })}
                focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
                style={{ paddingHorizontal: px(18), paddingVertical: px(12), borderRadius: px(24), backgroundColor: 'rgba(255,255,255,.07)' }}
              >
                <Text style={{ fontSize: px(15), color: C.text }}>{x}</Text>
              </Focusable>
            ))}
          </View>
        </View>
      ) : null}

      {pane && !s.upNext ? (
        <View
          style={{
            position: 'absolute',
            right: px(56),
            bottom: px(170),
            width: px(520),
            borderRadius: px(16),
            backgroundColor: 'rgba(13,16,19,.95)',
            borderWidth: px(1),
            borderColor: 'rgba(255,255,255,.09)',
            overflow: 'hidden',
            zIndex: 25,
          }}
        >
          {pane === 'root' ? (
            <View>
              <View style={{ paddingHorizontal: px(26), paddingVertical: px(22), borderBottomWidth: px(1), borderBottomColor: 'rgba(255,255,255,.07)' }}>
                <Text style={{ fontSize: px(20), fontWeight: '700', color: C.text }}>Playback settings</Text>
              </View>
              {[
                { key: 'quality' as const, label: 'Quality', value: s.quality === 'Original' ? 'Original' : s.quality + ' · ' + s.variant },
                { key: 'audio' as const, label: 'Audio', value: AUDIO[s.audio].label },
                { key: 'subs' as const, label: 'Subtitles', value: SUBS[s.subs].label },
                { key: 'speed' as const, label: 'Playback speed', value: s.speed },
              ].map((r, i) => (
                <Focusable
                  key={r.key}
                  hasTV={i === 0}
                  onPress={() => a.set({ settingsPane: r.key })}
                  focusStyle={{ backgroundColor: 'rgba(255,255,255,.06)' }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: px(26), paddingVertical: px(20), borderBottomWidth: px(1), borderBottomColor: 'rgba(255,255,255,.05)' }}
                >
                  <Text style={{ fontSize: px(18), fontWeight: '600', color: C.text }}>{r.label}</Text>
                  <Text style={{ fontSize: px(16), color: '#9aa1a7' }}>{r.value} ›</Text>
                </Focusable>
              ))}
            </View>
          ) : null}

          {pane === 'quality' ? (
            <View>
              <Focusable onPress={() => a.set({ settingsPane: 'root' })} focusStyle={{ backgroundColor: 'rgba(255,255,255,.06)' }} style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), paddingHorizontal: px(26), paddingVertical: px(22), borderBottomWidth: px(1), borderBottomColor: 'rgba(255,255,255,.07)' }}>
                <Text style={{ color: '#8f969c', fontSize: px(20) }}>‹</Text>
                <Text style={{ fontSize: px(20), fontWeight: '700', color: C.text }}>Quality</Text>
              </Focusable>
              {QUALITY.map((q, i) => {
                const on = s.quality === q.label;
                return (
                  <View key={q.label} style={{ paddingHorizontal: px(26), paddingVertical: px(16), borderBottomWidth: px(1), borderBottomColor: 'rgba(255,255,255,.05)' }}>
                    <Focusable
                      hasTV={i === 0}
                      onPress={() => a.set({ quality: q.label, variant: q.variants ? q.variants[0] : '' })}
                      focusStyle={{ opacity: 0.85 }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14) }}>
                        <Text style={{ width: px(18), color: C.accent, fontSize: px(16) }}>{on ? '✓' : ''}</Text>
                        <Text style={{ fontSize: px(19), fontWeight: '600', color: on ? C.accent : '#e9ecee' }}>{q.label}</Text>
                      </View>
                      {q.note ? <Text style={{ fontSize: px(14), color: '#8a9197' }}>{q.note}</Text> : null}
                    </Focusable>
                    {q.variants ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(8), marginTop: px(12), marginLeft: px(32) }}>
                        {q.variants.map((v) => {
                          const von = on && s.variant === v;
                          return (
                            <Focusable
                              key={v}
                              onPress={() => {
                                a.set({ quality: q.label, variant: v });
                                a.flash('Transcoding at ' + q.label + ' · ' + v);
                              }}
                              focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
                              style={{ paddingHorizontal: px(14), paddingVertical: px(7), borderRadius: px(16), backgroundColor: von ? C.accent : 'rgba(255,255,255,.07)' }}
                            >
                              <Text style={{ fontSize: px(14), fontWeight: '600', color: von ? C.ink : '#c9ced3' }}>{v}</Text>
                            </Focusable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {pane === 'audio' || pane === 'speed' ? (
            <View>
              <Focusable onPress={() => a.set({ settingsPane: 'root' })} focusStyle={{ backgroundColor: 'rgba(255,255,255,.06)' }} style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), paddingHorizontal: px(26), paddingVertical: px(22), borderBottomWidth: px(1), borderBottomColor: 'rgba(255,255,255,.07)' }}>
                <Text style={{ color: '#8f969c', fontSize: px(20) }}>‹</Text>
                <Text style={{ fontSize: px(20), fontWeight: '700', color: C.text }}>{pane === 'audio' ? 'Audio track' : 'Playback speed'}</Text>
              </Focusable>
              {(pane === 'audio' ? AUDIO.map((x, i) => ({ label: x.label, note: x.note, on: s.audio === i, set: () => ({ audio: i }), msg: 'Audio: ' + x.label })) : ['0.5x', '0.75x', '1x', '1.25x', '1.5x', '2x'].map((v) => ({ label: v, note: v === '1x' ? 'Normal' : '', on: s.speed === v, set: () => ({ speed: v }), msg: 'Speed: ' + v }))).map((r, i) => (
                <Focusable
                  key={r.label}
                  hasTV={i === 0}
                  onPress={() => {
                    a.set(r.set());
                    a.flash(r.msg);
                  }}
                  focusStyle={{ backgroundColor: 'rgba(0,212,116,.07)' }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: px(14),
                    paddingHorizontal: px(26),
                    paddingVertical: px(18),
                    backgroundColor: r.on ? 'rgba(0,212,116,.07)' : 'transparent',
                    borderBottomWidth: px(1),
                    borderBottomColor: 'rgba(255,255,255,.05)',
                  }}
                >
                  <Text style={{ width: px(18), color: C.accent, fontSize: px(16) }}>{r.on ? '✓' : ''}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: px(18), fontWeight: '600', color: r.on ? C.accent : '#e9ecee' }}>{r.label}</Text>
                    {r.note ? <Text style={{ fontSize: px(14), color: '#8a9197', marginTop: px(3) }}>{r.note}</Text> : null}
                  </View>
                </Focusable>
              ))}
            </View>
          ) : null}

          {pane === 'subs' ? (
            <View>
              <Focusable onPress={() => a.set({ settingsPane: 'root' })} focusStyle={{ backgroundColor: 'rgba(255,255,255,.06)' }} style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), paddingHorizontal: px(26), paddingVertical: px(22), borderBottomWidth: px(1), borderBottomColor: 'rgba(255,255,255,.07)' }}>
                <Text style={{ color: '#8f969c', fontSize: px(20) }}>‹</Text>
                <Text style={{ fontSize: px(20), fontWeight: '700', color: C.text }}>Subtitles</Text>
              </Focusable>
              {SUBS.map((x, i) => (
                <Focusable
                  key={x.label}
                  hasTV={i === 0}
                  onPress={() => {
                    a.set({ subs: i });
                    a.flash('Subtitles: ' + x.label);
                  }}
                  focusStyle={{ backgroundColor: 'rgba(0,212,116,.07)' }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: px(14),
                    paddingHorizontal: px(26),
                    paddingVertical: px(18),
                    backgroundColor: s.subs === i ? 'rgba(0,212,116,.07)' : 'transparent',
                    borderBottomWidth: px(1),
                    borderBottomColor: 'rgba(255,255,255,.05)',
                  }}
                >
                  <Text style={{ width: px(18), color: C.accent, fontSize: px(16) }}>{s.subs === i ? '✓' : ''}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: px(18), fontWeight: '600', color: s.subs === i ? C.accent : '#e9ecee' }}>{x.label}</Text>
                    {x.note ? <Text style={{ fontSize: px(14), color: '#8a9197', marginTop: px(3) }}>{x.note}</Text> : null}
                  </View>
                </Focusable>
              ))}
              <View style={{ paddingHorizontal: px(26), paddingVertical: px(18), backgroundColor: 'rgba(255,209,102,.07)', flexDirection: 'row', gap: px(12) }}>
                <Text style={{ fontSize: px(15), color: '#ffd166' }}>!</Text>
                <Text style={{ flex: 1, fontSize: px(14), lineHeight: px(21), color: '#c0a668' }}>
                  Only tracks embedded in this file can be used — external subtitle search is unavailable on this server.
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {s.upNext ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 }}>
          <Grad art={['rgba(4,5,6,.62)', 'rgba(4,5,6,.9)', '#040506']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', left: px(56), top: px(44), flexDirection: 'row', alignItems: 'center', gap: px(20) }}>
            <CircleBtn label="←" size={52} onPress={() => a.nav('detail')} />
            <Text style={{ fontSize: px(17), color: '#a7aeb4' }}>{T.t} · credits</Text>
          </View>
          <View style={{ position: 'absolute', left: px(56), top: px(150), right: px(56), flexDirection: 'row', gap: px(44) }}>
            <View style={{ width: px(640) }}>
              <Text style={{ fontSize: px(16), letterSpacing: px(1.4), textTransform: 'uppercase', color: C.accentSoft, fontWeight: '700' }}>Up next</Text>
              <Focusable
                hasTV
                onPress={() => a.startNext()}
                focusStyle={{ transform: [{ scale: 1.03 }], borderColor: C.accent, borderWidth: px(3) }}
                style={{ marginTop: px(20), borderRadius: px(18), overflow: 'hidden', backgroundColor: 'rgba(15,17,20,.9)', borderWidth: px(1), borderColor: 'rgba(255,255,255,.1)' }}
              >
                <View style={{ height: px(340) }}>
                  <Grad art={T.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                  <Grad art={['rgba(0,0,0,.15)', 'rgba(0,0,0,.6)']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                  <View style={{ position: 'absolute', left: '50%', top: '50%', width: px(96), height: px(96), marginLeft: px(-48), marginTop: px(-48), borderRadius: px(48), backgroundColor: 'rgba(0,212,116,.92)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: px(34), color: C.ink }}>▶</Text>
                  </View>
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(6), backgroundColor: 'rgba(255,255,255,.18)' }}>
                    <View style={{ height: '100%', width: pctOf((s.autoplay ? (10 - s.countdown) / 10 : 0) * 100), backgroundColor: C.accent }} />
                  </View>
                </View>
                <View style={{ padding: px(30) }}>
                  <Text style={{ fontSize: px(16), color: '#8f969c' }}>S0{s.season} · E0{Math.min(s.epIndex + 2, 8)}</Text>
                  <Text style={{ fontFamily: F.head, fontSize: px(32), color: C.text, marginTop: px(8), letterSpacing: -px(0.5) }}>
                    {EP_TITLES[(Math.min(s.epIndex + 1, 7) + s.season) % EP_TITLES.length]}
                  </Text>
                  <Text style={{ fontSize: px(16), color: '#9aa1a7', marginTop: px(8) }}>42m 3s · TV-14</Text>
                  <Text style={{ fontSize: px(17), lineHeight: px(26), color: '#c1c7cc', marginTop: px(14) }}>{EP_OV}</Text>
                </View>
              </Focusable>
              <View style={{ flexDirection: 'row', gap: px(14), marginTop: px(22) }}>
                <Focusable
                  onPress={() => a.startNext()}
                  focusStyle={{ transform: [{ scale: 1.05 }] }}
                  style={{ paddingHorizontal: px(32), paddingVertical: px(18), borderRadius: px(14), backgroundColor: C.accent }}
                >
                  <Text style={{ fontSize: px(19), fontWeight: '700', color: C.ink }}>
                    ▶ {s.autoplay ? 'Playing in ' + s.countdown + 's' : 'Autoplay paused'}
                  </Text>
                </Focusable>
                <Focusable
                  onPress={() => a.set({ autoplay: !s.autoplay })}
                  focusStyle={{ transform: [{ scale: 1.05 }] }}
                  style={{ paddingHorizontal: px(28), paddingVertical: px(18), borderRadius: px(14), backgroundColor: 'rgba(255,255,255,.11)' }}
                >
                  <Text style={{ fontSize: px(19), fontWeight: '600', color: C.text }}>{s.autoplay ? 'Cancel autoplay' : 'Resume autoplay'}</Text>
                </Focusable>
                <Focusable
                  onPress={() => a.set({ upNext: false, autoplay: false, t: 3575 })}
                  focusStyle={{ transform: [{ scale: 1.05 }] }}
                  style={{ paddingHorizontal: px(28), paddingVertical: px(18), borderRadius: px(14), backgroundColor: 'rgba(255,255,255,.05)', borderWidth: px(1), borderColor: 'rgba(255,255,255,.18)' }}
                >
                  <Text style={{ fontSize: px(19), fontWeight: '600', color: C.text }}>Watch credits</Text>
                </Focusable>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.head, fontSize: px(20), color: C.text }}>You may also like</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(20), marginTop: px(18) }}>
                {TITLES.filter((x) => x.id !== T.id).slice(0, 6).map((t, i) => (
                  <Focusable
                    key={t.id}
                    hasTV={false}
                    onPress={() => a.openTitle(t.id)}
                    focusStyle={{ transform: [{ scale: 1.06 }], borderColor: C.accent, borderWidth: px(3) }}
                    style={{ width: px(190) }}
                  >
                    <View style={{ height: px(282), borderRadius: px(14), overflow: 'hidden' }}>
                      <Grad art={t.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                      <Grad art={['rgba(0,0,0,0)', 'rgba(0,0,0,.8)']} deg={180} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                      <View style={{ position: 'absolute', left: px(16), right: px(16), bottom: px(18) }}>
                        <Text style={{ fontFamily: F.black, fontSize: px(23), lineHeight: px(22), textTransform: 'uppercase', color: t.ink }} numberOfLines={3}>
                          {t.t}
                        </Text>
                      </View>
                    </View>
                    <Text numberOfLines={1} style={{ marginTop: px(10), fontSize: px(16), fontWeight: '600', color: C.text }}>{t.t}</Text>
                    <Text style={{ fontSize: px(14), color: '#868d93' }}>{String(t.yr)}</Text>
                  </Focusable>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: px(56), paddingBottom: px(48) }}>
          <View style={{ height: px(140) }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(18), marginBottom: px(14) }}>
            <Text style={{ fontSize: px(17), color: '#b9c0c6' }}>{a.fmt(cur)} / {a.fmt(dur)}</Text>
            {s.party ? (
              <View style={{ paddingHorizontal: px(12), paddingVertical: px(5), borderRadius: px(6), backgroundColor: 'rgba(0,212,116,.16)' }}>
                <Text style={{ fontSize: px(14), fontWeight: '600', color: C.accentSoft }}>In sync · ±120 ms</Text>
              </View>
            ) : null}
          </View>
          <Focusable
            onPress={() => a.flash('Use -10 / +10 to seek')}
            focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
            style={{ height: px(22), justifyContent: 'center' }}
          >
            <View style={{ height: px(8), borderRadius: px(4), backgroundColor: 'rgba(255,255,255,.16)' }}>
              <View style={{ height: px(8), borderRadius: px(4), width: pct, backgroundColor: C.accent }} />
            </View>
          </Focusable>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: px(26) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(16) }}>
              <CircleBtn
                label="-10"
                size={60}
                onPress={() => {
                  if (live) player.currentTime = Math.max(0, player.currentTime - 10);
                  else a.set({ t: Math.max(0, s.t - 10) });
                }}
              />
              <CircleBtn
                hasTV
                label={live ? (vplaying ? '❚❚' : '▶') : s.playing ? '❚❚' : '▶'}
                size={78}
                accent
                onPress={() => {
                  if (live) { if (player.playing) player.pause(); else player.play(); }
                  else a.set({ playing: !s.playing });
                }}
              />
              <CircleBtn
                label="+10"
                size={60}
                onPress={() => {
                  if (live) player.currentTime = player.currentTime + 10;
                  else a.set({ t: Math.min(dur, s.t + 10) });
                }}
              />
              <Focusable
                onPress={() => (live ? a.flash('Use Up Next at the end of the episode') : a.startNext())}
                focusStyle={{ transform: [{ scale: 1.06 }] }}
                style={{ paddingHorizontal: px(26), paddingVertical: px(16), borderRadius: px(30), backgroundColor: 'rgba(255,255,255,.09)' }}
              >
                <Text style={{ fontSize: px(16), fontWeight: '600', color: C.text }}>Next episode</Text>
              </Focusable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
              {[
                { label: 'Skip to credits', act: () => a.set({ t: 3572, upNext: true, countdown: 10, autoplay: true, settingsPane: null }) },
                { label: 'Subtitles · ' + SUBS[s.subs].label.split(' —')[0], act: () => a.set({ settingsPane: 'subs' }) },
                { label: 'Settings', act: () => a.set({ settingsPane: 'root' }) },
                s.party
                  ? { label: 'Invite code J4K2', act: () => a.flash('Invite code J4K2 copied') }
                  : { label: 'Watch party', act: () => a.set({ modal: 'create' }) },
              ].map((t, i) => (
                <Focusable
                  key={t.label}
                  hasTV={i === 0 && !s.party && false}
                  onPress={t.act}
                  focusStyle={{ transform: [{ scale: 1.06 }] }}
                  style={{
                    paddingHorizontal: px(24),
                    paddingVertical: px(16),
                    borderRadius: px(30),
                    backgroundColor: i === 3 ? 'rgba(0,212,116,.16)' : 'rgba(255,255,255,.09)',
                  }}
                >
                  <Text style={{ fontSize: px(16), fontWeight: '600', color: i === 3 ? C.accentSoft : C.text }}>{t.label}</Text>
                </Focusable>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
