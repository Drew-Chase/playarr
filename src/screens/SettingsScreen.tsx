import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, components, radius, focus as focusTokens } from '@/theme/tokens';
import { TopNav } from '@/components/layout/TopNav';

type Category = 'Account' | 'Servers' | 'Playback' | 'Subtitles' | 'Network' | 'About';

const CATEGORIES: Category[] = ['Account', 'Servers', 'Playback', 'Subtitles', 'Network', 'About'];

type QualityOption = 'Auto' | '1080p' | '4K HDR';
type AudioOutputOption = 'Stereo' | '5.1' | 'Atmos';

interface SettingsState {
  autoPlayNext: boolean;
  skipIntro: boolean;
  maxQuality: QualityOption;
  audioOutput: AudioOutputOption;
  reduceMotion: boolean;
  directPlay: boolean;
}

export function SettingsScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>('Playback');
  const [settings, setSettings] = useState<SettingsState>({
    autoPlayNext: true,
    skipIntro: true,
    maxQuality: '4K HDR',
    audioOutput: 'Atmos',
    reduceMotion: false,
    directPlay: true,
  });

  return (
    <View style={styles.container}>
      <View style={styles.layout}>
        {/* Left rail */}
        <View style={styles.leftRail}>
          <Text style={styles.settingsTitle}>Settings</Text>
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <Pressable key={cat} onPress={() => setActiveCategory(cat)}>
                {({ focused }) => (
                  <View
                    style={[
                      styles.categoryItem,
                      isActive && styles.categoryActive,
                      focused && styles.categoryFocused,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Right pane */}
        <ScrollView style={styles.rightPane} showsVerticalScrollIndicator={false}>
          <View style={styles.rightContent}>
            <Text style={styles.sectionTitle}>Playback</Text>

            {/* Auto-play next episode */}
            <SettingRow
              label="Auto-play next episode"
              hint="Automatically play the next episode when the current one ends"
            >
              <Toggle
                value={settings.autoPlayNext}
                onToggle={() =>
                  setSettings((s) => ({ ...s, autoPlayNext: !s.autoPlayNext }))
                }
              />
            </SettingRow>

            {/* Skip intro */}
            <SettingRow
              label="Skip intro"
              hint="Automatically skip opening credits when detected"
            >
              <Toggle
                value={settings.skipIntro}
                onToggle={() =>
                  setSettings((s) => ({ ...s, skipIntro: !s.skipIntro }))
                }
              />
            </SettingRow>

            {/* Max quality */}
            <SettingRow
              label="Max quality"
              hint="Maximum streaming quality for this device"
            >
              <Picker
                options={['Auto', '1080p', '4K HDR'] as QualityOption[]}
                selected={settings.maxQuality}
                onSelect={(val) =>
                  setSettings((s) => ({ ...s, maxQuality: val }))
                }
              />
            </SettingRow>

            {/* Audio output */}
            <SettingRow
              label="Audio output"
              hint="Audio passthrough format for external receivers"
            >
              <Picker
                options={['Stereo', '5.1', 'Atmos'] as AudioOutputOption[]}
                selected={settings.audioOutput}
                onSelect={(val) =>
                  setSettings((s) => ({ ...s, audioOutput: val }))
                }
              />
            </SettingRow>

            {/* Reduce motion */}
            <SettingRow
              label="Reduce motion"
              hint="Minimize animations and transitions throughout the app"
            >
              <Toggle
                value={settings.reduceMotion}
                onToggle={() =>
                  setSettings((s) => ({ ...s, reduceMotion: !s.reduceMotion }))
                }
              />
            </SettingRow>

            {/* Direct play */}
            <SettingRow
              label="Direct play"
              hint="Play media without transcoding when format is supported"
            >
              <Toggle
                value={settings.directPlay}
                onToggle={() =>
                  setSettings((s) => ({ ...s, directPlay: !s.directPlay }))
                }
              />
            </SettingRow>
          </View>
        </ScrollView>
      </View>

      <TopNav active="" />
    </View>
  );
}

/* ---- Sub-components ---- */

interface SettingRowProps {
  label: string;
  hint: string;
  children: React.ReactNode;
}

function SettingRow({ label, hint, children }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingHint}>{hint}</Text>
      </View>
      <View style={styles.settingRight}>{children}</View>
    </View>
  );
}

interface ToggleProps {
  value: boolean;
  onToggle: () => void;
}

function Toggle({ value, onToggle }: ToggleProps) {
  return (
    <Pressable onPress={onToggle}>
      {({ focused }) => (
        <View
          style={[
            styles.toggleTrack,
            value ? styles.toggleTrackOn : styles.toggleTrackOff,
            focused && styles.toggleFocused,
          ]}
        >
          <View
            style={[
              styles.toggleKnob,
              value ? styles.toggleKnobOn : styles.toggleKnobOff,
              { transform: [{ translateX: value ? 28 : 0 }] },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

interface PickerProps<T extends string> {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
}

function Picker<T extends string>({ options, selected, onSelect }: PickerProps<T>) {
  return (
    <View style={styles.pickerRow}>
      {options.map((opt) => {
        const isSelected = opt === selected;
        return (
          <Pressable key={opt} onPress={() => onSelect(opt)}>
            {({ focused }) => (
              <View
                style={[
                  styles.pickerOption,
                  isSelected && styles.pickerOptionSelected,
                  focused && styles.pickerOptionFocused,
                ]}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    isSelected && styles.pickerOptionTextSelected,
                  ]}
                >
                  {opt}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---- Styles ---- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: components.topNav.height,
  },
  leftRail: {
    width: 320,
    paddingTop: spacing['2xl'],
    paddingLeft: spacing['5xl'],
    paddingRight: spacing['2xl'],
  },
  settingsTitle: {
    ...typography.heroSub,
    color: colors.text,
    marginBottom: spacing['2xl'],
  },
  categoryItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    marginBottom: spacing.xs,
  },
  categoryActive: {
    backgroundColor: colors.surfaceElevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  categoryFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  categoryText: {
    ...typography.card,
    color: colors.textDim,
  },
  categoryTextActive: {
    color: colors.text,
  },
  rightPane: {
    flex: 1,
    paddingTop: 90,
  },
  rightContent: {
    paddingLeft: spacing['3xl'],
    paddingRight: spacing['5xl'],
    paddingBottom: spacing['5xl'],
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    marginBottom: spacing['2xl'],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    ...typography.card,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingHint: {
    ...typography.meta,
    fontSize: 15,
    color: colors.textDim,
  },
  settingRight: {
    marginLeft: spacing['2xl'],
  },
  toggleTrack: {
    width: components.toggle.width,
    height: components.toggle.height,
    borderRadius: radius.toggle,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleTrackOn: {
    backgroundColor: colors.accent,
  },
  toggleTrackOff: {
    backgroundColor: colors.surfaceElevated,
  },
  toggleFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  toggleKnob: {
    width: components.toggle.knobSize,
    height: components.toggle.knobSize,
    borderRadius: components.toggle.knobSize / 2,
  },
  toggleKnobOn: {
    backgroundColor: colors.accentOnDark,
  },
  toggleKnobOff: {
    backgroundColor: colors.textDim,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  pickerOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pickerOptionSelected: {
    borderBottomColor: colors.accent,
  },
  pickerOptionFocused: {
    borderWidth: focusTokens.outlineWidth,
    borderColor: colors.accent,
    borderRadius: radius.button,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusTokens.glowOpacity,
    shadowRadius: focusTokens.glowSpread,
    elevation: 8,
  },
  pickerOptionText: {
    ...typography.meta,
    color: colors.textDim,
  },
  pickerOptionTextSelected: {
    color: colors.text,
  },
});
