import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => [{ name: 'mock' }]),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ kind: 'mock-auth' })),
  onAuthStateChanged: vi.fn(() => () => {}),
  GoogleAuthProvider: class {},
}));

vi.mock('./firebase/client', () => ({
  auth: { kind: 'mock-auth' },
  app: {},
}));

vi.mock('./firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
}));

// Reduced motion ON disables the login carousel's auto-advance timer so the
// root-route render is deterministic and leaves no timer running.
vi.mock('./hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import App from './App';

describe('App', () => {
  it('renders the login screen at root route', () => {
    render(<App />);
    // Landing now renders the onboarding login screen: wordmark, hero heading, sign-in button.
    expect(screen.getByRole('img', { name: /glintbudget logo/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /see your money/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });
});
