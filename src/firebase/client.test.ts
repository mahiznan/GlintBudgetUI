import { beforeEach, describe, expect, it, vi } from 'vitest';

// firebase/app is hoisted and mocked so each test starts from a clean slate.
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ kind: 'mock-auth' })),
}));

describe('firebase/client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('initializes the app exactly once across multiple imports', async () => {
    const { initializeApp, getApps } = await import('firebase/app');
    // getApps returns [] first call, then [app] on subsequent calls
    (getApps as ReturnType<typeof vi.fn>).mockReturnValueOnce([]).mockReturnValue([{ name: 'cached' }]);

    const mod1 = await import('./client');
    const mod2 = await import('./client');

    expect(mod1.app).toBe(mod2.app);
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('throws a readable error if VITE_FIREBASE_API_KEY is missing', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    await expect(import('./client')).rejects.toThrow(/VITE_FIREBASE_API_KEY/);
    vi.unstubAllEnvs();
  });
});
