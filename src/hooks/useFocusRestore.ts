import { useCallback, useRef } from 'react';
import { findNodeHandle, type View } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Workaround for react-native-tvos#815: TVFocusGuideView autoFocus
 * is broken under New Architecture. This hook manually re-focuses
 * the last-focused element when a screen regains focus.
 */
export function useFocusRestore() {
  const lastFocusedRef = useRef<View | null>(null);

  const trackFocus = useCallback((ref: View | null) => {
    lastFocusedRef.current = ref;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const node = lastFocusedRef.current;
      if (node) {
        const handle = findNodeHandle(node);
        if (handle) {
          try {
            node.setNativeProps({ hasTVPreferredFocus: true });
          } catch {
            // Silently fail if setNativeProps not available
          }
        }
      }
    }, []),
  );

  return { trackFocus, lastFocusedRef };
}
