import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, findNodeHandle } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius, spacing, typography, components, focus as focusTokens } from '@/theme/tokens';
import { CheckIcon } from '@/components/icons';
import { rememberFocus } from '@/lib/focusMemory';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const FOCUS_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

interface BackdropCardProps {
  title: string;
  sub?: string;
  progress?: number;
  runtime?: string;
  episode?: string;
  watched?: boolean;
  width?: number;
  hideLabel?: boolean;
  imageUrl?: string;
  onPress?: () => void;
}

export function BackdropCard({
  title,
  sub,
  progress,
  runtime,
  episode,
  watched = false,
  width = components.backdrop.width,
  hideLabel = false,
  imageUrl,
  onPress,
}: BackdropCardProps) {
  const height = Math.round(width * 9 / 16);
  const scale = useSharedValue(1);
  const ref = useRef<React.ElementRef<typeof Pressable>>(null);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgColor = generateBackdropColor(title);

  return (
    <AnimatedPressable
      ref={ref}
      style={[{ width }, animStyle]}
      onPress={onPress}
      onFocus={() => {
        rememberFocus(findNodeHandle(ref.current));
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
              styles.backdrop,
              { width, height, backgroundColor: bgColor },
              focused && styles.backdropFocused,
            ]}
          >
            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
              />
            )}
            {episode && (
              <View style={styles.badgeEp}>
                <Text style={styles.badgeText}>{episode}</Text>
              </View>
            )}
            {runtime && (
              <View style={styles.badgeRuntime}>
                <Text style={styles.badgeText}>{runtime}</Text>
              </View>
            )}
            {watched && (
              <View style={styles.watchedDot}>
                <CheckIcon size={12} />
              </View>
            )}
            {progress != null && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            )}
          </View>
          {!hideLabel && (
            <View style={styles.label}>
              <Text style={styles.labelTitle} numberOfLines={1}>{title}</Text>
              {sub && <Text style={styles.labelSub}>{sub}</Text>}
            </View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

function generateBackdropColor(seed: string): string {
  const palettes = [
    '#1a0f08', '#0a1530', '#0a1a14', '#160a20', '#06121a',
    '#1a0b0b', '#0a0a18', '#1c0e02', '#0d0d0d', '#1a1500',
  ];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return palettes[(h >>> 0) % palettes.length];
}

const styles = StyleSheet.create({
  backdrop: {
    borderRadius: radius.backdrop,
    overflow: 'hidden',
    position: 'relative',
  },
  backdropFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  badgeEp: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.overlayDark,
    paddingVertical: components.badge.paddingV,
    paddingHorizontal: components.badge.paddingH,
    borderRadius: components.badge.radius,
    zIndex: 2,
  },
  badgeRuntime: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.overlayDark,
    paddingVertical: components.badge.paddingV,
    paddingHorizontal: components.badge.paddingH,
    borderRadius: components.badge.radius,
    zIndex: 2,
  },
  badgeText: {
    fontSize: components.badge.fontSize,
    fontWeight: components.badge.fontWeight,
    color: colors.text,
    letterSpacing: 0.06 * components.badge.fontSize,
    fontVariant: ['tabular-nums'],
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
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: components.progress.height,
    backgroundColor: `rgba(255,255,255,${components.progress.trackOpacity})`,
    zIndex: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  label: {
    marginTop: 10,
  },
  labelTitle: {
    ...typography.card,
    color: colors.text,
  },
  labelSub: {
    ...typography.meta,
    color: colors.textDim,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
