import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius, components, focus as focusTokens } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const FOCUS_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

interface IconButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  size?: number;
}

export function IconButton({ children, onPress, size = components.button.iconSize }: IconButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.button, { width: size, height: size }, animStyle]}
      onPress={onPress}
      onFocus={() => {
        scale.value = withTiming(focusTokens.scale, { duration: focusTokens.duration, easing: FOCUS_EASING });
      }}
      onBlur={() => {
        scale.value = withTiming(1, { duration: focusTokens.duration, easing: FOCUS_EASING });
      }}
    >
      {({ focused }: { focused?: boolean }) => (
        <View style={[styles.inner, { width: size, height: size }, focused && styles.focused]}>
          {children}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
});
