import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, typography } from '@/theme/tokens';
import { ChevronIcon } from '@/components/icons';

interface RailProps<T> {
  heading: string;
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  estimatedItemSize: number;
  showSeeAll?: boolean;
  itemGap?: number;
  onCardFocus?: (railRef: React.RefObject<View | null>) => void;
}

export function Rail<T>({
  heading,
  data,
  renderItem,
  estimatedItemSize,
  showSeeAll = true,
  itemGap = spacing.xl,
  onCardFocus,
}: RailProps<T>) {
  const railRef = useRef<View>(null);

  const handleRender = ({ item, index }: { item: T; index: number }) => {
    const card = renderItem(item, index);
    if (!onCardFocus) return card;
    const originalOnFocus = (card.props as { onFocus?: () => void }).onFocus;
    return React.cloneElement(card, {
      onFocus: () => {
        onCardFocus(railRef);
        originalOnFocus?.();
      },
    } as Partial<{ onFocus: () => void }>);
  };

  return (
    <View ref={railRef} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>{heading}</Text>
        {showSeeAll && (
          <View style={styles.seeAll}>
            <Text style={styles.seeAllText}>See all</Text>
            <ChevronIcon size={14} color={colors.textDim} />
          </View>
        )}
      </View>

      <View style={styles.listContainer}>
        <FlashList
          data={data}
          horizontal
          showsHorizontalScrollIndicator={false}
          estimatedItemSize={estimatedItemSize}
          drawDistance={estimatedItemSize * 4}
          contentContainerStyle={{ paddingLeft: spacing['5xl'] }}
          ItemSeparatorComponent={() => <View style={{ width: itemGap }} />}
          renderItem={handleRender}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['5xl'],
    marginBottom: spacing.lg,
  },
  heading: {
    ...typography.section,
    color: colors.text,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    ...typography.meta,
    color: colors.textDim,
  },
  listContainer: {
    height: 'auto',
    minHeight: 100,
  },
});
