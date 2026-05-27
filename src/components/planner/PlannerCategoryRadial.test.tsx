import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlannerCategoryRadial } from './PlannerCategoryRadial';
import type { CategoryResult } from '../../firestore/types';

describe('PlannerCategoryRadial', () => {
  it('renders without crashing for ok status', () => {
    const { container } = render(
      <PlannerCategoryRadial
        result={{ category: 'Food', planned: 1000, spent: 500, remaining: 500, pct: 50, status: 'ok' }}
        currency="SGD"
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.textContent).toContain('Food');
  });

  it('renders exceeded state', () => {
    const { container } = render(
      <PlannerCategoryRadial
        result={{ category: 'Shopping', planned: 500, spent: 620, remaining: -120, pct: 100, status: 'exceeded' }}
        currency="SGD"
      />,
    );
    expect(container.textContent).toContain('Over');
  });

  it('renders unplanned with dashed ring', () => {
    const { container } = render(
      <PlannerCategoryRadial
        result={{ category: 'Health', planned: 0, spent: 45, remaining: -45, pct: 0, status: 'unplanned' }}
        currency="SGD"
      />,
    );
    expect(container.querySelector('circle[stroke-dasharray]')).toBeTruthy();
  });
});
