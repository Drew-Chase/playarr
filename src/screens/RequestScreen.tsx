import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, components, radius, focus as focusTokens } from '@/theme/tokens';
import { MetaStrip } from '@/components/ui/MetaStrip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

interface RequestScreenProps {
  mediaId: string;
}

type QualityOption = 'Auto' | '1080p' | '4K HDR';
type AudioOption = 'English' | 'French' | 'Original';
type SubtitleOption = 'English' | 'None';

const QUALITY_OPTIONS: QualityOption[] = ['Auto', '1080p', '4K HDR'];
const AUDIO_OPTIONS: AudioOption[] = ['English', 'French', 'Original'];
const SUBTITLE_OPTIONS: SubtitleOption[] = ['English', 'None'];

export function RequestScreen({ mediaId }: RequestScreenProps) {
  const [quality, setQuality] = useState<QualityOption>('Auto');
  const [audio, setAudio] = useState<AudioOption>('English');
  const [subtitles, setSubtitles] = useState<SubtitleOption>('English');

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        {/* Pill handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Content row */}
        <View style={styles.contentRow}>
          {/* Poster placeholder */}
          <View style={styles.poster} />

          {/* Metadata */}
          <View style={styles.metadata}>
            <Text style={styles.captionLabel}>REQUEST / NOT IN YOUR LIBRARY</Text>
            <Text style={styles.titleText}>Coastal Recovery</Text>
            <View style={styles.metaRow}>
              <MetaStrip items={['2024', 'R', '2h 04m', '4K HDR', 'Atmos']} />
            </View>
            <Text style={styles.synopsis} numberOfLines={3}>
              A marine biologist returns to the coastal town she abandoned a decade ago, only to
              find the reef she once fought to save is dying faster than anyone predicted. A slow-burn
              drama about guilt, conservation, and the things we leave behind.
            </Text>
          </View>
        </View>

        {/* Quality picker */}
        <View style={styles.pickerRow}>
          <Text style={styles.pickerLabel}>QUALITY</Text>
          <View style={styles.pickerOptions}>
            {QUALITY_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={quality === opt}
                onPress={() => setQuality(opt)}
              />
            ))}
          </View>
        </View>

        {/* Audio picker */}
        <View style={styles.pickerRow}>
          <Text style={styles.pickerLabel}>AUDIO</Text>
          <View style={styles.pickerOptions}>
            {AUDIO_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={audio === opt}
                onPress={() => setAudio(opt)}
              />
            ))}
          </View>
        </View>

        {/* Subtitles picker */}
        <View style={styles.pickerRow}>
          <Text style={styles.pickerLabel}>SUBTITLES</Text>
          <View style={styles.pickerOptions}>
            {SUBTITLE_OPTIONS.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={subtitles === opt}
                onPress={() => setSubtitles(opt)}
              />
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaRow}>
          <PrimaryButton icon="none">Submit Request</PrimaryButton>
          <Pressable style={styles.cancelButton}>
            {({ focused }) => (
              <View style={[styles.cancelInner, focused && styles.cancelFocused]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function OptionButton({ label, selected, onPress }: OptionButtonProps) {
  return (
    <Pressable onPress={onPress}>
      {({ focused }) => (
        <View
          style={[
            styles.optionButton,
            selected && styles.optionSelected,
            focused && styles.optionFocused,
          ]}
        >
          <Text
            style={[
              styles.optionText,
              selected && styles.optionTextSelected,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 720,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing['2xl'],
    paddingBottom: 60,
    paddingHorizontal: spacing['5xl'],
  },
  handleRow: {
    alignItems: 'center',
    marginBottom: 28,
  },
  handle: {
    width: 64,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMute,
  },
  contentRow: {
    flexDirection: 'row',
    gap: spacing['2xl'],
    marginBottom: spacing['2xl'],
  },
  poster: {
    width: components.poster.width,
    height: 330,
    borderRadius: radius.poster,
    backgroundColor: colors.surfaceElevated,
  },
  metadata: {
    flex: 1,
  },
  captionLabel: {
    ...typography.caption,
    color: colors.textMute,
    marginBottom: spacing.md,
  },
  titleText: {
    ...typography.heroSub,
    color: colors.text,
    marginBottom: spacing.md,
  },
  metaRow: {
    marginBottom: spacing.md,
  },
  synopsis: {
    ...typography.body,
    color: colors.textDim,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pickerLabel: {
    ...typography.caption,
    color: colors.textMute,
    width: 140,
  },
  pickerOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    height: components.button.height,
    paddingHorizontal: components.button.paddingH,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: colors.accent,
  },
  optionFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  optionText: {
    fontSize: components.button.fontSize,
    fontWeight: components.button.fontWeight,
    color: colors.textDim,
  },
  optionTextSelected: {
    color: colors.accentOnDark,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing['2xl'],
  },
  cancelButton: {
    borderRadius: radius.button,
  },
  cancelInner: {
    height: components.button.height,
    paddingHorizontal: components.button.paddingH,
    borderRadius: radius.button,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  cancelText: {
    fontSize: components.button.fontSize,
    fontWeight: components.button.fontWeight,
    color: colors.textDim,
  },
});
