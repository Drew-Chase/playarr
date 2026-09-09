import { Text, View } from 'react-native';
import { C, F, px } from './theme';
import { focusLastContent, lastContentHandle, lastFocusWasTop, onLastContentChange, setTopBarRef } from './focusNav';
import { useEffect, useRef, useState } from 'react';
import { TVEventHandler, TVFocusGuideView } from 'react-native';
import { Avatar, Focusable } from './ui';
import { useStore, type Screen } from './store';

const NAV: { key: string; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'movies', label: 'Movies' },
  { key: 'shows', label: 'TV Shows' },
];

function CalendarGlyph({ ink }: { ink: string }) {
  return (
    <View
      style={{
        width: px(22),
        height: px(21),
        borderWidth: px(2),
        borderColor: ink,
        borderRadius: px(4),
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: px(3),
      }}
    >
      <View style={{ position: 'absolute', left: -px(2), right: -px(2), top: px(3), height: px(2), backgroundColor: ink }} />
      <View style={{ width: px(4), height: px(4), borderRadius: px(1), backgroundColor: ink }} />
    </View>
  );
}

export function TopBar() {
  const { s, a } = useStore();
  const atTop = s.scrollY < 40;
  const logoRef = useRef<any>(null);

  useEffect(() => {
    setTopBarRef(logoRef);
  }, []);

  const [destHandle, setDestHandle] = useState<number | null>(null);
  useEffect(() => onLastContentChange(() => setDestHandle(lastContentHandle(s.screen))), [s.screen]);

  useEffect(() => {
    const sub = (TVEventHandler as any).addListener((e: any, data: { eventType?: string; eventKeyAction?: number }) => {
      const d = data ?? e;
      if (d?.eventType === 'down' && lastFocusWasTop()) {
        focusLastContent(s.screen);
      }
    });
    return () => sub.remove();
  }, [s.screen]);

  const go = (key: string) => {
    if (key === 'movies') a.nav('grid', { gridKind: 'movie', gridFilter: 'All' });
    else if (key === 'shows') a.nav('grid', { gridKind: 'show', gridFilter: 'All' });
    else a.nav(key as Screen);
  };

  const activeKey: string =
    s.screen === 'grid' ? (s.gridKind === 'movie' ? 'movies' : 'shows') : (s.screen as Screen);

  const iconBtn = {
    width: px(48),
    height: px(48),
    borderRadius: px(24),
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  return (
    <TVFocusGuideView
      trapFocusDown
      destinations={destHandle ? [destHandle] : []}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: px(112),
        zIndex: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: px(64),
        backgroundColor: atTop ? 'rgba(7,8,10,0)' : 'rgba(10,12,15,.72)',
        borderBottomWidth: px(1),
        borderBottomColor: atTop ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,.08)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(52) }}>
        <Focusable hostRef={logoRef} zone='top' onPress={() => a.nav('home')} focusStyle={{ transform: [{ scale: 1.05 }], borderColor: C.accent, borderWidth: px(3) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(13) }}>
            <View
              style={{
                width: px(40),
                height: px(40),
                borderRadius: px(20),
                backgroundColor: C.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: C.ink, fontSize: px(17) }}>▶</Text>
            </View>
            <Text style={{ fontFamily: F.head, fontSize: px(26), letterSpacing: -px(0.6), color: C.text }}>Playarr</Text>
          </View>
        </Focusable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
          {NAV.map((n) => {
            const active = activeKey === n.key;
            return (
              <Focusable
                key={n.key}
                zone='top'
               
                onPress={() => go(n.key)}
                focusStyle={{ borderColor: C.accent, borderWidth: px(2), transform: [{ scale: 1.05 }] }}
                style={{
                  paddingHorizontal: px(20),
                  paddingVertical: px(11),
                  borderRadius: px(10),
                  backgroundColor: active ? 'rgba(255,255,255,.1)' : 'transparent',
                }}
              >
                <Text style={{ fontSize: px(19), fontWeight: '600', color: active ? C.accent : '#c9ced3' }}>{n.label}</Text>
              </Focusable>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14) }}>
        <Focusable
          zone='top'
         
          onPress={() => a.nav('calendar')}
          focusStyle={{ transform: [{ scale: 1.1 }] }}
          style={[iconBtn, { backgroundColor: s.screen === 'calendar' ? 'rgba(0,212,116,.18)' : 'rgba(255,255,255,.09)' }]}
        >
          <CalendarGlyph ink={s.screen === 'calendar' ? C.accent : '#e9ecee'} />
        </Focusable>
        <Focusable zone='top' onPress={() => a.nav('search')} focusStyle={{ transform: [{ scale: 1.1 }] }} style={iconBtn}>
          <View style={[iconBtn, { backgroundColor: 'rgba(255,255,255,.09)' }]}>
            <Text style={{ fontSize: px(20), color: '#e9ecee' }}>⌕</Text>
          </View>
        </Focusable>
        <Focusable
          zone='top'
         
          onPress={() => a.nav('downloads')}
          focusStyle={{ transform: [{ scale: 1.1 }] }}
          style={{ ...iconBtn, backgroundColor: 'rgba(255,255,255,.09)' }}
        >
          <Text style={{ fontSize: px(19), color: '#e9ecee' }}>↓</Text>
          <View
            style={{
              position: 'absolute',
              top: -px(2),
              right: -px(2),
              width: px(18),
              height: px(18),
              borderRadius: px(9),
              backgroundColor: C.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: px(11), fontWeight: '700', color: C.ink }}>3</Text>
          </View>
        </Focusable>
        <Focusable zone='top' onPress={() => a.nav('profile')} focusStyle={{ transform: [{ scale: 1.1 }] }} style={[iconBtn, { backgroundColor: 'transparent' }]}>
          <Avatar initials="DC" art={['#00D474', '#0b7f5b']} size={48} />
        </Focusable>
      </View>
    </TVFocusGuideView>
  );
}
