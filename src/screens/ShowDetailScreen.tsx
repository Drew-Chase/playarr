import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, components, radius, heroGradient } from '@/theme/tokens';
import { TopNav } from '@/components/layout/TopNav';
import { Rail } from '@/components/layout/Rail';
import { MetaStrip } from '@/components/ui/MetaStrip';
import { GenrePills } from '@/components/ui/GenrePills';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconButton } from '@/components/ui/IconButton';
import { PosterCard } from '@/components/cards/PosterCard';
import { CastCard } from '@/components/cards/CastCard';
import { DotsIcon, ShuffleIcon } from '@/components/icons';
import { featured, cast, similarTitles } from '@/fixtures/home';

interface ShowDetailScreenProps {
  id: string;
}

const POSTER_WIDTH = 320;
const POSTER_HEIGHT = 480;

const seasons = [
  { id: 's1', title: 'Season 1', year: '2023', watched: true },
  { id: 's2', title: 'Season 2', year: '2024', watched: false },
  { id: 's3', title: 'Season 3', year: '2025', watched: false },
];

export function ShowDetailScreen({ id }: ShowDetailScreenProps) {
  const show = featured;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero backdrop */}
        <View style={styles.heroBackdrop}>
          <View style={styles.backdropPlaceholder} />
          <LinearGradient
            colors={heroGradient.vertical.colors}
            locations={[...heroGradient.vertical.locations]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={heroGradient.horizontal.colors}
            locations={[...heroGradient.horizontal.locations]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Overlap layout: poster + metadata */}
        <View style={styles.overlapLayout}>
          {/* Poster */}
          <View style={styles.overlapPoster}>
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterPlaceholderText}>
                {show.title.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Metadata area */}
          <View style={styles.overlapMeta}>
            <Text style={styles.heroTitle}>{show.title}</Text>
            <View style={styles.metaStripRow}>
              <MetaStrip
                items={[
                  show.year,
                  show.rating,
                  '3 seasons / 24 episodes',
                  show.resolution,
                  show.audio,
                ]}
              />
            </View>
            <Text style={styles.synopsis} numberOfLines={4}>{show.synopsis}</Text>
            <View style={styles.creditsBlock}>
              <View style={styles.creditRow}>
                <Text style={styles.creditLabel}>DIRECTOR</Text>
                <Text style={styles.creditValue}>{show.director}</Text>
              </View>
              <View style={styles.creditRow}>
                <Text style={styles.creditLabel}>WRITERS</Text>
                <Text style={styles.creditValue}>{show.writers}</Text>
              </View>
            </View>
            <View style={styles.genresRow}>
              <GenrePills genres={show.genres} />
            </View>
            <View style={styles.ctaRow}>
              <PrimaryButton>Play S2 E04 -- The Long Way Around</PrimaryButton>
              <IconButton><ShuffleIcon size={22} color={colors.text} /></IconButton>
              <IconButton><DotsIcon size={18} color={colors.text} /></IconButton>
            </View>
          </View>
        </View>

        {/* Cast rail */}
        <View style={styles.castRail}>
          <Rail
            heading="Cast"
            data={cast}
            estimatedItemSize={134}
            showSeeAll={false}
            renderItem={(item) => (
              <CastCard name={item.name} role={item.role} />
            )}
          />
        </View>

        {/* Seasons rail */}
        <View style={styles.sectionRail}>
          <Rail
            heading="Seasons"
            data={seasons}
            estimatedItemSize={244}
            showSeeAll={false}
            renderItem={(item) => (
              <PosterCard
                title={item.title}
                year={item.year}
                watched={item.watched}
                width={220}
              />
            )}
          />
        </View>

        {/* Similar rail */}
        <View style={styles.sectionRail}>
          <Rail
            heading="Similar"
            data={similarTitles}
            estimatedItemSize={244}
            renderItem={(item) => (
              <PosterCard
                title={item.title}
                year={item.year}
                watched={item.watched}
                width={220}
              />
            )}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TopNav active="TV Shows" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  heroBackdrop: {
    height: components.hero.height,
    position: 'relative',
  },
  backdropPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
  },

  /* Overlap layout */
  overlapLayout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  overlapPoster: {
    position: 'absolute',
    left: spacing['5xl'],
    top: 280,
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: radius.poster,
    overflow: 'hidden',
  },
  posterPlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: spacing.lg,
  },
  posterPlaceholderText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.borderSubtle,
    textAlign: 'center',
    letterSpacing: 0.02 * 18,
  },
  overlapMeta: {
    position: 'absolute',
    left: spacing['5xl'] + POSTER_WIDTH + spacing['3xl'] + spacing.xl,
    top: 320,
    right: spacing['5xl'],
    maxWidth: 900,
  },

  /* Shared typography */
  heroTitle: {
    ...typography.hero,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  metaStripRow: {
    marginBottom: spacing.lg,
  },
  synopsis: {
    ...typography.body,
    color: colors.text,
    maxWidth: 760,
    marginBottom: spacing.xl,
  },
  creditsBlock: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  creditLabel: {
    ...typography.caption,
    color: colors.textMute,
  },
  creditValue: {
    ...typography.meta,
    color: colors.textDim,
  },
  genresRow: {
    marginBottom: spacing.xl,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  /* Rails */
  castRail: {
    marginTop: 100,
  },
  sectionRail: {
    marginTop: spacing['3xl'],
  },
  bottomSpacer: {
    height: spacing['5xl'],
  },
});
