import { beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// @testing-library/react's built-in asyncWrapper calls jest.advanceTimersByTime(0)
// to drain its internal microtask-flush setTimeout — but that check only works for
// Jest fake timers, not Vitest fake timers. Override asyncWrapper to do the same
// with vi.advanceTimersByTime so that userEvent.setup({ advanceTimers }) tests work.
configure({
  asyncWrapper: async (cb) => {
    const result = await cb();
    // Drain microtask queue (mirrors what @testing-library/react does internally for
    // Jest, but using vi so it also works with vi.useFakeTimers()).
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
      if (vi.isFakeTimers()) {
        vi.advanceTimersByTime(0);
      }
    });
    return result;
  },
});

// Stub Firebase env vars globally before any tests run. Individual tests may
// override these values via vi.stubEnv(). This ensures client.ts can be imported
// even if .env.local is empty (which it is in the repo by design).
beforeAll(() => {
  const stubEnvValues = {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
    VITE_FIREBASE_PROJECT_ID: 'test-project-id',
    VITE_FIREBASE_APP_ID: 'test-app-id',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-sender-id',
    VITE_FIREBASE_STORAGE_BUCKET: 'test-bucket',
  };

  Object.entries(stubEnvValues).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
});
