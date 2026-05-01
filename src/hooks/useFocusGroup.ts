import { useRef, useMemo } from 'react';
import { findNodeHandle, type View } from 'react-native';

/**
 * Manages a group of focusable refs, returning nextFocus* props
 * for inter-group D-pad routing on Android TV.
 */
export function useFocusGroup(groupSize: number) {
  const refs = useRef<(View | null)[]>(Array(groupSize).fill(null));

  const setRef = useMemo(
    () => (index: number) => (el: View | null) => {
      refs.current[index] = el;
    },
    [],
  );

  const getNextFocusProps = useMemo(
    () => (index: number) => {
      const left = index > 0 ? refs.current[index - 1] : undefined;
      const right = index < groupSize - 1 ? refs.current[index + 1] : undefined;
      return {
        nextFocusLeft: left ? findNodeHandle(left) ?? undefined : undefined,
        nextFocusRight: right ? findNodeHandle(right) ?? undefined : undefined,
      };
    },
    [groupSize],
  );

  return { refs, setRef, getNextFocusProps };
}
