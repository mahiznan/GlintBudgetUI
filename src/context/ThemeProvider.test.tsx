import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUpdatePreference', () => ({ useUpdatePreference: vi.fn() }));

import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './ThemeContext';

const mockMutate = vi.fn().mockResolvedValue(undefined);

function setupMocks(theme?: string) {
  vi.mocked(usePreferenceContext).mockReturnValue({
    preference: { theme } as never,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useAuth).mockReturnValue({ status: 'authenticated', user: { uid: 'u1' } } as never);
  vi.mocked(useUpdatePreference).mockReturnValue({
    mutate: mockMutate,
  });
}

function ThemeIdDisplay() {
  const { themeId } = useTheme();
  return <span data-testid="id">{themeId}</span>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    delete document.documentElement.dataset.theme;
  });

  it('defaults to lime when preference has no theme', () => {
    setupMocks(undefined);
    render(
      <ThemeProvider>
        <ThemeIdDisplay />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('lime');
  });

  it('applies theme from preference', () => {
    setupMocks('ocean');
    render(
      <ThemeProvider>
        <ThemeIdDisplay />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('ocean');
  });

  it('exposes themeId via useTheme', () => {
    setupMocks('forest');
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeIdDisplay />
      </ThemeProvider>,
    );
    expect(getByTestId('id').textContent).toBe('forest');
  });

  it('setTheme updates data-theme immediately and calls mutate', async () => {
    setupMocks(undefined);
    let capturedSetTheme!: (id: string) => Promise<void>;

    function Capture() {
      const { setTheme } = useTheme();
      // eslint-disable-next-line react-hooks/globals
      capturedSetTheme = setTheme;
      return null;
    }

    render(
      <ThemeProvider>
        <Capture />
      </ThemeProvider>,
    );

    await act(async () => {
      await capturedSetTheme('amber');
    });

    expect(document.documentElement.dataset.theme).toBe('amber');
    expect(mockMutate).toHaveBeenCalledWith({ theme: 'amber' });
  });
});
