import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface IconProps {
  size?: number;
  color?: string;
}

export function PlayIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M3 2.5v11l11-5.5z" />
    </Svg>
  );
}

export function PauseIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Rect x="3" y="2.5" width="3.5" height="11" />
      <Rect x="9.5" y="2.5" width="3.5" height="11" />
    </Svg>
  );
}

export function SearchIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.6}>
      <Circle cx="10" cy="10" r="6.5" />
      <Path d="m15 15 4 4" />
    </Svg>
  );
}

export function DownloadIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M11 3v12m0 0-4-4m4 4 4-4M4 19h14" />
    </Svg>
  );
}

export function CheckIcon({ size = 12, color = colors.accentOnDark }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m2.5 6.2 2.4 2.4 4.6-4.6" />
    </Svg>
  );
}

export function DotsIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill={color}>
      <Circle cx="3" cy="9" r="1.6" />
      <Circle cx="9" cy="9" r="1.6" />
      <Circle cx="15" cy="9" r="1.6" />
    </Svg>
  );
}

export function ShuffleIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M3 5h3l10 12h3M3 17h3l3-3.5M13 8.5 16 5h3M16 2l3 3-3 3M16 14l3 3-3 3" />
    </Svg>
  );
}

export function BackIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M14 4 7 11l7 7" />
    </Svg>
  );
}

export function SubtitlesIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.6}>
      <Rect x="2.5" y="5" width="17" height="12" rx="1.5" />
      <Path d="M5.5 11h4M11.5 11h5M5.5 14h7M14 14h2.5" />
    </Svg>
  );
}

export function AudioIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M4 9v4h3l4 3.5V5.5L7 9H4zM15 7.5a5 5 0 0 1 0 7M17.5 5a8 8 0 0 1 0 12" />
    </Svg>
  );
}

export function SkipNextIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill={color}>
      <Path d="M4 5v12l9-6-9-6zM15 5h2v12h-2z" />
    </Svg>
  );
}

interface ChevronProps extends IconProps {
  direction?: 'right' | 'down' | 'left' | 'up';
}

export function ChevronIcon({ size = 14, color = 'currentColor', direction = 'right' }: ChevronProps) {
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[direction];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      style={{ transform: [{ rotate: `${rotation}deg` }] }}
    >
      <Path d="m5 3 4 4-4 4" />
    </Svg>
  );
}

export function FilterIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M2 4h12M4 8h8M6 12h4" />
    </Svg>
  );
}
