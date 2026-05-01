import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '@/theme/tokens';
import { IconButton } from '@/components/ui/IconButton';
import { BackIcon } from '@/components/icons';
import { TransportBar } from '@/components/player/TransportBar';

interface PlayerScreenProps {
  mediaId: string;
  transportVariant?: 'classic' | 'stacked' | 'minimal';
  chromeVisible?: boolean;
}

export function PlayerScreen({
  mediaId,
  transportVariant = 'classic',
  chromeVisible = true,
}: PlayerScreenProps) {
  return (
    <View style={styles.container}>
      {/* Full-bleed video backdrop placeholder */}
      <View style={styles.backdrop} />

      {chromeVisible && (
        <>
          {/* Top chrome */}
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0)']}
            style={styles.topGradient}
          >
            <View style={styles.topChrome}>
              <IconButton>
                <BackIcon size={22} color={colors.text} />
              </IconButton>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeCaption}>
                  NORTHERN BEARINGS S02E04
                </Text>
                <Text style={styles.episodeTitle}>The Long Way Around</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Bottom chrome */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
            style={styles.bottomGradient}
          >
            <View style={styles.bottomChrome}>
              <TransportBar variant={transportVariant} />
            </View>
          </LinearGradient>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing['5xl'],
    paddingBottom: spacing['4xl'],
  },
  topChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeCaption: {
    ...typography.caption,
    color: colors.textDim,
    marginBottom: spacing.xs,
  },
  episodeTitle: {
    ...typography.card,
    color: colors.text,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing['5xl'],
    paddingTop: spacing['4xl'],
    justifyContent: 'flex-end',
  },
  bottomChrome: {
    // TransportBar fills this space
  },
});
