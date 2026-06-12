import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PhoneFrame from './PhoneFrame';

describe('PhoneFrame', () => {
  it('renders image with correct src and alt', () => {
    const { getByAltText } = render(
      <PhoneFrame src="/onboarding/dashboard-light.png" alt="Dashboard" />,
    );
    const img = getByAltText('Dashboard') as HTMLImageElement;
    expect(img.src).toContain('/onboarding/dashboard-light.png');
  });

  it('applies tilt and yOffset as inline transform', () => {
    const { container } = render(
      <PhoneFrame
        src="/onboarding/dashboard-light.png"
        alt="Dashboard"
        tilt={8}
        yOffset={6}
      />,
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.style.transform).toBe('rotate(8deg) translateY(6px)');
  });

  it('applies no transform when tilt and yOffset are omitted', () => {
    const { container } = render(
      <PhoneFrame src="/onboarding/dashboard-light.png" alt="Dashboard" />,
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.style.transform).toBe('');
  });

  it('forwards className to the frame div', () => {
    const { container } = render(
      <PhoneFrame
        src="/onboarding/dashboard-light.png"
        alt="Dashboard"
        className="custom-class"
      />,
    );
    expect((container.firstChild as HTMLElement).classList).toContain('custom-class');
  });
});
