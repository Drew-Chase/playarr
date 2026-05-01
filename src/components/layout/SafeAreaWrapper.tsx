import React from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';
import { safeArea, colors } from '@/theme/tokens';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
  };
}

export function SafeAreaWrapper({
  children,
  style,
  edges = { top: true, bottom: true, left: true, right: true },
}: SafeAreaWrapperProps) {
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: edges.top ? safeArea.inset : 0,
          paddingBottom: edges.bottom ? safeArea.inset : 0,
          paddingLeft: edges.left ? safeArea.inset : 0,
          paddingRight: edges.right ? safeArea.inset : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
