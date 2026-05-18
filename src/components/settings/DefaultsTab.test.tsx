import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DefaultsTab from './DefaultsTab';
import type { BudgetData } from '../../firestore/types';

const accounts: BudgetData[]      = [{ name: 'Monthly Budget', emoji: '💼', type: 'account',      parent: null   }];
const categories: BudgetData[]    = [{ name: 'Food',           emoji: '🍲', type: 'category',     parent: null   }];
const payments: BudgetData[]      = [{ name: 'Cash',           emoji: '💵', type: 'payment',      parent: null   }];
const subCategories: BudgetData[] = [{ name: 'Lunch',          emoji: '🍱', type: 'sub_category', parent: 'Food' }];

function renderTab(overrides: Partial<Parameters<typeof DefaultsTab>[0]> = {}) {
  return render(
    <DefaultsTab
      accounts={accounts}
      categories={categories}
      payments={payments}
      subCategories={subCategories}
      defaultEntries={null}
      onSave={vi.fn()}
      saving={false}
      {...overrides}
    />,
  );
}

describe('DefaultsTab — renders', () => {
  it('renders all four pickers', () => {
    renderTab();
    expect(screen.getByLabelText(/default account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/default category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/default payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/default sub.?category/i)).toBeInTheDocument();
  });

  it('pre-selects existing default entries', () => {
    renderTab({ defaultEntries: { account: 'Monthly Budget', payment: 'Cash' } });
    expect(screen.getByLabelText(/default account/i)).toHaveValue('Monthly Budget');
    expect(screen.getByLabelText(/default payment/i)).toHaveValue('Cash');
  });

  it('sub-category picker is disabled when no category is selected', () => {
    renderTab({ defaultEntries: {} });
    expect(screen.getByLabelText(/default sub.?category/i)).toBeDisabled();
  });

  it('sub-category picker is enabled and filtered when category is selected', () => {
    renderTab({ defaultEntries: { category: 'Food' } });
    const picker = screen.getByLabelText(/default sub.?category/i);
    expect(picker).not.toBeDisabled();
    expect(picker.querySelector('option[value="Lunch"]')).toBeTruthy();
  });
});

describe('DefaultsTab — saves on change', () => {
  it('calls onSave with account key when account picker changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSave });
    await userEvent.selectOptions(screen.getByLabelText(/default account/i), 'Monthly Budget');
    expect(onSave).toHaveBeenCalledWith({ account: 'Monthly Budget' });
  });

  it('calls onSave with category key when category picker changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSave });
    await userEvent.selectOptions(screen.getByLabelText(/default category/i), 'Food');
    expect(onSave).toHaveBeenCalledWith({ category: 'Food' });
  });

  it('calls onSave with payment key when payment picker changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSave });
    await userEvent.selectOptions(screen.getByLabelText(/default payment/i), 'Cash');
    expect(onSave).toHaveBeenCalledWith({ payment: 'Cash' });
  });

  it('calls onSave with sub_category key when sub-category picker changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ defaultEntries: { category: 'Food' }, onSave });
    await userEvent.selectOptions(screen.getByLabelText(/default sub.?category/i), 'Lunch');
    expect(onSave).toHaveBeenCalledWith({ sub_category: 'Lunch' });
  });
});
