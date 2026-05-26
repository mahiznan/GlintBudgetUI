import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SubcategoriesTab from './SubcategoriesTab';
import type { BudgetData } from '../../firestore/types';

const categories: BudgetData[] = [
  { name: 'Food', emoji: '🍲', type: 'category', parent: null },
  { name: 'Transportation', emoji: '🚗', type: 'category', parent: null },
];

const defaultSubs: BudgetData[] = [
  { name: 'Lunch', emoji: '🍱', type: 'sub_category', parent: 'Food' },
  { name: 'Car', emoji: '🚗', type: 'sub_category', parent: 'Transportation' },
];

const userSub: BudgetData = { name: 'Snacks', emoji: '🍿', type: 'sub_category', parent: 'Food' };

function renderTab(overrides: Partial<Parameters<typeof SubcategoriesTab>[0]> = {}) {
  return render(
    <SubcategoriesTab
      allItems={[...defaultSubs]}
      defaultItems={defaultSubs}
      categories={categories}
      onSave={vi.fn()}
      saving={false}
      {...overrides}
    />,
  );
}

describe('SubcategoriesTab — defaults grouped by parent', () => {
  it('renders default items grouped under parent category headers', () => {
    renderTab();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.getByText('Car')).toBeInTheDocument();
  });

  it('collapses defaults section on toggle', async () => {
    renderTab();
    await userEvent.click(screen.getByRole('button', { name: /defaults/i }));
    expect(screen.queryByText('Lunch')).not.toBeInTheDocument();
  });
});

describe('SubcategoriesTab — add', () => {
  it('adds a new user subcategory with parent', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSave });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'Food');
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Snacks');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Snacks', parent: 'Food' }),
    ]);
  });

  it('rejects duplicate within same parent', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'Food');
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Lunch');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText(/"Lunch" already exists/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('allows same name under a different parent', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSave });
    // 'Lunch' exists under 'Food'; adding 'Lunch' under 'Transportation' should succeed
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /category/i }),
      'Transportation',
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Lunch');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(onSave).toHaveBeenCalled();
  });
});

describe('SubcategoriesTab — delete', () => {
  it('deletes a user subcategory', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ allItems: [...defaultSubs, userSub], onSave });
    await userEvent.click(screen.getByRole('button', { name: /delete snacks/i }));
    expect(onSave).toHaveBeenCalledWith([]);
  });
});
