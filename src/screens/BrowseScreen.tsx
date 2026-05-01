import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { TopNav } from '@/components/layout/TopNav';
import { PosterCard } from '@/components/cards/PosterCard';
import { FilterStrip } from '@/components/ui/FilterStrip';
import { movies } from '@/fixtures/home';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const NUM_COLUMNS = 6;
const SCREEN_WIDTH = 1920;
const SIDE_PADDING = spacing['5xl']; // 96
const ALPHA_RAIL_WIDTH = 48;
const GRID_GAP = spacing.xl; // 24
const GRID_TOP = 280;

const AVAILABLE_WIDTH = SCREEN_WIDTH - SIDE_PADDING * 2 - ALPHA_RAIL_WIDTH;
const POSTER_WIDTH = Math.floor(
  (AVAILABLE_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
);

const ALPHABET = [
  '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

/* ------------------------------------------------------------------ */
/*  Alpha Rail                                                          */
/* ------------------------------------------------------------------ */

interface AlphaRailProps {
  activeLetter?: string;
}

function AlphaRail({ activeLetter = 'A' }: AlphaRailProps) {
  return (
    <View style={styles.alphaRail}>
      {ALPHABET.map((letter) => (
        <Text
          key={letter}
          style={[
            styles.alphaLetter,
            letter === activeLetter && styles.alphaLetterActive,
          ]}
        >
          {letter}
        </Text>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Browse Screen                                                       */
/* ------------------------------------------------------------------ */

interface BrowseScreenProps {
  filterVariant: 'compact' | 'segmented';
  category: 'movies' | 'shows';
}

export function BrowseScreen({ filterVariant, category }: BrowseScreenProps) {
  const activeNav = category === 'movies' ? 'Movies' : 'TV Shows';
  const title = category === 'movies' ? 'Movies' : 'TV Shows';

  // Determine active alpha letter from first item
  const activeLetter = useMemo(() => {
    if (movies.length === 0) return 'A';
    const first = movies[0].title.charAt(0).toUpperCase();
    return /[A-Z]/.test(first) ? first : '#';
  }, []);

  return (
    <View style={styles.container}>
      <TopNav active={activeNav} />

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{movies.length.toLocaleString()} titles</Text>
      </View>

      {/* Filter strip */}
      <View style={styles.filterContainer}>
        <FilterStrip
          variant={filterVariant}
          count={movies.length}
        />
      </View>

      {/* Poster grid + alpha rail */}
      <View style={styles.gridArea}>
        <View style={styles.gridContainer}>
          <FlashList
            data={movies}
            numColumns={NUM_COLUMNS}
            estimatedItemSize={POSTER_WIDTH * 1.5 + 60}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <PosterCard
                  title={item.title}
                  year={item.year}
                  watched={item.watched}
                  width={POSTER_WIDTH}
                />
              </View>
            )}
          />
        </View>

        <AlphaRail activeLetter={activeLetter} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Title block
  titleBlock: {
    position: 'absolute',
    top: 120,
    left: SIDE_PADDING,
    zIndex: 5,
  },
  title: {
    ...typography.heroSub,
    color: colors.text,
  },
  count: {
    ...typography.meta,
    color: colors.textDim,
    marginTop: spacing.xs,
  },

  // Filter strip
  filterContainer: {
    position: 'absolute',
    top: 200,
    left: SIDE_PADDING,
    right: SIDE_PADDING + ALPHA_RAIL_WIDTH,
    marginTop: 28,
    zIndex: 5,
  },

  // Grid area
  gridArea: {
    position: 'absolute',
    top: GRID_TOP,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  gridContainer: {
    flex: 1,
    paddingLeft: SIDE_PADDING,
    paddingRight: ALPHA_RAIL_WIDTH,
  },
  gridContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  gridItem: {
    paddingRight: GRID_GAP,
    paddingBottom: spacing['2xl'],
  },

  // Alpha rail
  alphaRail: {
    position: 'absolute',
    right: spacing.xl,
    top: GRID_TOP - 280, // relative to gridArea
    bottom: 0,
    width: ALPHA_RAIL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  alphaLetter: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMute,
    textAlign: 'center',
    lineHeight: 18,
  },
  alphaLetterActive: {
    color: colors.accent,
  },
});
