import { memo, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, px } from './theme';

export function gradPoints(deg: number): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const rad = (deg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  return {
    start: { x: 0.5 - dx / 2, y: 0.5 - dy / 2 },
    end: { x: 0.5 + dx / 2, y: 0.5 + dy / 2 },
  };
}

export function Grad({
  art,
  deg = 155,
  style,
  children,
}: {
  art: string[];
  deg?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const pts = gradPoints(deg);
  return (
    <LinearGradient colors={art as [string, string, ...string[]]} start={pts.start} end={pts.end} style={style}>
      {children}
    </LinearGradient>
  );
}

export function ImgOrGrad({
  uri,
  art,
  deg,
  style,
  children,
}: {
  uri?: string | null;
  art: string[];
  deg?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  if (uri) {
    return (
      <View style={style}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%', position: 'absolute' }} resizeMode="cover" />
        {children}
      </View>
    );
  }
  return (
    <Grad art={art} deg={deg} style={style}>
      {children}
    </Grad>
  );
}

interface FocusableProps {
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  focusStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  hasTV?: boolean;
  children?: ReactNode;
  disabled?: boolean;
  testID?: string;
}

export function Focusable({ onPress, onFocus, onBlur, focusStyle, style, hasTV, children, disabled }: FocusableProps) {
  const [f, setF] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      focusable={!disabled}
      disabled={disabled}
      hasTVPreferredFocus={hasTV}
      onPress={onPress}
      onFocus={() => {
        setF(true);
        onFocus?.();
      }}
      onBlur={() => {
        setF(false);
        onBlur?.();
      }}
      style={[
        style,
        f && (focusStyle ?? { borderColor: C.accent, borderWidth: px(3) }),
        f && { zIndex: 5 },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function TitleGlyph({ t, ink, size }: { t: string; ink: string; size: number }) {
  return (
    <Text
      numberOfLines={2}
      style={{
        fontFamily: F.black,
        fontSize: px(size),
        lineHeight: px(size * 0.96),
        letterSpacing: -px(size * 0.03),
        textTransform: 'uppercase',
        color: ink,
      }}
    >
      {t}
    </Text>
  );
}

export interface PosterData {
  key: string;
  t: string;
  sub: string;
  art: string[];
  ink: string;
  progPct?: `${number}%`;
  uri?: string | null;
  onPress: () => void;
}

export const Poster = memo(function Poster({ item, hasTV }: { item: PosterData; hasTV?: boolean }) {
  return (
    <Focusable
      hasTV={hasTV}
      onPress={item.onPress}
      style={{ width: px(224), marginRight: px(22) }}
      focusStyle={{ transform: [{ scale: 1.07 }] }}
    >
      <View
        style={{
          height: px(332),
          borderRadius: px(14),
          overflow: 'hidden',
          backgroundColor: '#000',
          boxShadow: '0 20px 44px rgba(0,0,0,.5)' as never,
        }}
      >
        <ImgOrGrad uri={item.uri} art={item.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.78)']}
          locations={[0, 0.38, 1]}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <View style={{ position: 'absolute', left: px(18), right: px(18), bottom: px(20) }}>
          <TitleGlyph t={item.t} ink={item.ink} size={27} />
        </View>
        {item.progPct ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(5), backgroundColor: 'rgba(255,255,255,.2)' }}>
            <View style={{ height: '100%', width: item.progPct as `${number}%`, backgroundColor: C.accent }} />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ marginTop: px(12), fontSize: px(17), fontWeight: '600', color: C.text }}>
        {item.t}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: px(15), color: '#868d93', marginTop: px(3) }}>
        {item.sub}
      </Text>
    </Focusable>
  );
});

export function Rail({ label, note, items }: { label: string; note?: string; items: PosterData[] }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: px(20) }}>
        <Text style={{ fontFamily: F.head, fontSize: px(28), letterSpacing: -px(0.4), color: C.text }}>{label}</Text>
        {note ? <Text style={{ fontSize: px(16), color: '#7f868c' }}>{note}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: px(12) }}>
        {items.map((it, i) => (
          <Poster key={it.key} item={it} hasTV={i === 0} />
        ))}
      </ScrollView>
    </View>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'ghost',
  hasTV,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'accent' | 'ghost' | 'outline' | 'soft';
  hasTV?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    kind === 'accent'
      ? C.accent
      : kind === 'soft'
        ? 'rgba(255,255,255,.11)'
        : kind === 'outline'
          ? 'rgba(255,255,255,.05)'
          : 'rgba(255,255,255,.1)';
  const fg = kind === 'accent' ? C.ink : C.text;
  return (
    <Focusable
      hasTV={hasTV}
      onPress={onPress}
      focusStyle={{ transform: [{ scale: 1.05 }], borderColor: kind === 'accent' ? C.accentSoft : C.accent, borderWidth: px(3) }}
      style={[
        {
          backgroundColor: bg,
          borderRadius: px(14),
          paddingHorizontal: px(32),
          paddingVertical: px(20),
          borderWidth: kind === 'outline' ? px(1) : 0,
          borderColor: 'rgba(255,255,255,.18)',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: px(20), fontWeight: '700', color: fg }}>{label}</Text>
    </Focusable>
  );
}

export function Chip({ label, active, onPress, hasTV }: { label: string; active: boolean; onPress: () => void; hasTV?: boolean }) {
  return (
    <Focusable
      hasTV={hasTV}
      onPress={onPress}
      focusStyle={{ transform: [{ scale: 1.08 }] }}
      style={{
        paddingHorizontal: px(22),
        paddingVertical: px(12),
        borderRadius: px(24),
        backgroundColor: active ? C.accent : 'rgba(255,255,255,.08)',
        marginRight: px(12),
      }}
    >
      <Text style={{ fontSize: px(16), fontWeight: '700', color: active ? C.ink : C.text }}>{label}</Text>
    </Focusable>
  );
}

export function Avatar({
  initials,
  art,
  size = 36,
  ring,
}: {
  initials: string;
  art: string[];
  size?: number;
  ring?: string;
}) {
  const inner = (
    <Grad art={art} deg={140} style={{ width: px(size), height: px(size), borderRadius: px(size / 2), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: px(size * 0.39), fontWeight: '700', color: C.ink }}>{initials}</Text>
    </Grad>
  );
  if (!ring) return inner;
  return (
    <View style={{ padding: px(3), borderRadius: px((size + 6) / 2), borderWidth: px(3), borderColor: ring }}>
      {inner}
    </View>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: px(48),
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 60,
      }}
    >
      <View
        style={{
          backgroundColor: '#101418',
          borderColor: 'rgba(0,212,116,.4)',
          borderWidth: px(1),
          borderRadius: px(14),
          paddingHorizontal: px(28),
          paddingVertical: px(16),
          boxShadow: '0 20px 50px rgba(0,0,0,.6)' as never,
        }}
      >
        <Text style={{ fontSize: px(17), color: C.accentSoft, fontWeight: '600' }}>{msg}</Text>
      </View>
    </View>
  );
}
