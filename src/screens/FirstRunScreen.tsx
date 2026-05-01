import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius, components } from '@/theme/tokens';
import { PlayIcon } from '@/components/icons';

const PIN_CHARS = ['7', 'H', '4', 'P', '2', 'X'];

export function FirstRunScreen() {
  return (
    <View style={styles.container}>
      {/* Radial glow background layer */}
      <View style={styles.glowBg} />

      {/* Brand mark */}
      <View style={styles.brandArea}>
        <View style={styles.brand}>
          <View style={styles.brandCircle}>
            <PlayIcon
              size={Math.round(
                components.brandMark.size * components.brandMark.iconScale,
              )}
              color={colors.accentOnDark}
            />
          </View>
          <Text style={styles.brandText}>Playarr</Text>
        </View>
      </View>

      {/* Center content */}
      <View style={styles.center}>
        <Text style={styles.caption}>SIGN IN TO YOUR PLAYARR ACCOUNT</Text>

        <Text style={styles.instruction}>
          Enter the code below at the link on any device to pair this TV
        </Text>

        {/* PIN display */}
        <View style={styles.pinRow}>
          {PIN_CHARS.map((char, index) => (
            <View key={index} style={styles.pinBox}>
              <Text style={styles.pinChar}>{char}</Text>
            </View>
          ))}
        </View>

        {/* URL */}
        <Text style={styles.url}>playarr.tv/link</Text>

        {/* Waiting indicator */}
        <View style={styles.waitingRow}>
          <View style={styles.waitingDot} />
          <Text style={styles.waitingText}>Waiting for pairing...</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  glowBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceElevated,
    opacity: 0.6,
  },
  brandArea: {
    position: 'absolute',
    top: spacing['4xl'],
    left: spacing['5xl'],
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandCircle: {
    width: components.brandMark.size,
    height: components.brandMark.size,
    borderRadius: components.brandMark.size / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.01 * 22,
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['5xl'],
  },
  caption: {
    ...typography.caption,
    color: colors.textMute,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  instruction: {
    ...typography.heroSub,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    maxWidth: 800,
  },
  pinRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  pinBox: {
    width: 120,
    height: 160,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinChar: {
    fontSize: 96,
    fontWeight: '700',
    color: colors.text,
  },
  url: {
    ...typography.heroSub,
    color: colors.accent,
    marginBottom: spacing['2xl'],
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  waitingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  waitingText: {
    ...typography.meta,
    color: colors.textDim,
  },
});
