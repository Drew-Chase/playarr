import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, components, radius } from '@/theme/tokens';
import { TopNav } from '@/components/layout/TopNav';
import { MetaStrip } from '@/components/ui/MetaStrip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconButton } from '@/components/ui/IconButton';
import { DotsIcon, ChevronIcon } from '@/components/icons';
import { featured, episodes } from '@/fixtures/home';

interface SeasonDetailScreenProps {
  showId: string;
  seasonNum: string;
}

const SEASON_POSTER_WIDTH = 280;
const SEASON_POSTER_HEIGHT = 420;
const EPISODE_COLUMNS = 4;
const EPISODE_GAP = spacing.xl;

export function SeasonDetailScreen({ showId, seasonNum }: SeasonDetailScreenProps) {
  const show = featured;
  const seasonNumber = parseInt(seasonNum, 10) || 2;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <Pressable>
            {({ focused }) => (
              <Text style={[styles.breadcrumbLink, focused && styles.breadcrumbLinkFocused]}>
                {show.title}
              </Text>
            )}
          </Pressable>
          <ChevronIcon size={14} color={colors.textMute} direction="right" />
          <Text style={styles.breadcrumbCurrent}>Season {seasonNumber}</Text>
        </View>

        {/* Season header */}
        <View style={styles.seasonHeader}>
          {/* Season poster */}
          <View style={styles.seasonPoster}>
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterPlaceholderText}>
                {'SEASON ' + seasonNumber}
              </Text>
            </View>
          </View>

          {/* Season info */}
          <View style={styles.seasonInfo}>
            <Text style={styles.showLabel}>{show.title.toUpperCase()}</Text>
            <Text style={styles.seasonTitle}>
              Season {seasonNumber} / {episodes.length} episodes
            </Text>
            <Text style={styles.synopsis} numberOfLines={4}>
              {show.synopsis}
            </Text>
            <View style={styles.ctaRow}>
              <PrimaryButton>Play</PrimaryButton>
              <IconButton><DotsIcon size={18} color={colors.text} /></IconButton>
            </View>
          </View>
        </View>

        {/* Episode grid */}
        <View style={styles.episodeGrid}>
          {episodes.map((ep) => (
            <EpisodeCard key={ep.id} episode={ep} />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TopNav active="TV Shows" />
    </View>
  );
}

interface EpisodeCardProps {
  episode: {
    id: string;
    ep: string;
    title: string;
    runtime: string;
    watched: boolean;
    syn: string;
  };
}

function EpisodeCard({ episode }: EpisodeCardProps) {
  const thumbWidth = (1920 - spacing['5xl'] * 2 - EPISODE_GAP * (EPISODE_COLUMNS - 1)) / EPISODE_COLUMNS;
  const thumbHeight = Math.round(thumbWidth * 9 / 16);

  return (
    <Pressable style={[styles.episodeCardContainer, { width: thumbWidth }]}>
      {({ focused }) => (
        <View>
          <View
            style={[
              styles.episodeThumbnail,
              { width: thumbWidth, height: thumbHeight },
              focused && styles.episodeThumbnailFocused,
            ]}
          >
            {/* Episode badge */}
            <View style={styles.badgeEp}>
              <Text style={styles.badgeText}>{episode.ep}</Text>
            </View>
            {/* Runtime badge */}
            <View style={styles.badgeRuntime}>
              <Text style={styles.badgeText}>{episode.runtime}</Text>
            </View>
          </View>
          <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle} numberOfLines={1}>{episode.title}</Text>
            <Text style={styles.episodeSyn} numberOfLines={2}>{episode.syn}</Text>
          </View>
        </View>
      )}
    </Pressable>
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

  /* Breadcrumb */
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing['5xl'],
    paddingTop: 130,
  },
  breadcrumbLink: {
    ...typography.meta,
    color: colors.textDim,
  },
  breadcrumbLinkFocused: {
    color: colors.accent,
  },
  breadcrumbCurrent: {
    ...typography.meta,
    color: colors.text,
  },

  /* Season header */
  seasonHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing['5xl'],
    paddingTop: 70,
    gap: spacing['2xl'],
  },
  seasonPoster: {
    width: SEASON_POSTER_WIDTH,
    height: SEASON_POSTER_HEIGHT,
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
  seasonInfo: {
    flex: 1,
    paddingTop: spacing['2xl'] + spacing.sm,
    maxWidth: 900,
  },
  showLabel: {
    ...typography.caption,
    color: colors.textMute,
    marginBottom: spacing.md,
  },
  seasonTitle: {
    ...typography.heroSub,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  synopsis: {
    ...typography.body,
    color: colors.text,
    maxWidth: 760,
    marginBottom: spacing.xl,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  /* Episode grid */
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing['5xl'],
    paddingTop: spacing['4xl'] + spacing['2xl'],
    gap: EPISODE_GAP,
  },
  episodeCardContainer: {
    marginBottom: spacing.lg,
  },
  episodeThumbnail: {
    borderRadius: radius.backdrop,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
  },
  episodeThumbnailFocused: {
    borderWidth: 3,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
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
  episodeInfo: {
    marginTop: spacing.md,
  },
  episodeTitle: {
    ...typography.card,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  episodeSyn: {
    ...typography.meta,
    color: colors.textDim,
    lineHeight: typography.meta.fontSize * 1.45,
  },

  bottomSpacer: {
    height: spacing['5xl'],
  },
});
