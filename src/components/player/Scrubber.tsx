import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, components, focus as focusTokens } from '@/theme/tokens';

const CHAPTER_POSITIONS = [0, 18, 31, 47, 64, 79, 92];

interface ScrubberProps {
  progress?: number;
  withChapters?: boolean;
  focused?: boolean;
}

export function Scrubber({ progress = 43, withChapters = false, focused = false }: ScrubberProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      {/* Track */}
      <View style={styles.track}>
        {/* Fill */}
        <View style={[styles.fill, { width: `${clampedProgress}%` }]} />

        {/* Knob */}
        <View style={[styles.knobContainer, { left: `${clampedProgress}%` }]}>
          <View style={styles.knob} />
        </View>

        {/* Chapter marks */}
        {withChapters &&
          CHAPTER_POSITIONS.map((pos) => (
            <View key={pos} style={[styles.chapterMark, { left: `${pos}%` }]} />
          ))}
      </View>
    </View>
  );
}

const { scrubber } = components;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    justifyContent: 'center',
  },
  containerFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  track: {
    height: scrubber.trackHeight,
    backgroundColor: colors.borderSubtle,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  knobContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -(scrubber.knobSize / 2),
    marginLeft: -(scrubber.knobSize / 2),
    width: scrubber.knobSize,
    height: scrubber.knobSize,
    zIndex: 2,
  },
  knob: {
    width: scrubber.knobSize,
    height: scrubber.knobSize,
    borderRadius: scrubber.knobSize / 2,
    backgroundColor: colors.accent,
    shadowColor: 'rgba(34,197,94,0.25)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: scrubber.knobGlow,
    elevation: 4,
  },
  chapterMark: {
    position: 'absolute',
    width: scrubber.chapterWidth,
    top: -3,
    bottom: -3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    zIndex: 1,
  },
});
