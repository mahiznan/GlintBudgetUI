import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithPopup = vi.fn();
const signOut = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: vi.fn(() => [{ name: 'mock-app' }]),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ kind: 'mock-auth' })),
  GoogleAuthProvider: vi.fn(function () {
    return { providerId: 'google.com' };
  }),
  signInWithPopup,
  signOut,
}));

describe('firebase/auth wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signInWithGoogle calls signInWithPopup with a GoogleAuthProvider', async () => {
    signInWithPopup.mockResolvedValue({ user: { uid: 'u1' } });
    const { signInWithGoogle } = await import('./auth');
    await signInWithGoogle();
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    const [, provider] = signInWithPopup.mock.calls[0]!;
    expect(provider.providerId).toBe('google.com');
  });

  it('signOutCurrentUser calls firebase signOut', async () => {
    signOut.mockResolvedValue(undefined);
    const { signOutCurrentUser } = await import('./auth');
    await signOutCurrentUser();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
