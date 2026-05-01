import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, radius, typography, components, focus as focusTokens } from '@/theme/tokens';
import { ChevronIcon } from '@/components/icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const FOCUS_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

/* ------------------------------------------------------------------ */
/*  Compact filter items (Library/All, Genre/All, Year/Any, Sort/Title)   */
/* ------------------------------------------------------------------ */

interface CompactFilterItem {
  label: string;
  value: string;
}

const COMPACT_FILTERS: CompactFilterItem[] = [
  { label: 'Library', value: 'All' },
  { label: 'Genre', value: 'All' },
  { label: 'Year', value: 'Any' },
  { label: 'Sort', value: 'Title' },
];

/* ------------------------------------------------------------------ */
/*  Segmented genre pills                                               */
/* ------------------------------------------------------------------ */

const GENRE_PILLS = [
  'All',
  'Drama',
  'Thriller',
  'Comedy',
  'Sci-Fi',
  'Documentary',
  'Animation',
  'Horror',
  'Romance',
];

/* ------------------------------------------------------------------ */
/*  Focusable wrapper for individual filter items                       */
/* ------------------------------------------------------------------ */

function FocusableFilterItem({ children }: { children: (focused: boolean) => React.ReactElement }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleFocus = useCallback(() => {
    scale.value = withTiming(focusTokens.scale, {
      duration: focusTokens.duration,
      easing: FOCUS_EASING,
    });
  }, [scale]);

  const handleBlur = useCallback(() => {
    scale.value = withTiming(1, {
      duration: focusTokens.duration,
      easing: FOCUS_EASING,
    });
  }, [scale]);

  return (
    <AnimatedPressable
      style={animStyle}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {({ focused }: { focused?: boolean }) => children(focused ?? false)}
    </AnimatedPressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact variant                                                     */
/* ------------------------------------------------------------------ */

interface CompactStripProps {
  count: number;
}

function CompactStrip({ count }: CompactStripProps) {
  return (
    <View style={styles.compactRow}>
      {COMPACT_FILTERS.map((filter) => (
        <FocusableFilterItem key={filter.label}>
          {(focused) => (
            <View style={[styles.compactItem, focused && styles.compactItemFocused]}>
              <Text style={styles.compactLabel}>{filter.label}</Text>
              <Text style={styles.compactValue}>{filter.value}</Text>
              {filter.label === 'Sort' ? (
                <ChevronIcon size={12} color={colors.textDim} direction="up" />
              ) : (
                <ChevronIcon size={12} color={colors.textDim} direction="down" />
              )}
            </View>
          )}
        </FocusableFilterItem>
      ))}
      <View style={styles.compactSpacer} />
      <Text style={styles.countLabel}>{count.toLocaleString()} titles</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Segmented variant                                                   */
/* ------------------------------------------------------------------ */

interface SegmentedStripProps {
  activeGenre?: string;
}

function SegmentedStrip({ activeGenre = 'All' }: SegmentedStripProps) {
  return (
    <View style={styles.segmentedRow}>
      {GENRE_PILLS.map((genre) => {
        const isActive = genre === activeGenre;
        return (
          <FocusableFilterItem key={genre}>
            {(focused) => (
              <View
                style={[
                  styles.segmentedPill,
                  isActive && styles.segmentedPillActive,
                  focused && styles.segmentedPillFocused,
                ]}
              >
                <Text
                  style={[
                    styles.segmentedText,
                    isActive && styles.segmentedTextActive,
                  ]}
                >
                  {genre}
                </Text>
              </View>
            )}
          </FocusableFilterItem>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                    */
/* ------------------------------------------------------------------ */

interface FilterStripProps {
  variant: 'compact' | 'segmented';
  count?: number;
  activeGenre?: string;
}

export function FilterStrip({ variant, count = 0, activeGenre = 'All' }: FilterStripProps) {
  if (variant === 'compact') {
    return <CompactStrip count={count} />;
  }
  return <SegmentedStrip activeGenre={activeGenre} />;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  // Compact
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    height: 40,
  },
  compactItemFocused: {
    borderColor: colors.accent,
    borderWidth: focusTokens.outlineWidth,
  },
  compactLabel: {
    ...typography.meta,
    color: colors.textMute,
  },
  compactValue: {
    ...typography.meta,
    color: colors.text,
    fontWeight: '600',
  },
  compactSpacer: {
    flex: 1,
  },
  countLabel: {
    ...typography.meta,
    color: colors.textMute,
  },

  // Segmented
  segmentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  segmentedPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: components.pill.paddingH,
    height: components.pill.height,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentedPillActive: {
    backgroundColor: colors.accent,
  },
  segmentedPillFocused: {
    borderColor: colors.accent,
    borderWidth: focusTokens.outlineWidth,
  },
  segmentedText: {
    fontSize: components.pill.fontSize,
    fontWeight: components.pill.fontWeight,
    color: colors.textDim,
    letterSpacing: 0.005 * components.pill.fontSize,
  },
  segmentedTextActive: {
    color: colors.accentOnDark,
  },
});
