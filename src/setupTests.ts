import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Stub Firebase env vars at module-evaluation time so they are set before any
// test file imports client.ts (which calls requireEnv() at module init time).
// beforeAll() is too late — it runs after imports are processed.
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test-auth-domain');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project-id');
vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app-id');
vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'test-sender-id');
vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test-bucket');

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

