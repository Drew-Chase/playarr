import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, findNodeHandle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors, spacing, components, focus as focusTokens } from '@/theme/tokens';
import { rememberFocus } from '@/lib/focusMemory';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const FOCUS_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

interface CastCardProps {
  name: string;
  role: string;
}

export function CastCard({ name, role }: CastCardProps) {
  const scale = useSharedValue(1);
  const ref = useRef<React.ElementRef<typeof Pressable>>(null);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const bgColor = generateAvatarColor(name);

  return (
    <AnimatedPressable
      ref={ref}
      style={[styles.container, animStyle]}
      onFocus={() => {
        rememberFocus(findNodeHandle(ref.current));
        scale.value = withTiming(focusTokens.scale, { duration: focusTokens.duration, easing: FOCUS_EASING });
      }}
      onBlur={() => {
        scale.value = withTiming(1, { duration: focusTokens.duration, easing: FOCUS_EASING });
      }}
    >
      {({ focused }: { focused?: boolean }) => (
        <View style={styles.inner}>
          <View style={[styles.avatar, { backgroundColor: bgColor }, focused && styles.avatarFocused]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.role} numberOfLines={1}>{role}</Text>
          </View>
        </View>
      )}
    </AnimatedPressable>
  );
}

function generateAvatarColor(seed: string): string {
  const palettes = [
    '#3a1156', '#1d3a8a', '#3a0a0a', '#0f4d36', '#7a3b00',
    '#1a3a4a', '#4a1818', '#1a1a1a', '#070716', '#3a2e00',
  ];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return palettes[(h >>> 0) % palettes.length];
}

const styles = StyleSheet.create({
  container: {
    width: components.castAvatar.cardWidth,
  },
  inner: {
    alignItems: 'center',
  },
  avatar: {
    width: components.castAvatar.size,
    height: components.castAvatar.size,
    borderRadius: components.castAvatar.size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
  },
  initials: {
    fontSize: components.castAvatar.size * 0.32,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.02 * (components.castAvatar.size * 0.32),
  },
  textContainer: {
    marginTop: 10,
    alignItems: 'center',
    maxWidth: components.castAvatar.cardWidth,
    overflow: 'hidden',
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  role: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDim,
  },
});
