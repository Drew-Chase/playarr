import React, { useRef } from 'react';
import { Pressable, Text, View, StyleSheet, findNodeHandle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius, components, focus as focusTokens } from '@/theme/tokens';
import { PlayIcon } from '@/components/icons';
import { rememberFocus } from '@/lib/focusMemory';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const FOCUS_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

interface PrimaryButtonProps {
  children: string;
  icon?: 'play' | 'none';
  onPress?: () => void;
  onFocusChange?: (focused: boolean) => void;
}

export function PrimaryButton({ children, icon = 'play', onPress, onFocusChange }: PrimaryButtonProps) {
  const scale = useSharedValue(1);
  const ref = useRef<React.ElementRef<typeof Pressable>>(null);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      ref={ref}
      style={[styles.button, animStyle]}
      onPress={onPress}
      onFocus={() => {
        rememberFocus(findNodeHandle(ref.current));
        scale.value = withTiming(focusTokens.scale, { duration: focusTokens.duration, easing: FOCUS_EASING });
        onFocusChange?.(true);
      }}
      onBlur={() => {
        scale.value = withTiming(1, { duration: focusTokens.duration, easing: FOCUS_EASING });
        onFocusChange?.(false);
      }}
    >
      {({ focused }: { focused?: boolean }) => (
        <View style={[styles.inner, focused && styles.focused]}>
          {icon === 'play' && <PlayIcon size={14} color={colors.accentOnDark} />}
          <Text style={styles.label}>{children}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: components.button.gap,
    height: components.button.height,
    paddingHorizontal: components.button.paddingH,
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  focused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  label: {
    fontSize: components.button.fontSize,
    fontWeight: components.button.fontWeight,
    color: colors.accentOnDark,
  },
});
