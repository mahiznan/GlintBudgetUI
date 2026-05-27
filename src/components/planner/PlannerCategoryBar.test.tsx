import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlannerCategoryBar } from './PlannerCategoryBar';
import type { CategoryResult } from '../../firestore/types';

function makeResult(overrides: Partial<CategoryResult> = {}): CategoryResult {
  return {
    category: 'Food',
    planned: 1000,
    spent: 500,
    remaining: 500,
    pct: 50,
    status: 'ok',
    ...overrides,
  };
}

describe('PlannerCategoryBar', () => {
  it('renders category name', () => {
    render(<PlannerCategoryBar result={makeResult()} currency="SGD" isFirstUnplanned={false} />);
    expect(screen.getByText('Food')).toBeTruthy();
  });

  it('shows unplanned badge for unplanned status', () => {
    render(
      <PlannerCategoryBar
        result={makeResult({ status: 'unplanned', planned: 0, remaining: -45, pct: 0 })}
        currency="SGD"
        isFirstUnplanned={true}
      />,
    );
    expect(screen.getByText('unplanned')).toBeTruthy();
  });

  it('shows no-budget label', () => {
    render(
      <PlannerCategoryBar
        result={makeResult({ status: 'no-budget', planned: 0, pct: 0 })}
        currency="SGD"
        isFirstUnplanned={false}
      />,
    );
    expect(screen.getByText('no budget set')).toBeTruthy();
  });

  it('shows remaining label for ok status', () => {
    render(<PlannerCategoryBar result={makeResult()} currency="SGD" isFirstUnplanned={false} />);
    expect(screen.getByText(/remaining/i)).toBeTruthy();
  });

  it('shows exceeded label for exceeded status', () => {
    render(
      <PlannerCategoryBar
        result={makeResult({ status: 'exceeded', spent: 620, planned: 500, remaining: -120, pct: 100 })}
        currency="SGD"
        isFirstUnplanned={false}
      />,
    );
    expect(screen.getByText(/exceeded/i)).toBeTruthy();
  });
});
