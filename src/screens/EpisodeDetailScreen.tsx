import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, components, radius } from '@/theme/tokens';
import { TopNav } from '@/components/layout/TopNav';
import { Rail } from '@/components/layout/Rail';
import { MetaStrip } from '@/components/ui/MetaStrip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconButton } from '@/components/ui/IconButton';
import { CastCard } from '@/components/cards/CastCard';
import { DotsIcon, DownloadIcon, ChevronIcon } from '@/components/icons';
import { featured, cast, episodes } from '@/fixtures/home';

interface EpisodeDetailScreenProps {
  showId: string;
  episodeId: string;
}

const THUMBNAIL_WIDTH = 720;
const THUMBNAIL_HEIGHT = Math.round(THUMBNAIL_WIDTH * 9 / 16);

export function EpisodeDetailScreen({ showId, episodeId }: EpisodeDetailScreenProps) {
  const show = featured;
  const episode = episodes.find((ep) => ep.id === episodeId) ?? episodes[3];
  const seasonNum = 2;
  const epIndex = episodes.findIndex((ep) => ep.id === (episodeId ?? episode.id));
  const epNumber = epIndex >= 0 ? epIndex + 1 : 4;
  const epCode = `S${String(seasonNum).padStart(2, '0')}E${String(epNumber).padStart(2, '0')}`;

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
          <Pressable>
            {({ focused }) => (
              <Text style={[styles.breadcrumbLink, focused && styles.breadcrumbLinkFocused]}>
                Season {seasonNum}
              </Text>
            )}
          </Pressable>
          <ChevronIcon size={14} color={colors.textMute} direction="right" />
          <Text style={styles.breadcrumbCurrent}>{episode.title}</Text>
        </View>

        {/* Episode detail layout */}
        <View style={styles.detailLayout}>
          {/* Large thumbnail */}
          <View style={styles.thumbnail}>
            {/* Episode badge */}
            <View style={styles.badgeEp}>
              <Text style={styles.badgeText}>{episode.ep}</Text>
            </View>
            {/* Runtime badge */}
            <View style={styles.badgeRuntime}>
              <Text style={styles.badgeText}>{episode.runtime}</Text>
            </View>
          </View>

          {/* Metadata */}
          <View style={styles.metaArea}>
            <Text style={styles.showLabel}>
              {show.title.toUpperCase()} {epCode}
            </Text>
            <Text style={styles.episodeTitle}>{episode.title}</Text>
            <View style={styles.metaStripRow}>
              <MetaStrip items={[show.year, show.rating, episode.runtime, show.resolution]} />
            </View>
            <Text style={styles.synopsis} numberOfLines={5}>{episode.syn}</Text>
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
            <View style={styles.ctaRow}>
              <PrimaryButton>Play</PrimaryButton>
              <IconButton><DotsIcon size={18} color={colors.text} /></IconButton>
              <IconButton><DownloadIcon size={22} color={colors.text} /></IconButton>
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

  /* Detail layout */
  detailLayout: {
    flexDirection: 'row',
    paddingHorizontal: spacing['5xl'],
    paddingTop: 70,
    gap: spacing['2xl'] + spacing.sm,
  },
  thumbnail: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: radius.backdrop,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
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

  /* Metadata */
  metaArea: {
    flex: 1,
    paddingTop: spacing.lg,
    maxWidth: 900,
  },
  showLabel: {
    ...typography.caption,
    color: colors.textMute,
    marginBottom: spacing.md,
  },
  episodeTitle: {
    ...typography.heroSub,
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
    marginBottom: spacing.xl,
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
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  /* Rails */
  castRail: {
    marginTop: spacing['4xl'] + spacing['2xl'],
  },
  bottomSpacer: {
    height: spacing['5xl'],
  },
});
