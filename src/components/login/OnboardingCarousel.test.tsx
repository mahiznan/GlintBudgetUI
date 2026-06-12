import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotion.value,
}));

import OnboardingCarousel from './OnboardingCarousel';

function activeSlide(): HTMLElement {
  const el = document.querySelector('.login-slide--on');
  if (!(el instanceof HTMLElement)) throw new Error('no active slide');
  return el;
}

describe('OnboardingCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotion.value = false;
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('starts on the first slide', () => {
    render(<OnboardingCarousel />);
    expect(activeSlide().textContent).toContain('See your money');
  });

  it('auto-advances to the next slide after the interval', () => {
    render(<OnboardingCarousel />);
    act(() => {
      vi.advanceTimersByTime(4200);
    });
    expect(activeSlide().textContent).toContain('Smart by default.');
  });

  it('jumps to a slide when its dot is clicked', () => {
    render(<OnboardingCarousel />);
    fireEvent.click(screen.getByRole('button', { name: /go to slide 5/i }));
    expect(activeSlide().textContent).toContain('superpowers');
  });

  it('does not auto-advance under reduced motion', () => {
    reducedMotion.value = true;
    render(<OnboardingCarousel />);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(activeSlide().textContent).toContain('See your money');
  });
});
