import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('./PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUpdatePreference', () => ({ useUpdatePreference: vi.fn() }));

import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { ColorModeProvider } from './ColorModeProvider';
import { useColorMode } from './ColorModeContext';
import { COLOR_MODE_STORAGE_KEY } from '../lib/colorMode';
import type { ColorMode } from '../lib/colorMode';

const mockMutate = vi.fn();

function setupMocks(colorMode?: ColorMode) {
  vi.mocked(usePreferenceContext).mockReturnValue({
    preference: { colorMode } as never,
    loading: false,
    error: null,
    applyPreferenceUpdate: vi.fn(),
  });
  vi.mocked(useAuth).mockReturnValue({ status: 'authenticated', user: { uid: 'u1' } } as never);
  vi.mocked(useUpdatePreference).mockReturnValue({ mutate: mockMutate });
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function Display() {
  const { mode, resolvedMode } = useColorMode();
  return <span data-testid="v">{`${mode}:${resolvedMode}`}</span>;
}

describe('ColorModeProvider', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    mockMutate.mockClear();
    store = {};
    // Node 26's built-in localStorage is undefined and shadows jsdom's — stub it.
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        store = {};
      },
    });
    delete document.documentElement.dataset.mode;
    stubMatchMedia(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to light when nothing is stored', () => {
    setupMocks(undefined);
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('light:light');
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('seeds from localStorage before Firestore loads', () => {
    store[COLOR_MODE_STORAGE_KEY] = 'dark';
    setupMocks(undefined);
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('dark:dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('reconciles from the Firestore preference', () => {
    setupMocks('dark');
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('dark:dark');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('resolves system against matchMedia', () => {
    stubMatchMedia(true);
    setupMocks('system');
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('system:dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('reacts to OS changes while on system', () => {
    let prefersDark = false;
    const listeners: Array<() => void> = [];
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return prefersDark;
      },
      media: query,
      addEventListener: (_event: string, cb: () => void) => {
        listeners.push(cb);
      },
      removeEventListener: (_event: string, cb: () => void) => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      },
    }));
    setupMocks('system');
    const { getByTestId } = render(
      <ColorModeProvider>
        <Display />
      </ColorModeProvider>,
    );
    expect(getByTestId('v').textContent).toBe('system:light');
    expect(document.documentElement.dataset.mode).toBe('light');

    // OS flips to dark: the registered change handler re-resolves and re-applies.
    act(() => {
      prefersDark = true;
      listeners.forEach((cb) => cb());
    });

    expect(getByTestId('v').textContent).toBe('system:dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('setMode updates state, localStorage, data-mode, and Firestore', () => {
    setupMocks(undefined);
    let setMode!: (m: ColorMode) => void;
    function Capture() {
      // eslint-disable-next-line react-hooks/globals
      setMode = useColorMode().setMode;
      return null;
    }
    render(
      <ColorModeProvider>
        <Capture />
      </ColorModeProvider>,
    );

    act(() => setMode('dark'));

    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
    expect(mockMutate).toHaveBeenCalledWith({ colorMode: 'dark' });
  });
});
