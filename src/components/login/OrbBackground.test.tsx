import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OrbBackground from './OrbBackground';

const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotion.value,
}));

describe('OrbBackground', () => {
  afterEach(() => {
    reducedMotion.value = false;
  });

  it('renders three drifting orbs by default', () => {
    const { container } = render(<OrbBackground />);
    expect(container.querySelectorAll('.login-orb--drift')).toHaveLength(3);
  });

  it('omits the drift animation class under reduced motion', () => {
    reducedMotion.value = true;
    const { container } = render(<OrbBackground />);
    expect(container.querySelectorAll('.login-orb')).toHaveLength(3);
    expect(container.querySelectorAll('.login-orb--drift')).toHaveLength(0);
  });
});
