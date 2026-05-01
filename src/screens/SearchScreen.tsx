import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors, spacing, typography, components, radius, focus as focusTokens } from '@/theme/tokens';
import { TopNav } from '@/components/layout/TopNav';
import { PosterCard } from '@/components/cards/PosterCard';
import { SearchIcon } from '@/components/icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const FOCUS_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

const QWERTY_ROWS = [
  'QWERTYUIOP'.split(''),
  "ASDFGHJKL'".split(''),
  'ZXCVBNM,.?'.split(''),
];

const TILEGRID_ROWS = [
  'ABCDEFGHIJ'.split(''),
  'KLMNOPQRST'.split(''),
  'UVWXYZ0123'.split(''),
  "456789.,'-".split(''),
];

const BOTTOM_ROW = ['SHIFT', 'SPACE', 'DELETE', 'SEARCH'];

const RECENT_SEARCHES = ['Northern Bearings', 'Horizon', 'Dark Waters', 'Meridian'];

const MOCK_RESULTS = [
  { title: 'Northern Bearings', year: '2024' },
  { title: 'North & South', year: '2004' },
  { title: 'North by Northwest', year: '1959' },
  { title: 'Northanger Abbey', year: '2007' },
  { title: 'North Face', year: '2008' },
  { title: 'Northmen', year: '2014' },
  { title: 'The North Water', year: '2021' },
  { title: 'Northern Rescue', year: '2019' },
];

interface SearchScreenProps {
  keyboardVariant?: 'qwerty' | 'tilegrid';
}

export function SearchScreen({ keyboardVariant = 'qwerty' }: SearchScreenProps) {
  const rows = keyboardVariant === 'qwerty' ? QWERTY_ROWS : TILEGRID_ROWS;

  return (
    <View style={styles.container}>
      <TopNav active="" />

      <View style={styles.content}>
        {/* Left column - search + keyboard */}
        <View style={styles.leftColumn}>
          {/* Search field */}
          <View style={styles.searchField}>
            <SearchIcon size={22} color={colors.textDim} />
            <Text style={styles.searchQuery}>NORTH</Text>
            <View style={styles.cursor} />
          </View>

          {/* Recent searches */}
          <View style={styles.recentRow}>
            {RECENT_SEARCHES.map((term) => (
              <View key={term} style={styles.recentPill}>
                <Text style={styles.recentPillText}>{term}</Text>
              </View>
            ))}
          </View>

          {/* Keyboard */}
          <View style={styles.keyboard}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keyRow}>
                {row.map((key) => (
                  <KeyButton key={key} label={key} />
                ))}
              </View>
            ))}

            {/* Bottom row */}
            <View style={styles.keyRow}>
              {BOTTOM_ROW.map((key) => (
                <KeyButton
                  key={key}
                  label={key}
                  isSearch={key === 'SEARCH'}
                  isWide={key === 'SPACE'}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Right column - results */}
        <ScrollView style={styles.rightColumn} showsVerticalScrollIndicator={false}>
          <Text style={styles.resultsHeading}>Results</Text>
          <View style={styles.resultsGrid}>
            {MOCK_RESULTS.map((item) => (
              <View key={item.title} style={styles.resultItem}>
                <PosterCard
                  title={item.title}
                  year={item.year}
                  width={components.poster.width}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

interface KeyButtonProps {
  label: string;
  isSearch?: boolean;
  isWide?: boolean;
}

function KeyButton({ label, isSearch = false, isWide = false }: KeyButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.keyPressable, isWide && styles.keyWide, animStyle]}
      onFocus={() => {
        scale.value = withTiming(focusTokens.scale, { duration: focusTokens.duration, easing: FOCUS_EASING });
      }}
      onBlur={() => {
        scale.value = withTiming(1, { duration: focusTokens.duration, easing: FOCUS_EASING });
      }}
    >
      {({ focused }: { focused?: boolean }) => (
        <View
          style={[
            styles.key,
            isSearch && styles.keySearch,
            focused && styles.keyFocused,
          ]}
        >
          <Text
            style={[
              styles.keyText,
              isSearch && styles.keySearchText,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 130,
    paddingLeft: spacing['5xl'],
    paddingRight: spacing['5xl'],
    gap: spacing['4xl'],
  },
  // Left column
  leftColumn: {
    width: 800,
  },
  searchField: {
    height: components.searchField.height,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pin,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  searchQuery: {
    ...typography.section,
    color: colors.text,
  },
  cursor: {
    width: 2,
    height: 32,
    backgroundColor: colors.accent,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  recentPill: {
    height: components.pill.height,
    paddingHorizontal: components.pill.paddingH,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  recentPillText: {
    fontSize: components.pill.fontSize,
    fontWeight: components.pill.fontWeight,
    color: colors.textDim,
  },
  // Keyboard
  keyboard: {
    gap: spacing.sm,
  },
  keyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  keyPressable: {
    flex: 1,
  },
  keyWide: {
    flex: 2,
  },
  key: {
    height: components.keyboard.keyHeight,
    backgroundColor: colors.surface,
    borderRadius: radius.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySearch: {
    backgroundColor: colors.accent,
  },
  keyFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '500',
    color: colors.text,
  },
  keySearchText: {
    color: colors.accentOnDark,
    fontWeight: '600',
  },
  // Right column
  rightColumn: {
    flex: 1,
    paddingTop: 50,
  },
  resultsHeading: {
    ...typography.section,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  resultItem: {
    width: components.poster.width,
  },
});
