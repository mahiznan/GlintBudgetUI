export type ColorMode = 'system' | 'light' | 'dark';
export type ResolvedMode = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'glint:color-mode';
export const DEFAULT_COLOR_MODE: ColorMode = 'light';

const VALID_MODES: readonly ColorMode[] = ['system', 'light', 'dark'];

/** True when the OS currently prefers a dark color scheme. Safe in non-browser/jsdom. */
export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/** Collapse a stored mode into the concrete light/dark value to apply. */
export function resolveMode(mode: ColorMode): ResolvedMode {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

/** Apply the resolved mode to <html> via the data-mode attribute. */
export function applyMode(resolved: ResolvedMode): void {
  document.documentElement.dataset.mode = resolved;
}

/** Read the stored mode, falling back to the default on missing/invalid/unavailable storage. */
export function readStoredMode(): ColorMode {
  try {
    const raw = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (raw && (VALID_MODES as readonly string[]).includes(raw)) {
      return raw as ColorMode;
    }
  } catch {
    /* storage unavailable (private mode / disabled) — use default */
  }
  return DEFAULT_COLOR_MODE;
}

/** Persist the stored mode; silently no-op if storage is unavailable. */
export function writeStoredMode(mode: ColorMode): void {
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable — ignore */
  }
}
