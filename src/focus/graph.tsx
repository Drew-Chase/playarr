import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { findNodeHandle } from 'react-native';

export interface FocusGraphApi {
  register: (key: string, ref: any) => void;
  handle: (key: string) => number | null;
}

const Ctx = createContext<FocusGraphApi>({ register: () => {}, handle: () => null });

/**
 * Render-time registry of focusable nodes keyed by stable strings.
 * Focusable elements register their ref under keys like "cw:3"; containers
 * then wire native nextFocus* props between keys, giving deterministic
 * TV navigation without any JS in the key-event hot path.
 */
export function FocusGraphProvider({ children }: { children: ReactNode }) {
  const refs = useRef(new Map<string, any>());
  const [, bump] = useState(0);

  const register = useCallback((key: string, ref: any) => {
    const map = refs.current;
    if (map.get(key) === ref) return;
    map.set(key, ref);
    // one deferred re-render so nextFocus* props resolve after mount
    setTimeout(() => bump((n) => n + 1), 0);
  }, []);

  const handle = useCallback((key: string): number | null => {
    const ref = refs.current.get(key);
    if (!ref || !ref.current) return null;
    return findNodeHandle(ref.current);
  }, []);

  return <Ctx.Provider value={{ register, handle }}>{children}</Ctx.Provider>;
}

export function useFocusGraph(): FocusGraphApi {
  return useContext(Ctx);
}
