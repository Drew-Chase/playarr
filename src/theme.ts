import { Dimensions } from 'react-native';

export const C = {
  bg: '#07080a',
  bgDeep: '#050607',
  panel: '#0f1114',
  panelSoft: '#0d0f12',
  accent: '#00D474',
  accentSoft: '#7dffc0',
  ink: '#04120b',
  text: '#f3f5f6',
  textDim: '#c9ced3',
  textMut: '#8f969c',
  textFaint: '#686f75',
  hair: 'rgba(255,255,255,.06)',
  hair2: 'rgba(255,255,255,.09)',
  amber: '#ffd166',
  blue: '#8ab4ff',
};

export const F = {
  black: 'ArchivoBlack_400Regular',
  head: 'Archivo_700Bold',
  headMed: 'Archivo_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMed: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export function designScale(): number {
  const w = Dimensions.get('window').width;
  const h = Dimensions.get('window').height;
  return Math.min(w / 1920, h / 1080);
}

export let SCALE = designScale();
export function refreshScale() {
  SCALE = designScale();
}
export const px = (v: number) => Math.round(v * SCALE);
export const pctOf = (n: number): `${number}%` => `${Math.round(n)}%`;
export const asPct = (s: string): `${number}%` => s as `${number}%`;
