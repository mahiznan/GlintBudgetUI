import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => [{ name: 'mock' }]),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ kind: 'mock-auth' })),
  onAuthStateChanged: vi.fn(() => () => {}),
}));

vi.mock('./firebase/client', () => ({
  auth: { kind: 'mock-auth' },
}));

import App from './App';

describe('App', () => {
  it('renders the landing page at root route', () => {
    render(<App />);
    // Landing route renders: wordmark, h1 heading, footer
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
