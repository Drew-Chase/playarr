import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, components, typography } from '@/theme/tokens';
import { SearchIcon, DownloadIcon, PlayIcon } from '@/components/icons';

interface TopNavProps {
  active?: string;
}

const NAV_ITEMS = ['Home', 'Movies', 'TV Shows', 'Calendar'];

export function TopNav({ active = 'Home' }: TopNavProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <BrandMark />
      </View>

      <View style={styles.center}>
        {NAV_ITEMS.map((item) => {
          const isActive = item === active;
          return (
            <Pressable key={item} style={styles.navItem}>
              {({ focused }) => (
                <View style={[styles.navItemInner, focused && styles.navItemFocused]}>
                  <Text style={[styles.navText, isActive && styles.navTextActive]}>
                    {item}
                  </Text>
                  {isActive && !focused && <View style={styles.activeIndicator} />}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.right}>
        <SearchIcon size={22} color={colors.textDim} />
        <DownloadIcon size={22} color={colors.textDim} />
        <View style={styles.avatar} />
      </View>
    </View>
  );
}

function BrandMark() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandCircle}>
        <PlayIcon size={Math.round(components.brandMark.size * components.brandMark.iconScale)} color={colors.accentOnDark} />
      </View>
      <Text style={styles.brandText}>Playarr</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: components.topNav.height,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['5xl'],
    zIndex: 10,
  },
  left: {
    flex: 1,
  },
  center: {
    flexDirection: 'row',
    gap: spacing['2xl'],
    justifyContent: 'center',
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xl,
  },
  navItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  navItemInner: {
    position: 'relative',
  },
  navItemFocused: {
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    margin: -6,
  },
  navText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textDim,
  },
  navTextActive: {
    color: colors.text,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
