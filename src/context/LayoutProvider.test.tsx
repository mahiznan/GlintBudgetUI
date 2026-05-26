import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUpdatePreference', () => ({ useUpdatePreference: vi.fn() }));

import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { LayoutProvider } from './LayoutProvider';
import { useLayout } from './LayoutContext';

const mockMutate = vi.fn().mockResolvedValue(undefined);

function setupMocks(layoutWidth?: 'fixed' | 'full') {
  vi.mocked(usePreferenceContext).mockReturnValue({
    preference: { layoutWidth } as never,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useAuth).mockReturnValue({ status: 'authenticated', user: { uid: 'u1' } } as never);
  vi.mocked(useUpdatePreference).mockReturnValue({
    mutate: mockMutate,
    loading: false,
    error: null,
  });
}

function LayoutWidthDisplay() {
  const { layoutWidth } = useLayout();
  return <span data-testid="width">{layoutWidth}</span>;
}

describe('LayoutProvider', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('defaults to fixed when preference has no layoutWidth', () => {
    setupMocks(undefined);
    const { getByTestId } = render(
      <LayoutProvider>
        <LayoutWidthDisplay />
      </LayoutProvider>,
    );
    expect(getByTestId('width').textContent).toBe('fixed');
  });

  it('seeds layoutWidth from preference', () => {
    setupMocks('full');
    const { getByTestId } = render(
      <LayoutProvider>
        <LayoutWidthDisplay />
      </LayoutProvider>,
    );
    expect(getByTestId('width').textContent).toBe('full');
  });

  it('setLayoutWidth updates state optimistically and calls mutate', async () => {
    setupMocks(undefined);
    let capturedSet!: (w: 'fixed' | 'full') => Promise<void>;

    function Capture() {
      const { setLayoutWidth } = useLayout();
      // eslint-disable-next-line react-hooks/globals
      capturedSet = setLayoutWidth;
      return null;
    }

    const { getByTestId } = render(
      <LayoutProvider>
        <LayoutWidthDisplay />
        <Capture />
      </LayoutProvider>,
    );

    await act(async () => {
      await capturedSet('full');
    });

    expect(getByTestId('width').textContent).toBe('full');
    expect(mockMutate).toHaveBeenCalledWith({ layoutWidth: 'full' });
  });
});
