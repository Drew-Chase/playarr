export interface Title {
  id: string;
  t: string;
  yr: number;
  kind: 'movie' | 'show';
  rating: string;
  gen: string[];
  seasons: number;
  prog: number | null;
  ep: string;
  ink: string;
  art: [string, string, string];
  ov: string;
  remote?: string;
}

export interface DiscoverItem {
  id: string;
  t: string;
  yr: number;
  rating: string;
  kind: 'movie' | 'show';
  ink: string;
  art: [string, string, string];
  ov: string;
  remote?: string;
}

export interface Friend {
  name: string;
  initials: string;
  art: [string, string];
}

const G = (a: string, b: string, c: string): [string, string, string] => [a, b, c];

export const TITLES: Title[] = [
  { id: 'hollow', t: 'Hollow Signal', yr: 2024, kind: 'show', rating: '8.7', gen: ['Sci-Fi', 'Thriller', 'Mystery'], seasons: 3, prog: 0.31, ep: 'S03 · E04 — The Quiet Floor', ink: '#8ff0e2', art: G('#0d4d55', '#0a2030', '#04070c'), ov: 'A decommissioned relay station keeps receiving a broadcast that has not been sent yet. The skeleton crew has eleven days to decide whether to answer.' },
  { id: 'copper', t: 'Copperline', yr: 2023, kind: 'show', rating: '8.2', gen: ['Crime', 'Drama'], seasons: 2, prog: 0.62, ep: 'S02 · E07 — Smoke Money', ink: '#ffcf7a', art: G('#5a3410', '#2a1608', '#08050b'), ov: 'Two detectives on opposite sides of a dying steel town trade favours until the ledger comes due.' },
  { id: 'vault', t: 'Vault of Ash', yr: 2025, kind: 'show', rating: '9.1', gen: ['Fantasy', 'Adventure'], seasons: 1, prog: 0.08, ep: 'S01 · E02 — The Long Vigil', ink: '#d9b6ff', art: G('#3c1c63', '#1b0f33', '#07060d'), ov: 'The last archive of a burned empire is guarded by a girl who cannot read, and by something older than the shelves.' },
  { id: 'cranes', t: 'Paper Cranes', yr: 2024, kind: 'show', rating: '8.9', gen: ['Anime', 'Drama'], seasons: 2, prog: null, ep: 'S01 · E01 — Folded Twice', ink: '#ffd0e4', art: G('#8f2d5f', '#3b1330', '#0a060c'), ov: 'A courier of impossible letters walks a city that rearranges itself every night.' },
  { id: 'static', t: 'The Long Static', yr: 2022, kind: 'movie', rating: '7.8', gen: ['Sci-Fi', 'Drama'], seasons: 0, prog: 0.44, ep: '1h 58m', ink: '#a9c6ff', art: G('#1b3566', '#101a3a', '#05060c'), ov: 'Forty years after the signal stopped, one listener refuses to take off the headphones.' },
  { id: 'rift', t: 'Rift Runners', yr: 2025, kind: 'movie', rating: '7.4', gen: ['Action', 'Sci-Fi'], seasons: 0, prog: null, ep: '2h 12m', ink: '#ffb08a', art: G('#7d2b1c', '#361208', '#08050a'), ov: 'A smuggling crew hauls cargo through gaps in the map that close on a schedule nobody published.' },
  { id: 'lantern', t: 'Lantern Bay', yr: 2021, kind: 'movie', rating: '8.0', gen: ['Drama'], seasons: 0, prog: 0.9, ep: '2h 04m', ink: '#ffe9a8', art: G('#6b5a12', '#2c2408', '#08070a'), ov: 'A lighthouse keeper writes to a daughter who has stopped answering.' },
  { id: 'undertow', t: 'Undertow', yr: 2024, kind: 'movie', rating: '7.1', gen: ['Thriller'], seasons: 0, prog: null, ep: '1h 47m', ink: '#9fe8ff', art: G('#0f4a63', '#0a2230', '#05070c'), ov: 'A free diver takes a job that requires her to forget what she saw at ninety metres.' },
  { id: 'gilded', t: 'Gilded Hours', yr: 2023, kind: 'show', rating: '8.4', gen: ['Period', 'Drama'], seasons: 4, prog: null, ep: 'S01 · E01 — First Season', ink: '#f0d9a0', art: G('#4c3a1a', '#241a0d', '#08060a'), ov: 'A clockmaker’s widow inherits her husband’s debts and his client list.' },
  { id: 'northpass', t: 'Northpass', yr: 2022, kind: 'show', rating: '7.9', gen: ['Adventure', 'Drama'], seasons: 3, prog: null, ep: 'S01 · E01 — The Cut', ink: '#c6e6ff', art: G('#2a4a5e', '#152430', '#06070b'), ov: 'A haulage route through the northern pass reopens after twenty winters closed.' },
  { id: 'saltmark', t: 'Saltmark', yr: 2025, kind: 'show', rating: '8.6', gen: ['Mystery'], seasons: 1, prog: null, ep: 'S01 · E01 — Low Tide', ink: '#b6ffd9', art: G('#12503c', '#0a271e', '#05070a'), ov: 'Every seventh year the tide leaves something on the beach that the village agrees not to name.' },
  { id: 'emberfall', t: 'Emberfall', yr: 2024, kind: 'movie', rating: '7.6', gen: ['Fantasy'], seasons: 0, prog: null, ep: '2h 21m', ink: '#ffc2a0', art: G('#7a3312', '#3a1608', '#09050a'), ov: 'The last dragon-keeper takes a census.' },
];

export const DISCOVER: DiscoverItem[] = [
  { id: 'd1', t: 'Quiet Machines', yr: 2026, rating: '8.3', kind: 'movie', ink: '#a7d8ff', art: G('#20406b', '#132340', '#05060c'), ov: 'A factory that builds nothing keeps hiring.' },
  { id: 'd2', t: 'The Understudy', yr: 2025, rating: '7.7', kind: 'movie', ink: '#ffd2c2', art: G('#6c2a3a', '#33131c', '#08050a'), ov: 'She learns every line of a play that has no ending written.' },
  { id: 'd3', t: 'Harbourlight', yr: 2026, rating: '8.8', kind: 'show', ink: '#b9f0ff', art: G('#0f4b5c', '#0a232c', '#05070b'), ov: 'A port authority inspector finds the same container arriving twice.' },
  { id: 'd4', t: 'Bright Fever', yr: 2025, rating: '7.2', kind: 'show', ink: '#ffe6a3', art: G('#6d5715', '#2f250a', '#07060a'), ov: 'A heatwave summer in a town with one working phone line.' },
  { id: 'd5', t: 'Nine Winters', yr: 2024, rating: '8.1', kind: 'movie', ink: '#d5dcff', art: G('#2c3170', '#181a3c', '#06060c'), ov: 'Two climbers, one rope, nine seasons of trying.' },
  { id: 'd6', t: 'Kettle Black', yr: 2026, rating: '7.9', kind: 'show', ink: '#ffc0d8', art: G('#6d1f45', '#331025', '#08050a'), ov: 'A restaurant kitchen where every cook is hiding the same thing.' },
  { id: 'd7', t: 'Slow Orbit', yr: 2025, rating: '8.5', kind: 'movie', ink: '#c0ffe4', art: G('#12523f', '#0a2720', '#05070a'), ov: 'A supply run to a station nobody has heard from in a year.' },
  { id: 'd8', t: 'Fault Lines', yr: 2026, rating: '7.5', kind: 'show', ink: '#ffcaa8', art: G('#71391a', '#341a0b', '#08050a'), ov: 'Seismologists argue about a tremor that only one of them recorded.' },
];

export const FRIENDS: Friend[] = [
  { name: 'Drew', initials: 'DC', art: ['#00D474', '#0b7f5b'] },
  { name: 'Mara', initials: 'MK', art: ['#8ab4ff', '#3b5f9e'] },
  { name: 'Theo', initials: 'TL', art: ['#ffd166', '#a3801f'] },
  { name: 'Priya', initials: 'PS', art: ['#ff9ec4', '#a34a72'] },
];

export const QUALITY: { label: string; note?: string; variants?: string[] }[] = [
  { label: 'Original', note: '2160p HEVC · 18.6 Mbps · direct play' },
  { label: '1080p', variants: ['High 20 Mbps', 'Med 12 Mbps', 'Normal 10 Mbps', 'Low 8 Mbps'] },
  { label: '720p', variants: ['High 4 Mbps', 'Med 3 Mbps', 'Normal 2 Mbps'] },
  { label: '480p', note: '1.5 Mbps' },
  { label: '360p', note: '0.7 Mbps' },
];

export const AUDIO = [
  { label: 'English · TrueHD Atmos 7.1', note: 'Default · lossless' },
  { label: 'English · DDP 5.1', note: 'Compatible · 640 kbps' },
  { label: 'English · Commentary', note: 'Director and cast' },
  { label: 'Spanish · AAC 2.0', note: 'Dub · 192 kbps' },
];

export const SUBS = [
  { label: 'Off', note: '' },
  { label: 'English (SDH)', note: 'Embedded · PGS image' },
  { label: 'English — Forced', note: 'Embedded · signs and songs only' },
  { label: 'Spanish', note: 'Embedded · SRT text' },
];

export const EP_TITLES = ['The Quiet Floor', 'Carrier Wave', 'Nineteen Minutes', 'Dead Air', 'The Long Vigil', 'Answering Tone', 'Smoke Money', 'Low Tide', 'Folded Twice'];
export const EP_OV = 'The crew argues about protocol while the signal repeats on a shorter interval than yesterday.';

export function titleById(id: string): Title {
  return TITLES.find((x) => x.id === id) || TITLES[0];
}
