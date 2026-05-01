import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, components, radius, focus as focusTokens } from '@/theme/tokens';
import { TopNav } from '@/components/layout/TopNav';
import { IconButton } from '@/components/ui/IconButton';
import { ChevronIcon } from '@/components/icons';
import { calendarDays } from '@/fixtures/home';

type ItemKind = 'episode' | 'release' | 'request';

function kindColor(kind: ItemKind): string {
  switch (kind) {
    case 'episode':
      return colors.textDim;
    case 'release':
      return colors.accent;
    case 'request':
      return colors.warning;
  }
}

function kindLabel(kind: ItemKind): string {
  switch (kind) {
    case 'episode':
      return 'EPISODE';
    case 'release':
      return 'RELEASE';
    case 'request':
      return 'REQUEST';
  }
}

export function CalendarScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Title area */}
          <View style={styles.titleArea}>
            <Text style={styles.title}>Calendar</Text>
            <Text style={styles.weekCount}>Week of May 4 - May 10, 2025</Text>
          </View>

          {/* Week navigation */}
          <View style={styles.weekNav}>
            <IconButton size={44}>
              <ChevronIcon size={14} color={colors.text} direction="left" />
            </IconButton>
            <Text style={styles.weekLabel}>This Week</Text>
            <IconButton size={44}>
              <ChevronIcon size={14} color={colors.text} direction="right" />
            </IconButton>
          </View>

          {/* Day grid */}
          <View style={styles.dayGrid}>
            {calendarDays.map((day, index) => {
              const isToday = day.day === 'MON';
              return (
                <View key={day.day} style={styles.dayColumn}>
                  {/* Day header */}
                  <View
                    style={[
                      styles.dayHeader,
                      isToday ? styles.dayHeaderToday : styles.dayHeaderDefault,
                    ]}
                  >
                    <Text style={styles.dayAbbr}>{day.day}</Text>
                    <Text style={styles.dayDate}>{day.date}</Text>
                  </View>

                  {/* Items */}
                  {day.items.length === 0 ? (
                    <Text style={styles.emptyPlaceholder}>--</Text>
                  ) : (
                    day.items.map((item, itemIndex) => (
                      <View key={itemIndex} style={styles.itemCard}>
                        {/* Thumbnail placeholder */}
                        <View style={styles.itemThumb} />
                        {/* Title */}
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {/* Badge + time */}
                        <View style={styles.itemFooter}>
                          <View
                            style={[
                              styles.kindBadge,
                              { backgroundColor: kindColor(item.kind) },
                            ]}
                          >
                            <Text style={styles.kindBadgeText}>
                              {kindLabel(item.kind)}
                            </Text>
                          </View>
                          <Text style={styles.itemTime}>{item.time}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <TopNav active="Calendar" />
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
  content: {
    paddingTop: 130,
    paddingHorizontal: spacing['5xl'],
    paddingBottom: spacing['5xl'],
  },
  titleArea: {
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.heroSub,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  weekCount: {
    ...typography.meta,
    color: colors.textDim,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  weekLabel: {
    ...typography.card,
    color: colors.text,
  },
  dayGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  dayColumn: {
    flex: 1,
  },
  dayHeader: {
    paddingBottom: spacing.md,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  dayHeaderDefault: {
    borderBottomColor: colors.border,
  },
  dayHeaderToday: {
    borderBottomColor: colors.accent,
  },
  dayAbbr: {
    ...typography.caption,
    color: colors.textMute,
    marginBottom: spacing.xs,
  },
  dayDate: {
    ...typography.card,
    color: colors.text,
  },
  emptyPlaceholder: {
    ...typography.card,
    color: colors.textMute,
    textAlign: 'center',
    paddingTop: spacing.lg,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.backdrop,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.poster,
    marginBottom: spacing.sm,
  },
  itemTitle: {
    ...typography.meta,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kindBadge: {
    paddingVertical: components.badge.paddingV,
    paddingHorizontal: components.badge.paddingH,
    borderRadius: components.badge.radius,
  },
  kindBadgeText: {
    fontSize: components.badge.fontSize,
    fontWeight: components.badge.fontWeight,
    color: colors.bg,
  },
  itemTime: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMute,
  },
});
