import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius, spacing, typography, components, focus as focusTokens } from '@/theme/tokens';
import { CheckIcon } from '@/components/icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const FOCUS_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

interface PosterCardProps {
  title: string;
  year?: string;
  watched?: boolean;
  width?: number;
  showLabel?: boolean;
  posterColor?: string;
  onPress?: () => void;
}

export function PosterCard({
  title,
  year,
  watched = false,
  width = components.poster.width,
  showLabel = true,
  posterColor,
  onPress,
}: PosterCardProps) {
  const height = Math.round(width * 1.5);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Deterministic color from title
  const bgColor = posterColor ?? generatePosterColor(title);

  return (
    <AnimatedPressable
      style={[{ width }, animStyle]}
      onPress={onPress}
      onFocus={() => {
        scale.value = withTiming(focusTokens.scale, { duration: focusTokens.duration, easing: FOCUS_EASING });
      }}
      onBlur={() => {
        scale.value = withTiming(1, { duration: focusTokens.duration, easing: FOCUS_EASING });
      }}
    >
      {({ focused }: { focused?: boolean }) => (
        <View>
          <View
            style={[
              styles.poster,
              { width, height, backgroundColor: bgColor },
              focused && styles.posterFocused,
            ]}
          >
            {/* Poster art placeholder */}
            <View style={styles.posterArt}>
              <Text style={styles.posterTitle}>{title.toUpperCase()}</Text>
            </View>
            {watched && (
              <View style={styles.watchedDot}>
                <CheckIcon size={12} />
              </View>
            )}
          </View>
          {showLabel && (
            <View style={styles.label}>
              <Text style={styles.labelTitle} numberOfLines={1}>{title}</Text>
              {year && <Text style={styles.labelYear}>{year}</Text>}
            </View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

function generatePosterColor(seed: string): string {
  const palettes = [
    '#1a0f08', '#0a1530', '#0d0d0d', '#0a1a14', '#160a20',
    '#1c0e02', '#06121a', '#1a0b0b', '#080808', '#0a0a18',
  ];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return palettes[(h >>> 0) % palettes.length];
}

const styles = StyleSheet.create({
  poster: {
    borderRadius: radius.poster,
    overflow: 'hidden',
    position: 'relative',
  },
  posterFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  posterArt: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
  },
  posterTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    letterSpacing: 0.02 * 18,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 16,
  },
  watchedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: components.watchedDot.size,
    height: components.watchedDot.size,
    borderRadius: components.watchedDot.size / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  label: {
    marginTop: spacing.md,
  },
  labelTitle: {
    ...typography.card,
    color: colors.text,
  },
  labelYear: {
    ...typography.meta,
    color: colors.textDim,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
