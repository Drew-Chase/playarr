import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, components, spacing } from '@/theme/tokens';

interface GenrePillsProps {
  genres: string[];
}

export function GenrePills({ genres }: GenrePillsProps) {
  return (
    <View style={styles.container}>
      {genres.map((genre) => (
        <View key={genre} style={styles.pill}>
          <Text style={styles.text}>{genre}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    height: components.pill.height,
    paddingHorizontal: components.pill.paddingH,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: components.pill.fontSize,
    fontWeight: components.pill.fontWeight,
    color: colors.textDim,
    letterSpacing: 0.005 * components.pill.fontSize,
  },
});
