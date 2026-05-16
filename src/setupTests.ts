import { beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

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
