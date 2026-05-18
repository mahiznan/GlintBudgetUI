import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BudgetDataTab from './BudgetDataTab';
import type { BudgetData } from '../../firestore/types';

const defaultItem: BudgetData = { name: 'Monthly Budget', emoji: '💼', type: 'account', parent: null };
const userItemA: BudgetData  = { name: 'HDFC',           emoji: '🏦', type: 'account', parent: null };
const userItemB: BudgetData  = { name: 'ICICI',          emoji: '🏦', type: 'account', parent: null };

function renderTab(overrides: Partial<Parameters<typeof BudgetDataTab>[0]> = {}) {
  return render(
    <BudgetDataTab
      itemType="account"
      allItems={[defaultItem]}
      defaultItems={[defaultItem]}
      onSave={vi.fn()}
      saving={false}
      {...overrides}
    />,
  );
}

describe('BudgetDataTab — defaults section', () => {
  it('shows defaults section expanded with default item and badge', () => {
    renderTab();
    expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('collapses defaults section on toggle', async () => {
    renderTab();
    await userEvent.click(screen.getByRole('button', { name: /defaults/i }));
    expect(screen.queryByText('Monthly Budget')).not.toBeInTheDocument();
  });

  it('expands defaults section again on second toggle', async () => {
    renderTab();
    await userEvent.click(screen.getByRole('button', { name: /defaults/i }));
    await userEvent.click(screen.getByRole('button', { name: /defaults/i }));
    expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
  });

  it('hides defaults section entirely when defaultItems is empty', () => {
    renderTab({ defaultItems: [], allItems: [] });
    expect(screen.queryByRole('button', { name: /defaults/i })).not.toBeInTheDocument();
  });
});

describe('BudgetDataTab — My Items (add)', () => {
  it('adds a new user item', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSave });
    await userEvent.type(screen.getByLabelText(/^name$/i), 'HDFC');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'HDFC', type: 'account' }),
    ]);
  });

  it('rejects add when name already exists in defaults', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Monthly Budget');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText(/"Monthly Budget" already exists/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects add when name already exists in user items', async () => {
    const onSave = vi.fn();
    renderTab({ allItems: [defaultItem, userItemA], onSave });
    await userEvent.type(screen.getByLabelText(/^name$/i), 'HDFC');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText(/"HDFC" already exists/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('clears add form after successful add', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSave });
    await userEvent.type(screen.getByLabelText(/^name$/i), 'HDFC');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('');
  });
});

describe('BudgetDataTab — My Items (edit)', () => {
  it('shows edit form when edit button is clicked', async () => {
    renderTab({ allItems: [defaultItem, userItemA] });
    await userEvent.click(screen.getByRole('button', { name: /edit hdfc/i }));
    expect(screen.getByDisplayValue('HDFC')).toBeInTheDocument();
  });

  it('saves an edit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ allItems: [defaultItem, userItemA], onSave });
    await userEvent.click(screen.getByRole('button', { name: /edit hdfc/i }));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'HDFC Savings');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'HDFC Savings' }),
    ]);
  });

  it('rejects edit when new name is a duplicate', async () => {
    const onSave = vi.fn();
    renderTab({ allItems: [defaultItem, userItemA, userItemB], onSave });
    await userEvent.click(screen.getByRole('button', { name: /edit hdfc/i }));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'ICICI');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByText(/"ICICI" already exists/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('allows saving with the same name (no false positive dup)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ allItems: [defaultItem, userItemA], onSave });
    await userEvent.click(screen.getByRole('button', { name: /edit hdfc/i }));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('cancels edit on Cancel button', async () => {
    renderTab({ allItems: [defaultItem, userItemA] });
    await userEvent.click(screen.getByRole('button', { name: /edit hdfc/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByDisplayValue('HDFC')).not.toBeInTheDocument();
    expect(screen.getByText('HDFC')).toBeInTheDocument();
  });
});

describe('BudgetDataTab — My Items (delete)', () => {
  it('deletes a user item', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderTab({ allItems: [defaultItem, userItemA], onSave });
    await userEvent.click(screen.getByRole('button', { name: /delete hdfc/i }));
    expect(onSave).toHaveBeenCalledWith([]);
  });
});
