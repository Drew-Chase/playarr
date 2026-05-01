import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';
import { IconButton } from '@/components/ui/IconButton';
import { PauseIcon, SkipNextIcon, SkipPrevIcon, AudioIcon, SubtitlesIcon } from '@/components/icons';
import { Scrubber } from '@/components/player/Scrubber';

interface TransportBarProps {
  variant: 'classic' | 'stacked' | 'minimal';
}

export function TransportBar({ variant }: TransportBarProps) {
  if (variant === 'classic') {
    return <ClassicTransport />;
  }
  if (variant === 'stacked') {
    return <StackedTransport />;
  }
  return <MinimalTransport />;
}

function ClassicTransport() {
  return (
    <View style={styles.classicContainer}>
      {/* Controls row */}
      <View style={styles.classicRow}>
        <Text style={styles.timeText}>22:14</Text>

        <View style={styles.classicControls}>
          <IconButton>
            <PauseIcon size={22} color={colors.text} />
          </IconButton>
          <IconButton>
            <SkipNextIcon size={22} color={colors.text} />
          </IconButton>
          <IconButton>
            <AudioIcon size={22} color={colors.text} />
          </IconButton>
          <IconButton>
            <SubtitlesIcon size={22} color={colors.text} />
          </IconButton>
        </View>

        <Text style={styles.timeText}>-29:33</Text>
      </View>

      {/* Scrubber below */}
      <Scrubber withChapters />
    </View>
  );
}

function StackedTransport() {
  return (
    <View style={styles.stackedContainer}>
      {/* Controls row */}
      <View style={styles.stackedControls}>
        <IconButton>
          <SkipPrevIcon size={22} color={colors.text} />
        </IconButton>
        <IconButton size={72}>
          <PauseIcon size={28} color={colors.text} />
        </IconButton>
        <IconButton>
          <SkipNextIcon size={22} color={colors.text} />
        </IconButton>
        <View style={styles.spacer} />
        <IconButton>
          <AudioIcon size={22} color={colors.text} />
        </IconButton>
        <IconButton>
          <SubtitlesIcon size={22} color={colors.text} />
        </IconButton>
      </View>

      {/* Scrubber */}
      <Scrubber withChapters />

      {/* Time row with chapter label */}
      <View style={styles.stackedTimeRow}>
        <Text style={styles.timeText}>22:14</Text>
        <Text style={styles.chapterLabel}>Chapter 3 - The Long Way</Text>
        <Text style={styles.timeText}>-29:33</Text>
      </View>
    </View>
  );
}

function MinimalTransport() {
  return (
    <View style={styles.minimalContainer}>
      <Text style={styles.timeText}>22:14</Text>
      <View style={styles.minimalScrubber}>
        <Scrubber focused />
      </View>
      <Text style={styles.timeText}>-29:33</Text>
      <View style={styles.spacer} />
      <IconButton>
        <AudioIcon size={22} color={colors.text} />
      </IconButton>
      <IconButton>
        <SubtitlesIcon size={22} color={colors.text} />
      </IconButton>
      <IconButton>
        <SkipNextIcon size={22} color={colors.text} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  // Classic
  classicContainer: {
    gap: spacing.sm,
  },
  classicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  // Stacked
  stackedContainer: {
    gap: spacing.md,
  },
  stackedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stackedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterLabel: {
    ...typography.meta,
    color: colors.textDim,
    textAlign: 'center',
  },

  // Minimal
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  minimalScrubber: {
    flex: 1,
  },

  // Shared
  timeText: {
    ...typography.meta,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    flex: 1,
  },
});
