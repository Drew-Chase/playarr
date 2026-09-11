import { Text, View } from 'react-native';
import { C, F, px } from './theme';
import { Focusable, Grad } from './ui';
import { useEffect, useState } from 'react';
import { DISCOVER, TITLES, titleById, useStore } from './store';
import { playarr } from './api/playarr';

function Shell({ children, width }: { children: React.ReactNode; width: number }) {
  const { a } = useStore();
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        backgroundColor: 'rgba(2,3,4,.66)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Focusable onPress={() => a.set({ modal: null })} style={{ position: 'absolute', width: '100%', height: '100%' }}>
        <View style={{ width: '100%', height: '100%' }} />
      </Focusable>
      <View
        style={{
          width: px(width),
          maxWidth: '92%',
          borderRadius: px(18),
          backgroundColor: '#101317',
          borderWidth: px(1),
          borderColor: 'rgba(255,255,255,.08)',
          padding: px(36),
          zIndex: 2,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Head({ title }: { title: string }) {
  return <Text style={{ fontFamily: F.head, fontSize: px(30), color: C.text, marginBottom: px(6) }}>{title}</Text>;
}

export function CreatePartyModal() {
  const { s, a } = useStore();
  const scopes = [
    { key: 'everyone' as const, label: 'Everyone', sub: 'Any user on this server can join' },
    { key: 'invite' as const, label: 'Invite only', sub: 'Share a code to let people join' },
    { key: 'select' as const, label: 'Select users', sub: 'Choose specific users from your server' },
  ];
  return (
    <Shell width={860}>
      <Head title="Create a watch party" />
      <Text style={{ fontSize: px(17), color: C.textMut, marginBottom: px(26) }}>
        Playback stays in sync for everyone watching with you.
      </Text>
      <View
        style={{
          borderRadius: px(12),
          backgroundColor: '#191d21',
          paddingHorizontal: px(24),
          paddingVertical: px(18),
          marginBottom: px(24),
        }}
      >
        <Text style={{ fontSize: px(14), color: C.textMut, marginBottom: px(6) }}>PARTY NAME</Text>
        <Text style={{ fontSize: px(21), fontWeight: '700', color: C.text }}>Drew&apos;s Movie Night</Text>
      </View>
      <View style={{ gap: px(14) }}>
        {scopes.map((x) => {
          const on = s.partyScope === x.key;
          return (
            <Focusable
              key={x.key}
              hasTV={on}
              onPress={() => a.set({ partyScope: x.key })}
              focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(18),
                backgroundColor: on ? 'rgba(0,212,116,.09)' : '#191d21',
                borderWidth: px(1),
                borderColor: on ? 'rgba(0,212,116,.45)' : 'rgba(255,255,255,.06)',
                borderRadius: px(14),
                padding: px(20),
              }}
            >
              <View
                style={{
                  width: px(20),
                  height: px(20),
                  borderRadius: px(10),
                  borderWidth: px(2),
                  borderColor: on ? C.accent : 'rgba(255,255,255,.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {on ? <View style={{ width: px(10), height: px(10), borderRadius: px(5), backgroundColor: C.accent }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: px(19), fontWeight: '700', color: C.text }}>{x.label}</Text>
                <Text style={{ fontSize: px(15), color: C.textMut, marginTop: px(2) }}>{x.sub}</Text>
              </View>
            </Focusable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: px(14), marginTop: px(28) }}>
        <Focusable
          onPress={() => a.set({ modal: null })}
          focusScale={1.05}
          style={{ paddingHorizontal: px(28), paddingVertical: px(16), borderRadius: px(12), backgroundColor: 'rgba(255,255,255,.08)' }}
        >
          <Text style={{ fontSize: px(18), fontWeight: '600', color: C.text }}>Cancel</Text>
        </Focusable>
        <Focusable
          hasTV
          onPress={() => {
            a.set({ party: "Drew's Movie Night", modal: null, partyPanelOpen: true });
            a.play(s.titleId, 'Watch party started · code J4K2');
          }}
          focusScale={1.05}
          style={{ paddingHorizontal: px(28), paddingVertical: px(16), borderRadius: px(12), backgroundColor: C.accent }}
        >
          <Text style={{ fontSize: px(18), fontWeight: '700', color: C.ink }}>Create party</Text>
        </Focusable>
      </View>
    </Shell>
  );
}

export function JoinPartyModal() {
  const { s, a } = useStore();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'K', '⌫'];
  const open = [
    { name: "Mara's Party", watching: 'Copperline · S02 E07' },
    { name: 'Anime Club', watching: 'Paper Cranes · S01 E01' },
  ];
  return (
    <Shell width={720}>
      <Head title="Join with a code" />
      <View style={{ alignItems: 'center', paddingVertical: px(22) }}>
        <Text style={{ fontFamily: F.head, fontSize: px(52), letterSpacing: px(10), color: C.text }}>
          {s.joinCode || '– – – –'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(10), justifyContent: 'center' }}>
        {keys.map((k, i) => (
          <Focusable
            key={k}
            hasTV={i === 0}
            onPress={() =>
              a.set({
                joinCode: k === '⌫' ? s.joinCode.slice(0, -1) : (s.joinCode + k).slice(0, 4),
              })
            }
            focusStyle={{ borderColor: C.accent, borderWidth: px(2), transform: [{ scale: 1.08 }] }}
            style={{
              width: px(96),
              height: px(72),
              borderRadius: px(12),
              backgroundColor: '#191d21',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: px(24), fontWeight: '700', color: C.text }}>{k}</Text>
          </Focusable>
        ))}
      </View>
      <Text style={{ fontSize: px(15), color: C.textMut, marginTop: px(26) }}>Open parties on this server</Text>
      <View style={{ gap: px(10), marginTop: px(12) }}>
        {open.map((p, i) => (
          <Focusable
            key={p.name}
            hasTV={i === 0 && keys.length === 0}
            onPress={() => {
              a.set({ party: p.name, modal: null, partyPanelOpen: true });
              a.play(TITLES[i + 1].id, 'Joined ' + p.name + ' — synced');
            }}
            focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#191d21',
              borderRadius: px(12),
              paddingHorizontal: px(22),
              paddingVertical: px(16),
            }}
          >
            <View>
              <Text style={{ fontSize: px(18), fontWeight: '700', color: C.text }}>{p.name}</Text>
              <Text style={{ fontSize: px(14), color: C.textMut }}>{p.watching}</Text>
            </View>
            <Text style={{ fontSize: px(15), fontWeight: '700', color: C.accentSoft }}>Join</Text>
          </Focusable>
        ))}
      </View>
    </Shell>
  );
}

export function RequestModal() {
  const { s, a } = useStore();
  const [folders, setFolders] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    let alive = true;
    if (!s.modal) return;
    const isMovie = (s.reqTmdbItem?.kind ?? 'movie') === 'movie';
    const base = isMovie ? '/radarr' : '/sonarr';
    playarr
      .requestRaw(base + '/rootfolder')
      .then((list: unknown) => alive && setFolders((Array.isArray(list) ? list : []).map((x) => String((x as { path?: string }).path ?? '')).filter(Boolean)))
      .catch(() => {});
    playarr
      .requestRaw(base + (isMovie ? '/qualityprofile' : '/profile'))
      .then((list: unknown) => alive && setProfiles((Array.isArray(list) ? list : []).map((x) => ({ id: Number((x as { id?: number }).id ?? 0), name: String((x as { name?: string }).name ?? '') })).filter((x) => x.name)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [s.modal, s.reqTmdbItem?.kind]);
  const reqT = s.reqTmdbItem
    ? s.reqTmdbItem
    : s.reqTarget
      ? DISCOVER.find((d) => d.id === s.reqTarget) || TITLES.find((t) => t.id === s.reqTarget) || DISCOVER[0]
      : DISCOVER[0];
  const [loadingAdd, setLoadingAdd] = useState(false);
  const isMovie = reqT.kind === 'movie';
  const opts = [
    { label: 'Root folder', vals: folders.length ? folders : ['/mnt/media/movies'] },
    { label: 'Quality profile', vals: profiles.length ? profiles.map((p) => p.name) : ['Any'] },
    { label: 'Monitor', vals: isMovie ? ['Movie only', 'Movie + specials'] : ['All seasons', 'Future episodes', 'First season'] },
    { label: 'Availability', vals: isMovie ? ['Released', 'Announced', 'In cinemas'] : ['Released'] },
  ];
  return (
    <Shell width={820}>
      <View style={{ flexDirection: 'row', gap: px(24) }}>
        <Grad art={reqT.art} style={{ width: px(150), height: px(222), borderRadius: px(12) }} />
        <View style={{ flex: 1 }}>
          <Head title={reqT.t} />
          <Text style={{ fontSize: px(15), color: C.textMut, marginBottom: px(14) }}>
            {reqT.yr} · {reqT.kind === 'movie' ? 'Movie · Radarr' : 'Series · Sonarr'} · {reqT.rating} ★
          </Text>
          <Text style={{ fontSize: px(16), lineHeight: px(24), color: C.textDim }}>{reqT.ov}</Text>
        </View>
      </View>
      <View style={{ gap: px(12), marginTop: px(26) }}>
        {opts.map((o, i) => (
          <Focusable
            key={o.label}
            hasTV={i === 0}
            onPress={() => {
              const f = s.reqFields.slice();
              f[i] = (f[i] + 1) % o.vals.length;
              a.set({ reqFields: f });
            }}
            focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#191d21',
              borderRadius: px(12),
              paddingHorizontal: px(22),
              paddingVertical: px(16),
            }}
          >
            <Text style={{ fontSize: px(16), color: C.textMut }}>{o.label}</Text>
            <Text style={{ fontSize: px(17), fontWeight: '700', color: C.text }}>
              {String(o.vals[s.reqFields[i] % o.vals.length])} <Text style={{ color: C.accent }}> ›</Text>
            </Text>
          </Focusable>
        ))}
      </View>
      <Focusable
        onPress={() => a.set({ autoSearch: !s.autoSearch })}
        focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: px(14), marginTop: px(22) }}
      >
        <View
          style={{
            width: px(26),
            height: px(26),
            borderRadius: px(7),
            borderWidth: px(2),
            borderColor: s.autoSearch ? C.accent : 'rgba(255,255,255,.3)',
            backgroundColor: s.autoSearch ? C.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {s.autoSearch ? <Text style={{ color: C.ink, fontSize: px(16), fontWeight: '700' }}>✓</Text> : null}
        </View>
        <Text style={{ fontSize: px(16), color: C.text }}>Auto-search indexers after request</Text>
      </Focusable>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: px(14), marginTop: px(28) }}>
        <Focusable
          onPress={() => a.set({ modal: null })}
          focusScale={1.05}
          style={{ paddingHorizontal: px(28), paddingVertical: px(16), borderRadius: px(12), backgroundColor: 'rgba(255,255,255,.08)' }}
        >
          <Text style={{ fontSize: px(18), fontWeight: '600', color: C.text }}>Cancel</Text>
        </Focusable>
        <Focusable
          hasTV
          onPress={() => {
            const base = isMovie ? '/radarr' : '/sonarr';
            setLoadingAdd(true);
            playarr
              .requestRaw(base + '/lookup', { params: { term: reqT.t } })
              .then((results: unknown) => {
                const list = Array.isArray(results) ? results : [];
                const wanted = reqT.remote ? Number(reqT.remote) : NaN;
                const match =
                  list.find((r) => Number((r as { tmdbId?: number }).tmdbId) === wanted) ||
                  list.find((r) => String((r as { title?: string }).title).toLowerCase() === reqT.t.toLowerCase()) ||
                  list[0];
                if (!match) throw new Error('No match found on ' + (isMovie ? 'Radarr' : 'Sonarr') + ' lookup');
                const folderPath = opts[0].vals[s.reqFields[0] % Math.max(opts[0].vals.length, 1)];
                const profileName = opts[1].vals[s.reqFields[1] % Math.max(opts[1].vals.length, 1)];
                const profileId = profiles.find((p) => p.name === profileName)?.id ?? 0;
                const body: Record<string, unknown> = {
                  ...(match as Record<string, unknown>),
                  monitored: true,
                  rootFolderPath: folderPath,
                  qualityProfileId: profileId,
                  addOptions: { searchForMovie: s.autoSearch, searchForMissingEpisodes: s.autoSearch },
                };
                return playarr.requestRaw(base + (isMovie ? '/movie' : '/series'), { method: 'POST', body });
              })
              .then(() => {
                a.set({ requested: { ...s.requested, [reqT.id]: 1 }, modal: null });
                a.flash(reqT.t + ' requested' + (s.autoSearch ? ' · searching indexers' : ''));
              })
              .catch((e: unknown) => {
                a.flash(e instanceof Error ? e.message : 'Request failed');
                setLoadingAdd(false);
              });
          }}
          focusScale={1.05}
          style={{ paddingHorizontal: px(28), paddingVertical: px(16), borderRadius: px(12), backgroundColor: C.accent }}
        >
          <Text style={{ fontSize: px(18), fontWeight: '700', color: C.ink }}>
            {loadingAdd ? 'Requesting…' : reqT.kind === 'movie' ? 'Add to Radarr' : 'Add to Sonarr'}
          </Text>
        </Focusable>
      </View>
    </Shell>
  );
}

const REL_NAMES = [
  '2160p.WEB-DL.DV.HDR10.DDP5.1.Atmos.H265',
  '1080p.BluRay.REMUX.AVC.TrueHD.7.1',
  '1080p.WEB-DL.DDP5.1.H264',
  '2160p.BluRay.x265.10bit.HDR',
  '1080p.WEBRip.x265.DDP5.1',
  '720p.WEB-DL.AAC2.0.H264',
  '2160p.WEB-DL.DDP5.1.HEVC',
  '1080p.AMZN.WEB-DL.DDP5.1.H264',
];

export function ReleasesModal() {
  const { s, a } = useStore();
  const T = titleById(s.titleId);
  return (
    <Shell width={980}>
      <Head title="Available releases" />
      <Text style={{ fontSize: px(15), color: C.textMut, marginBottom: px(22) }}>
        {T.t}
        {T.kind === 'show' ? ' · S0' + s.season + 'E04' : ''} · {REL_NAMES.length} releases
      </Text>
      <View style={{ gap: px(10) }}>
        {REL_NAMES.map((n, i) => {
          const key = s.titleId + i;
          const got = !!s.grabbed[key];
          return (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(18),
                backgroundColor: '#191d21',
                borderRadius: px(12),
                paddingHorizontal: px(22),
                paddingVertical: px(14),
              }}
            >
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: px(16), fontWeight: '600', color: C.text }}>
                  {T.t.replace(/ /g, '.')}.{T.yr}.{n}-PLAYARR
                </Text>
                <Text style={{ fontSize: px(14), color: C.textMut, marginTop: px(3) }}>
                  {['NZBgeek', 'DrunkenSlug', 'Nzb.su', 'AnimeTosho'][i % 4]} ·{' '}
                  {[22.4, 34.1, 6.2, 41.8, 4.9, 2.1, 18.6, 7.4][i]} GB
                </Text>
              </View>
              <Focusable
                hasTV={i === 0}
                onPress={() => {
                  a.set({ grabbed: { ...s.grabbed, [key]: 1 } });
                  a.flash('Sent to download client — ' + n.split('.')[0]);
                }}
                focusStyle={{ borderColor: C.accent, borderWidth: px(2) }}
                style={{
                  paddingHorizontal: px(24),
                  paddingVertical: px(12),
                  borderRadius: px(24),
                  backgroundColor: got ? 'rgba(0,212,116,.18)' : 'rgba(255,255,255,.09)',
                }}
              >
                <Text style={{ fontSize: px(15), fontWeight: '700', color: got ? '#7dffc0' : C.text }}>
                  {got ? 'Queued' : 'Grab'}
                </Text>
              </Focusable>
            </View>
          );
        })}
      </View>
    </Shell>
  );
}

export function Modals() {
  const { s } = useStore();
  if (!s.modal) return null;
  if (s.modal === 'create') return <CreatePartyModal />;
  if (s.modal === 'join') return <JoinPartyModal />;
  if (s.modal === 'request') return <RequestModal />;
  if (s.modal === 'releases') return <ReleasesModal />;
  return null;
}
