import { findNodeHandle, UIManager } from 'react-native';

/**
 * Deterministic TV focus engine.
 *
 * The UI is divided into focus blocks ("rows"): the top bar, the hero button
 * row, every poster rail, the discover tab strip, etc. Every focusable
 * element inside a block registers itself with a (block, column) coordinate.
 *
 * LEFT/RIGHT stay inside a block and clamp at its edges. UP/DOWN move between
 * blocks, landing on the column closest to the one the user came from, and
 * scroll the block into view. Because Android's spatial FocusFinder cannot be
 * trusted with virtualised lists, every directional key event is followed by
 * a correction pass that re-focuses the element the engine decided on.
 */

interface TrackedRef {
  current: any;
}

interface Entry {
  ref: TrackedRef;
  col: number;
}

interface Block {
  entries: Map<number, Entry>;
  order: number;
}

const blocks = new Map<string, Block>();
let blockSeq = 0;
let screen = 'home';
let current: { block: string; col: number; ref: TrackedRef; key: string } | null = null;
let topBarRef: TrackedRef | null = null;
let lastZone: 'top' | 'content' = 'content';
const scrollHandlers = new Map<string, (block: string) => void>();
const blockY = new Map<string, number>();

export function setCurrentScreen(s: string) {
  screen = s;
}

export function setTopBarRef(ref: TrackedRef | null) {
  topBarRef = ref;
}

export function onScrollRequest(screen: string, cb: (block: string) => void) {
  scrollHandlers.set(screen, cb);
}

function fireScroll(block: string) {
  // defer so the page scroll wins over the native minimal scroll-to-focus
  setTimeout(() => {
    scrollHandlers.get(screen)?.(block);
  }, 60);
}

export function setBlockY(block: string, y: number) {
  blockY.set(block, y);
}

export function getBlockY(block: string): number | null {
  return blockY.get(block) ?? null;
}

function blockFor(id: string): Block {
  let b = blocks.get(id);
  if (!b) {
    b = { entries: new Map(), order: blockSeq++ };
    blocks.set(id, b);
  }
  return b;
}

export function registerEntry(block: string, col: number, ref: TrackedRef): string {
  const key = `${screen}::${block}:${col}:${blockSeq++}`;
  blockFor(block).entries.set(col, { ref, col });
  return key;
}

export function unregisterEntry(block: string, col: number) {
  const b = blocks.get(block);
  if (b) b.entries.delete(col);
}

export function noteFocus(block: string, col: number, ref: TrackedRef) {
  current = { block, col, ref, key: `${screen}::${block}:${col}` };
  lastZone = block === TOP_BLOCK ? 'top' : 'content';
  if (block !== TOP_BLOCK) lastContent = { block, col, ref };
}

export const TOP_BLOCK = '__top__';

export function noteTopFocus(ref: TrackedRef) {
  lastZone = 'top';
  topBarRef = ref;
  current = { block: TOP_BLOCK, col: 0, ref, key: 'top' };
}

function orderedContentBlocks(): string[] {
  return [...blocks.entries()]
    .filter(([id, b]) => b.entries.size > 0 && id !== TOP_BLOCK)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id]) => id);
}

function maxColOf(blockId: string): number {
  const b = blocks.get(blockId);
  if (!b || b.entries.size === 0) return 0;
  return Math.max(...[...b.entries.keys()]);
}

function entryAt(blockId: string, col: number): Entry | null {
  const b = blocks.get(blockId);
  if (!b) return null;
  const clamped = Math.min(Math.max(col, 0), maxColOf(blockId));
  const e = b.entries.get(clamped);
  return e ? { ref: e.ref, col: clamped } : null;
}

function dispatchFocus(handle: number): boolean {
  try {
    UIManager.dispatchViewManagerCommand(handle, 'requestTVFocus', []);
    return true;
  } catch {
    return false;
  }
}

export function focusRef(ref: TrackedRef | null | undefined): boolean {
  if (!ref || !ref.current) return false;
  const handle = findNodeHandle(ref.current);
  if (handle == null) return false;
  return dispatchFocus(handle);
}

export function focusTopBar(): boolean {
  return focusRef(topBarRef);
}

let lastContent: { block: string; col: number; ref: TrackedRef } | null = null;

/** Re-focuses the content element that had focus before the top bar. */
export function focusLastContent(): boolean {
  if (!lastContent || !lastContent.ref.current) {
    const first = orderedContentBlocks()[0];
    if (!first) return false;
    const e = entryAt(first, 0);
    if (!e) return false;
    const h = findNodeHandle(e.ref.current);
    if (h == null) return false;
    const okFirst = dispatchFocus(h);
    if (okFirst) fireScroll(first);
    return okFirst;
  }
  const handle = findNodeHandle(lastContent.ref.current);
  if (handle == null) {
    lastContent = null;
    return focusLastContent();
  }
  const ok = dispatchFocus(handle);
  if (ok) {
    current = { block: lastContent.block, col: lastContent.col, ref: lastContent.ref, key: `${screen}::${lastContent.block}:${lastContent.col}` };
    lastZone = 'content';
    fireScroll(lastContent.block);
  }
  return ok;
}

function firstEntryOf(blockId: string): Entry | null {
  const b = blocks.get(blockId);
  if (!b || b.entries.size === 0) return null;
  let best: Entry | null = null;
  for (const col of [...b.entries.keys()].sort((x, y) => x - y)) {
    const e = b.entries.get(col);
    if (e && e.ref.current) {
      best = e;
      break;
    }
  }
  return best;
}

/**
 * Focuses an entry, tolerating virtualisation: if the block has no mounted
 * entries yet (the scroll that would reveal it hasn't run), scrolls there and
 * retries for a few frames until the list mounts its items.
 */
function focusBlock(blockId: string, col: number, attempt = 0): boolean {
  const exact = entryAt(blockId, col);
  const e = exact ?? firstEntryOf(blockId);
  const liveHandle = e && e.ref.current ? findNodeHandle(e.ref.current) : null;
  if (!e || liveHandle == null) {
    if (attempt < 25) {
      fireScroll(blockId);
      setTimeout(() => focusBlock(blockId, col, attempt + 1), 140);
    }
    return false;
  }
  const handle = findNodeHandle(e.ref.current);
  if (handle == null) return false;
  const ok = dispatchFocus(handle);
  if (ok) {
    current = { block: blockId, col: e.col, ref: e.ref, key: `${screen}::${blockId}:${e.col}` };
    lastZone = 'content';
    lastContent = { block: blockId, col: e.col, ref: e.ref };
    fireScroll(blockId);
  }
  return ok;
}

function focusEntryAt(blockId: string, col: number): boolean {
  const e = entryAt(blockId, col);
  if (!e) return false;
  const handle = findNodeHandle(e.ref.current);
  if (handle == null) return false;
  const ok = dispatchFocus(handle);
  if (ok) {
    current = { block: blockId, col: e.col, ref: e.ref, key: `${screen}::${blockId}:${e.col}` };
    lastZone = 'content';
    fireScroll(blockId);
  }
  return ok;
}

/**
 * Correction pass for a directional key. `dir` is the pressed direction,
 * `from`/`fromCol` describe where focus was BEFORE the native move, and
 * `movedTo` is the element (if any) the native move landed on.
 */
export function correctDirection(dir: 'up' | 'down' | 'left' | 'right', from: string, fromCol: number, movedToBlock: string | null) {
  if (from === TOP_BLOCK) return;

  const rows = orderedContentBlocks();
  const fromIdx = rows.indexOf(from);
  if (fromIdx < 0) return;

  if (dir === 'left' || dir === 'right') {
    const atEdge = (dir === 'left' && fromCol === 0) || (dir === 'right' && fromCol >= maxColOf(from));
    if (atEdge || (movedToBlock !== null && movedToBlock !== from)) {
      focusEntryAt(from, fromCol);
    }
    return;
  }

  const step = dir === 'down' ? 1 : -1;
  let targetIdx = fromIdx + step;

  if (dir === 'up' && targetIdx < 0) {
    focusTopBar();
    return;
  }

  while (targetIdx >= 0 && targetIdx < rows.length) {
    const candidate = rows[targetIdx];
    if (maxColOf(candidate) >= 0 && (blocks.get(candidate)?.entries.size ?? 0) > 0) break;
    targetIdx += step;
  }
  if (targetIdx < 0) {
    focusTopBar();
    return;
  }
  if (targetIdx >= rows.length) return;

  const targetBlock = rows[targetIdx];
  if (movedToBlock !== targetBlock) {
    focusBlock(targetBlock, fromCol);
  } else {
    fireScroll(targetBlock);
  }
}

let snapshotAtLastEvent: { block: string; col: number } | null = null;

/**
 * Call from the global hardware-key listener for every directional key.
 * Runs after the native focus move and corrects it when Android's spatial
 * search picked the wrong element.
 */
export function handleDirection(dir: 'up' | 'down' | 'left' | 'right') {
  const prev = snapshotAtLastEvent;
  const movedToBlock = current ? current.block : null;
  const from = prev ?? current;
  if (from) {
    correctDirection(dir, from.block, from.col, movedToBlock);
  }
  snapshotAtLastEvent = current;
}

export function lastZoneWasTop(): boolean {
  return lastZone === 'top';
}

export function debugState(): string {
  return `screen=${screen} current=${current ? current.block + ':' + current.col : 'none'} blocks=[${orderedContentBlocks().join(',')}]`;
}
