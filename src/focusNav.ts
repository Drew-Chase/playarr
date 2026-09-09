import { findNodeHandle, UIManager } from 'react-native';

interface TrackedRef {
  current: any;
}

let topBarRef: TrackedRef | null = null;
let currentScreen = 'home';
let lastZone: 'top' | 'content' = 'content';
const lastContentByScreen = new Map<string, TrackedRef>();
const lastContentHandleByScreen = new Map<string, number>();
const listeners = new Set<() => void>();

export function setCurrentScreen(screen: string) {
  currentScreen = screen;
}

export function lastFocusWasTop(): boolean {
  return lastZone === 'top';
}

export function setTopBarRef(ref: TrackedRef | null) {
  topBarRef = ref;
}

export function noteFocus(zone: 'top' | 'content', ref: TrackedRef) {
  lastZone = zone;

  if (zone === 'top') {
    topBarRef = ref;
  } else {
    lastContentByScreen.set(currentScreen, ref);
    const handle = ref.current ? findNodeHandle(ref.current) : null;
    if (handle != null) {
      lastContentHandleByScreen.set(currentScreen, handle);
      listeners.forEach((l) => l());
    }
  }
}

export function lastContentHandle(screen?: string): number | null {
  return lastContentHandleByScreen.get(screen ?? currentScreen) ?? null;
}

export function onLastContentChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function dispatchFocus(handle: number): boolean {
  try {
    UIManager.dispatchViewManagerCommand(handle, 'requestTVFocus', []);
    return true;
  } catch {
    try {
      UIManager.dispatchViewManagerCommand(handle, 'focus', []);
      return true;
    } catch {
      return false;
    }
  }
}

export function focusRef(ref: TrackedRef | null | undefined): boolean {
  if (!ref || !ref.current) {
    return false;
  }
  const handle = findNodeHandle(ref.current);
  if (handle == null) {
    return false;
  }
  return dispatchFocus(handle);
}

export function focusTopBar(): boolean {
  return focusRef(topBarRef);
}

export function focusLastContent(screen?: string): boolean {
  const ref = lastContentByScreen.get(screen ?? currentScreen);
  return focusRef(ref);
}
