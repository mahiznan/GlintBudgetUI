import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
}));
vi.mock('../firebase/client', () => ({
  auth: {},
  app: {},
}));

import { AuthContext } from '../auth/AuthContext';
import { PreferenceProvider } from './PreferenceProvider';
import { usePreferenceContext } from './usePreferenceContext';

function Consumer() {
  const { loading } = usePreferenceContext();
  return <div>{loading ? 'loading' : 'done'}</div>;
}

describe('PreferenceContext', () => {
  it('provides preference state to consumers', async () => {
    render(
      <AuthContext.Provider
        value={{
          status: 'authenticated',
          user: { uid: 'u1', name: null, email: null, photoUrl: null },
        }}
      >
        <PreferenceProvider>
          <Consumer />
        </PreferenceProvider>
      </AuthContext.Provider>,
    );
    // initially renders (loading or done)
    expect(screen.getByText(/loading|done/)).toBeInTheDocument();
  });

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'usePreferenceContext must be used within PreferenceProvider',
    );
    spy.mockRestore();
  });
});
