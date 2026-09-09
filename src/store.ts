import { createContext, useContext } from 'react';
import { AUDIO, EP_OV, EP_TITLES, FRIENDS, QUALITY, SUBS, TITLES, DISCOVER, titleById } from './data';
import type { Title } from './data';

export type Screen =
  | 'home'
  | 'grid'
  | 'detail'
  | 'episode'
  | 'calendar'
  | 'downloads'
  | 'search'
  | 'profile'
  | 'player';

export type ModalName = 'create' | 'join' | 'request' | 'releases' | null;
export type SettingsPane = 'root' | 'quality' | 'audio' | 'subs' | 'speed' | null;

export interface AppState {
  screen: Screen;
  hero: number;
  titleId: string;
  season: number;
  modal: ModalName;
  toast: string | null;
  partyScope: 'everyone' | 'invite' | 'select';
  joinCode: string;
  query: string;
  gridKind: 'movie' | 'show';
  gridFilter: 'All' | 'In progress' | 'Unwatched';
  discoverTab: 'Trending' | 'Popular movies' | 'Popular shows';
  playing: boolean;
  t: number;
  partyPanelOpen: boolean;
  party: string | null;
  chat: { name: string; initials: string; art: [string, string]; text: string }[];
  reqTarget: string | null;
  reqFields: number[];
  autoSearch: boolean;
  grabbed: Record<string, number>;
  listed: Record<string, boolean>;
  requested: Record<string, number>;
  epIndex: number;
  settingsPane: SettingsPane;
  quality: string;
  variant: string;
  audio: number;
  subs: number;
  speed: string;
  upNext: boolean;
  countdown: number;
  autoplay: boolean;
  scrollY: number;
  serverOk: boolean;
}

export const initialState: AppState = {
  screen: 'home',
  hero: 0,
  titleId: 'hollow',
  season: 1,
  modal: null,
  toast: null,
  partyScope: 'everyone',
  joinCode: '',
  query: '',
  gridKind: 'movie',
  gridFilter: 'All',
  discoverTab: 'Trending',
  playing: true,
  t: 372,
  partyPanelOpen: true,
  party: null,
  chat: [],
  reqTarget: null,
  reqFields: [0, 0, 0, 0],
  autoSearch: true,
  grabbed: {},
  listed: {},
  requested: {},
  epIndex: 3,
  settingsPane: null,
  quality: '1080p',
  variant: 'Normal 10 Mbps',
  audio: 0,
  subs: 1,
  speed: '1x',
  upNext: false,
  countdown: 10,
  autoplay: true,
  scrollY: 0,
  serverOk: false,
};

export interface Actions {
  set: (patch: Partial<AppState>) => void;
  nav: (screen: Screen, extra?: Partial<AppState>) => void;
  back: () => void;
  flash: (msg: string) => void;
  play: (id?: string, label?: string) => void;
  openTitle: (id: string) => void;
  startNext: () => void;
  fmt: (sec: number) => string;
}

export const StoreContext = createContext<{ s: AppState; a: Actions }>({
  s: initialState,
  a: {} as Actions,
});

export function useStore() {
  return useContext(StoreContext);
}

export const EP_COUNT = 8;

export function episodesFor(s: AppState, T: Title) {
  return Array.from({ length: EP_COUNT }, (_, i) => {
    const done = i < 3;
    const cur = i === 3;
    return {
      num: 'S0' + s.season + ' · E0' + (i + 1),
      title: EP_TITLES[(i + s.season) % EP_TITLES.length],
      ov: EP_OV,
      dur: 42 + (i % 5) + 'm',
      hasProg: cur,
      progPct: '31%',
      state: done ? 'Watched' : cur ? 'In progress' : '',
      stateColor: done ? '#7dffc0' : '#ffd166',
    };
  });
}

export { TITLES, DISCOVER, FRIENDS, QUALITY, AUDIO, SUBS, EP_TITLES, EP_OV, titleById };
export type { Title };
