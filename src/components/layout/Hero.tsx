import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, components, heroGradient } from '@/theme/tokens';
import { MetaStrip } from '@/components/ui/MetaStrip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconButton } from '@/components/ui/IconButton';
import { DotsIcon, DownloadIcon } from '@/components/icons';
import type { HeroVariant } from '@/types/media';

interface HeroProps {
  title: string;
  year: string;
  rating: string;
  runtime: string;
  resolution: string;
  audio: string;
  synopsis: string;
  ctaLabel: string;
  variant?: HeroVariant;
  backdropColor?: string;
  backdropUrl?: string;
  posterUrl?: string;
  onPressCta?: () => void;
}

export function Hero({
  title,
  year,
  rating,
  runtime,
  resolution,
  audio,
  synopsis,
  ctaLabel,
  variant = 'classic',
  backdropColor = colors.surface,
  backdropUrl,
  posterUrl,
  onPressCta,
}: HeroProps) {
  return (
    <View style={styles.container}>
      {/* Backdrop */}
      {backdropUrl ? (
        <Image
          source={{ uri: backdropUrl }}
          style={styles.backdrop}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.backdrop, { backgroundColor: backdropColor }]} />
      )}

      {/* Gradient overlays */}
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

      {/* Content */}
      {variant === 'classic' ? (
        <View style={styles.classicContent}>
          <Text style={styles.featured}>FEATURED</Text>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.metaRow}>
            <MetaStrip items={[year, rating, runtime, resolution, audio]} />
          </View>
          <Text style={styles.synopsis} numberOfLines={3}>{synopsis}</Text>
          <View style={styles.ctaRow}>
            <PrimaryButton onPress={onPressCta}>{ctaLabel}</PrimaryButton>
            <IconButton><DotsIcon size={18} color={colors.text} /></IconButton>
            <IconButton><DownloadIcon size={22} color={colors.text} /></IconButton>
          </View>
        </View>
      ) : (
        <View style={styles.cinematicContent}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={styles.cinematicPoster}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.cinematicPoster} />
          )}
          <View style={styles.cinematicText}>
            <Text style={styles.featured}>FEATURED</Text>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.metaRow}>
              <MetaStrip items={[year, rating, runtime, resolution]} />
            </View>
            <Text style={styles.synopsis} numberOfLines={3}>{synopsis}</Text>
            <View style={styles.ctaRow}>
              <PrimaryButton onPress={onPressCta}>{ctaLabel}</PrimaryButton>
              <IconButton><DotsIcon size={18} color={colors.text} /></IconButton>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: components.hero.height,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  classicContent: {
    position: 'absolute',
    top: 220,
    left: spacing['5xl'],
    right: spacing['5xl'],
    maxWidth: 1100,
  },
  cinematicContent: {
    position: 'absolute',
    top: 180,
    left: spacing['5xl'],
    right: spacing['5xl'],
    flexDirection: 'row',
    gap: 64,
  },
  cinematicPoster: {
    width: 280,
    height: 420,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  cinematicText: {
    flex: 1,
    paddingTop: 80,
    maxWidth: 900,
  },
  featured: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.hero,
    color: colors.text,
    marginBottom: 18,
  },
  metaRow: {
    marginBottom: 18,
  },
  synopsis: {
    ...typography.body,
    color: colors.text,
    maxWidth: 760,
    marginBottom: 22,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
