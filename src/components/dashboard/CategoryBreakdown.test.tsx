import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

import CategoryBreakdown from './CategoryBreakdown';
import type { CategoryItem } from './CategoryBreakdown';

const makeCategory = (name: string, total: number, pct: number): CategoryItem => ({
  name,
  icon: '🛒',
  total,
  pct,
});

const makeBaseProps = () => ({
  categories: [] as CategoryItem[],
  mode: 'expense' as const,
  onModeChange: vi.fn(),
  currencySymbol: '₹',
  groupBy: 'category' as const,
  onGroupByChange: vi.fn(),
});

let baseProps: ReturnType<typeof makeBaseProps>;

beforeEach(() => {
  baseProps = makeBaseProps();
});

describe('CategoryBreakdown', () => {
  it('renders groupBy dropdown at level 0', () => {
    render(<CategoryBreakdown {...baseProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Category')).toBeInTheDocument();
  });

  it('calls onGroupByChange when dropdown selection changes', async () => {
    const user = userEvent.setup();
    const onGroupByChange = vi.fn();
    render(<CategoryBreakdown {...baseProps} onGroupByChange={onGroupByChange} />);
    await user.selectOptions(screen.getByRole('combobox'), 'account');
    expect(onGroupByChange).toHaveBeenCalledWith('account');
  });

  it('renders Expense and Income toggle buttons at level 0', () => {
    render(<CategoryBreakdown {...baseProps} />);
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('active expense button uses expense gradient, not bg-red-600', () => {
    render(<CategoryBreakdown {...baseProps} />);
    const btn = screen.getByRole('button', { name: /expense/i });
    expect(btn).not.toHaveClass('bg-red-600');
    expect(btn.style.background).toBe('var(--expense-gradient)');
  });

  it('active income button uses brand gradient', () => {
    render(<CategoryBreakdown {...baseProps} mode="income" />);
    const btn = screen.getByRole('button', { name: /income/i });
    expect(btn.style.background).toBe('var(--brand-gradient)');
  });

  it('renders provided categories', () => {
    const cats = [makeCategory('Food', 1500, 60), makeCategory('Transport', 600, 24)];
    render(<CategoryBreakdown {...baseProps} categories={cats} />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('calls onModeChange with "income" when Income button is clicked', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<CategoryBreakdown {...baseProps} onModeChange={onModeChange} />);
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(onModeChange).toHaveBeenCalledWith('income');
  });

  it('shows expense empty state when mode is expense and categories is empty', () => {
    render(<CategoryBreakdown {...baseProps} />);
    expect(screen.getByText(/no expenses for this period/i)).toBeInTheDocument();
  });

  it('shows income empty state when mode is income and categories is empty', () => {
    render(<CategoryBreakdown {...baseProps} mode="income" />);
    expect(screen.getByText(/no income for this period/i)).toBeInTheDocument();
  });

});

const makeTxn = (id: string, vendor: string, date: Date): Transaction => ({
  id,
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Dining Out',
  date,
  account: 'HDFC',
  vendor,
  payment: 'Card',
  currency: 'INR',
  notes: '',
  amount: -500,
  icon: '🍕',
});

describe('CategoryBreakdown — drill-down', () => {
  it('hides toggle and dropdown at drillLevel 1', () => {
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Food', 1500, 60)]}
        drillLevel={1}
        drillLabel="Food"
        backLabel="← Back"
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /income/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('hides toggle and dropdown at drillLevel 2', () => {
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Restaurants', 1500, 60)]}
        drillLevel={2}
        drillLabel="Restaurants"
        backLabel="← Food"
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /income/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('calls onItemClick with category name when a row is clicked', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const cats = [makeCategory('Food', 1500, 60)];
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={cats}
        onItemClick={onItemClick}
      />,
    );
    await user.click(screen.getByText('Food'));
    expect(onItemClick).toHaveBeenCalledWith('Food');
  });

  it('shows back button with backLabel at level 1', () => {
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Dining Out', 2700, 60)]}
        drillLevel={1}
        drillLabel="Food"
        backLabel="← Back"
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /← Back/i })).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked at level 1', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Dining Out', 2700, 60)]}
        drillLevel={1}
        drillLabel="Food"
        backLabel="← Back"
        onBack={onBack}
      />,
    );
    await user.click(screen.getByRole('button', { name: /← Back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders transaction vendor names when transactions prop is passed', () => {
    const txns = [
      makeTxn('t1', 'Pizza Hut', new Date('2026-05-18')),
      makeTxn('t2', "Domino's", new Date('2026-05-15')),
    ];
    render(
      <MemoryRouter>
        <CategoryBreakdown
          {...baseProps}
          categories={[makeCategory('Dining Out', 1000, 100)]}
          drillLevel={2}
          drillLabel="Dining Out"
          backLabel="← Food"
          onBack={vi.fn()}
          transactions={txns}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Pizza Hut')).toBeInTheDocument();
    expect(screen.getByText("Domino's")).toBeInTheDocument();
  });

  it('transaction rows link to the edit form when transactions prop is passed', () => {
    const txns = [makeTxn('txn-abc', 'Pizza Hut', new Date())];
    render(
      <MemoryRouter>
        <CategoryBreakdown
          {...baseProps}
          categories={[makeCategory('Dining Out', 500, 100)]}
          drillLevel={2}
          drillLabel="Dining Out"
          backLabel="← Food"
          onBack={vi.fn()}
          transactions={txns}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Pizza Hut/i });
    expect(link).toHaveAttribute('href', '/app/transactions/txn-abc/edit');
  });
});
