import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  type PressableProps,
  type ViewStyle,
  type GestureResponderEvent,
  findNodeHandle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, focus as focusTokens, radius } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FOCUS_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

interface FocusablePressableProps extends Omit<PressableProps, 'children' | 'style'> {
  children: React.ReactNode | ((state: { focused: boolean }) => React.ReactNode);
  style?: ViewStyle;
  focusStyle?: ViewStyle;
  enableTilt?: boolean;
  enableGlow?: boolean;
  onFocusChange?: (focused: boolean) => void;
  focusKey?: string;
}

export function FocusablePressable({
  children,
  style,
  focusStyle,
  enableTilt = false,
  enableGlow = false,
  onFocusChange,
  onFocus,
  onBlur,
  onPress,
  focusKey,
  ...rest
}: FocusablePressableProps) {
  const isFocused = useSharedValue(0);
  const nodeRef = useRef<React.ElementRef<typeof Pressable>>(null);

  const handleFocus = useCallback(
    (e: GestureResponderEvent) => {
      isFocused.value = withTiming(1, {
        duration: focusTokens.duration,
        easing: FOCUS_EASING,
      });
      onFocusChange?.(true);
      onFocus?.(e);
    },
    [isFocused, onFocusChange, onFocus],
  );

  const handleBlur = useCallback(
    (e: GestureResponderEvent) => {
      isFocused.value = withTiming(0, {
        duration: focusTokens.duration,
        easing: FOCUS_EASING,
      });
      onFocusChange?.(false);
      onBlur?.(e);
    },
    [isFocused, onFocusChange, onBlur],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + (focusTokens.scale - 1) * isFocused.value;
    return {
      transform: [{ scale }],
    };
  });

  const outlineStyle = useAnimatedStyle(() => {
    return {
      borderWidth: focusTokens.outlineWidth * isFocused.value,
      borderColor: colors.accent,
      // Simulate outline-offset by using margin
    };
  });

  return (
    <AnimatedPressable
      ref={nodeRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={onPress}
      style={[animatedStyle, style, focusStyle]}
      {...rest}
    >
      {(state) => {
        const focused = (state as { focused?: boolean }).focused ?? false;
        if (typeof children === 'function') {
          return children({ focused });
        }
        return children;
      }}
    </AnimatedPressable>
  );
}

// Nativewind-free focus ring wrapper
export function FocusRing({
  children,
  focused,
  style,
}: {
  children: React.ReactNode;
  focused: boolean;
  style?: ViewStyle;
}) {
  return (
    <Animated.View
      style={[
        {
          borderWidth: focused ? focusTokens.outlineWidth : 0,
          borderColor: focused ? colors.accent : 'transparent',
          borderRadius: radius.button,
          padding: focused ? focusTokens.outlineOffset : focusTokens.outlineOffset + focusTokens.outlineWidth,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function getNodeHandle(ref: React.RefObject<React.ElementRef<typeof Pressable>>) {
  return ref.current ? findNodeHandle(ref.current) : undefined;
}
