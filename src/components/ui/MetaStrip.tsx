import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, components } from '@/theme/tokens';

interface MetaStripProps {
  items: string[];
  color?: string;
}

export function MetaStrip({ items, color = colors.textDim }: MetaStripProps) {
  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.dot} />}
          <Text style={[styles.text, { color }]}>{item}</Text>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: typography.meta.fontSize,
    fontWeight: typography.meta.fontWeight,
    letterSpacing: typography.meta.letterSpacing,
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: components.dividerDot.size,
    height: components.dividerDot.size,
    borderRadius: components.dividerDot.size / 2,
    backgroundColor: colors.textMute,
    marginHorizontal: components.dividerDot.marginH,
  },
});
