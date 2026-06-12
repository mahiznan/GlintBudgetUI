import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveMode,
  applyMode,
  readStoredMode,
  writeStoredMode,
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
} from './colorMode';

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('resolveMode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns light for light', () => {
    expect(resolveMode('light')).toBe('light');
  });

  it('returns dark for dark', () => {
    expect(resolveMode('dark')).toBe('dark');
  });

  it('returns dark for system when OS prefers dark', () => {
    stubMatchMedia(true);
    expect(resolveMode('system')).toBe('dark');
  });

  it('returns light for system when OS prefers light', () => {
    stubMatchMedia(false);
    expect(resolveMode('system')).toBe('light');
  });
});

describe('applyMode', () => {
  it('writes data-mode on the document element', () => {
    applyMode('dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
    applyMode('light');
    expect(document.documentElement.dataset.mode).toBe('light');
  });
});

describe('storage helpers', () => {
  // Node 26 exposes a built-in `localStorage` global (undefined without --localstorage-file)
  // that shadows jsdom's. Stub it with a real in-memory store so the helpers can be tested.
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('readStoredMode falls back to the default when unset', () => {
    expect(readStoredMode()).toBe(DEFAULT_COLOR_MODE);
  });

  it('round-trips a stored value', () => {
    writeStoredMode('dark');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
    expect(readStoredMode()).toBe('dark');
  });

  it('ignores an invalid stored value and returns the default', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'bogus');
    expect(readStoredMode()).toBe(DEFAULT_COLOR_MODE);
  });
});
