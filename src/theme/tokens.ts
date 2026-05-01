export const colors = {
  bg: '#000000',
  surface: '#0E0E10',
  surfaceElevated: '#17171A',
  border: '#26262B',
  text: '#FFFFFF',
  textDim: '#A0A0A6',
  textMute: '#5A5A60',
  accent: '#22C55E',
  accentPress: '#1AAE52',
  accentGlow: 'rgba(34, 197, 94, 0.28)',
  accentOnDark: '#06130A',
  warning: '#E8A65A',
  danger: '#E85A5A',
  borderSubtle: 'rgba(255, 255, 255, 0.18)',
  borderFaint: 'rgba(255, 255, 255, 0.04)',
  overlayDark: 'rgba(0, 0, 0, 0.65)',
  overlayDarker: 'rgba(0, 0, 0, 0.85)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
  '5xl': 96,
} as const;

export const safeArea = {
  inset: 96,
} as const;

export const radius = {
  poster: 4,
  backdrop: 6,
  pin: 8,
  sheet: 12,
  toggle: 999,
  button: 4,
  pill: 4,
  key: 4,
} as const;

export const typography = {
  hero: {
    fontSize: 64,
    fontWeight: '600' as const,
    letterSpacing: -0.02 * 64,
    lineHeight: 64 * 1.05,
  },
  heroSub: {
    fontSize: 48,
    fontWeight: '600' as const,
    letterSpacing: -0.02 * 48,
    lineHeight: 48 * 1.05,
  },
  section: {
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.005 * 28,
    lineHeight: 28 * 1.2,
  },
  card: {
    fontSize: 22,
    fontWeight: '500' as const,
    letterSpacing: -0.005 * 22,
    lineHeight: 22 * 1.25,
  },
  body: {
    fontSize: 22,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 22 * 1.45,
  },
  meta: {
    fontSize: 18,
    fontWeight: '500' as const,
    letterSpacing: 0.005 * 18,
    lineHeight: 18 * 1.3,
  },
  caption: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.04 * 15,
    lineHeight: 15,
    textTransform: 'uppercase' as const,
  },
} as const;

export const focus = {
  scale: 1.06,
  outlineWidth: 3,
  outlineOffset: 8,
  tiltPerspective: 1200,
  tiltRotateY: -3,
  tiltRotateX: 2,
  brightness: 1.15,
  duration: 250,
  easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
  glowSpread: 14,
  glowOpacity: 0.6,
  reducedScale: 1.02,
} as const;

export const components = {
  button: {
    height: 56,
    paddingH: 28,
    fontSize: 18,
    fontWeight: '600' as const,
    iconSize: 56,
    gap: 12,
  },
  pill: {
    height: 32,
    paddingH: 14,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  poster: {
    width: 220,
    aspectRatio: 2 / 3,
  },
  backdrop: {
    width: 336,
    aspectRatio: 16 / 9,
  },
  castAvatar: {
    size: 88,
    cardWidth: 110,
  },
  topNav: {
    height: 96,
  },
  hero: {
    height: 720,
  },
  progress: {
    height: 3,
    trackOpacity: 0.18,
  },
  scrubber: {
    trackHeight: 6,
    knobSize: 18,
    knobGlow: 4,
    chapterWidth: 2,
  },
  keyboard: {
    keyHeight: 72,
  },
  toggle: {
    width: 64,
    height: 36,
    knobSize: 28,
  },
  watchedDot: {
    size: 22,
  },
  badge: {
    fontSize: 13,
    fontWeight: '600' as const,
    paddingV: 4,
    paddingH: 8,
    radius: 3,
  },
  dividerDot: {
    size: 4,
    marginH: 12,
  },
  searchField: {
    height: 96,
  },
  brandMark: {
    size: 30,
    iconScale: 0.42,
  },
} as const;

export const heroGradient = {
  vertical: {
    colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,1)'],
    locations: [0, 0.55, 1] as const,
  },
  horizontal: {
    colors: ['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0)'],
    locations: [0, 0.35, 0.65] as const,
  },
} as const;
