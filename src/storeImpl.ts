import { useCallback, useMemo, useRef, useState } from 'react';
import { initialState, type Actions, type AppState, type LiveNowMeta, type Screen } from './store';


function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = Math.floor(sec % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? h + ':' + p(mm) + ':' + p(ss) : p(mm) + ':' + p(ss);
}

export function useAppStore() {
  const [s, setS] = useState<AppState>(initialState);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = useCallback((patch: Partial<AppState>) => {
    setS((prev) => ({ ...prev, ...patch }));
  }, []);

  const flash = useCallback((msg: string) => {
    setS((prev) => ({ ...prev, toast: msg }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setS((prev) => ({ ...prev, toast: null })), 2200);
  }, []);

  const nav = useCallback((screen: Screen, extra?: Partial<AppState>) => {
    setS((prev) => ({ ...prev, screen, modal: null, scrollY: 0, ...(extra || {}) }));
  }, []);

  const back = useCallback(() => {
    setS((prev) => {
      if (prev.modal) return { ...prev, modal: null };
      if (prev.settingsPane) return { ...prev, settingsPane: null };
      if (prev.screen === 'player') {
        if (prev.upNext) return { ...prev, upNext: false };
        return { ...prev, screen: 'detail', playing: false };
      }
      if (prev.screen === 'episode') return { ...prev, screen: 'detail' };
      if (prev.screen !== 'home') return { ...prev, screen: 'home' };
      return prev;
    });
  }, []);

  const startNext = useCallback(() => {
    setS((prev) => {
      const next = Math.min(prev.epIndex + 1, 7);
      return {
        ...prev,
        epIndex: next,
        upNext: false,
        t: 0,
        playing: true,
        countdown: 10,
        toast: 'Playing E0' + (next + 1),
      };
    });
  }, []);

  const play = useCallback(
    (id?: string, label?: string, meta?: LiveNowMeta, startSec?: number) => {
      setS((prev) => ({
        ...prev,
        screen: 'player',
        titleId: id || prev.titleId,
        playing: true,
        t: startSec !== undefined ? Math.max(0, Math.round(startSec)) : 372,
        liveNow: meta ?? null,
        upNext: false,
        settingsPane: null,
        countdown: 10,
      }));
      if (label) flash(label);
    },
    [flash]
  );

  const openTitle = useCallback(
    (id: string) => {
      nav('detail', { titleId: id, season: 1 });
    },
    [nav]
  );

  const a: Actions = useMemo(
    () => ({ set, nav, back, flash, play, openTitle, startNext, fmt }),
    [set, nav, back, flash, play, openTitle, startNext]
  );

  const ctx = useMemo(() => ({ s, a }), [s, a]);

  return { s, a, ctx, setS, fmt };
}

