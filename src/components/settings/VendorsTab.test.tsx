import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BudgetData, Transaction } from '../../firestore/types';

const mockBulkRenameVendor = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useBulkRenameVendor', () => ({
  useBulkRenameVendor: () => ({ mutate: mockBulkRenameVendor }),
}));

const mockTxCtx = vi.hoisted(() => ({ transactions: [] as Transaction[], loading: false }));
vi.mock('../../context/TransactionContext', () => ({
  useTransactionContext: () => ({
    transactions: mockTxCtx.transactions,
    loading: mockTxCtx.loading,
    error: null,
    hasPendingWrites: false,
  }),
}));

function makeTx(vendor: string): Transaction {
  return {
    id: vendor,
    user_id: 'u1',
    category: 'Food',
    subCategory: '',
    date: new Date(),
    account: 'Cash',
    vendor,
    payment: 'Cash',
    currency: 'SGD',
    notes: '',
    amount: 10,
    icon: '',
  };
}

import VendorsTab from './VendorsTab';

const saved: BudgetData = { name: 'Starbucks', emoji: '☕', type: 'vendor', parent: null };
const txOnly = 'Zepto';

function renderTab(overrides: Partial<React.ComponentProps<typeof VendorsTab>> = {}) {
  return render(
    <VendorsTab vendors={[saved]} uid="u1" onSave={vi.fn()} {...overrides} />,
  );
}

describe('VendorsTab — rendering', () => {
  beforeEach(() => {
    mockBulkRenameVendor.mockReset();
    mockTxCtx.transactions = [makeTx(saved.name), makeTx(txOnly)];
    mockTxCtx.loading = false;
  });

  it('renders "Saved Vendors" heading and saved vendor name', () => {
    renderTab();
    expect(screen.getByText(/saved vendors/i)).toBeInTheDocument();
    expect(screen.getByText('Starbucks')).toBeInTheDocument();
  });

  it('"From Transactions" section is collapsed by default', () => {
    renderTab();
    expect(screen.getByText(/from transactions/i)).toBeInTheDocument();
    expect(screen.queryByText(txOnly)).not.toBeInTheDocument();
  });

  it('expands "From Transactions" on click and shows transaction-only vendors', async () => {
    renderTab();
    await userEvent.click(screen.getByText(/from transactions/i));
    expect(screen.getByText(txOnly)).toBeInTheDocument();
  });

  it('does not show saved vendor in "From Transactions" section', async () => {
    renderTab();
    await userEvent.click(screen.getByText(/from transactions/i));
    const allStarbucks = screen.getAllByText('Starbucks');
    // Only appears once (in saved section), not duplicated in from-transactions
    expect(allStarbucks).toHaveLength(1);
  });
});

describe('VendorsTab — add', () => {
  beforeEach(() => {
    mockTxCtx.transactions = [makeTx(saved.name)];
    mockTxCtx.loading = false;
  });

  it('blocks adding a duplicate name and shows error', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.type(screen.getByLabelText(/new vendor name/i), 'Starbucks');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText(/"Starbucks" already exists/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with new vendor appended on valid add', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.type(screen.getByLabelText(/new vendor name/i), 'Zepto');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(onSave).toHaveBeenCalledWith([
      saved,
      expect.objectContaining({ name: 'Zepto', type: 'vendor' }),
    ]);
  });
});

describe('VendorsTab — rename modal', () => {
  beforeEach(() => {
    mockBulkRenameVendor.mockReset();
    mockTxCtx.transactions = [makeTx(saved.name)];
    mockTxCtx.loading = false;
  });

  it('opens rename modal when saved vendor name changes', async () => {
    renderTab({ onSave: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit Starbucks'));
    const nameInput = screen.getByDisplayValue('Starbucks');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Starbucks Coffee');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByRole('dialog', { name: /update transactions/i })).toBeInTheDocument();
  });

  it('calls bulkRenameVendor with correct args on "Yes, update all"', async () => {
    renderTab({ onSave: vi.fn(), uid: 'u1' });
    await userEvent.click(screen.getByLabelText('Edit Starbucks'));
    const nameInput = screen.getByDisplayValue('Starbucks');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Starbucks Coffee');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, update all/i }));
    expect(mockBulkRenameVendor).toHaveBeenCalledWith('u1', 'Starbucks', 'Starbucks Coffee');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does NOT call bulkRenameVendor on "No, keep as-is"', async () => {
    renderTab({ onSave: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit Starbucks'));
    const nameInput = screen.getByDisplayValue('Starbucks');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Starbucks Coffee');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await userEvent.click(screen.getByRole('button', { name: /no, keep/i }));
    expect(mockBulkRenameVendor).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does NOT open rename modal when only emoji changes', async () => {
    renderTab({ onSave: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit Starbucks'));
    const emojiInput = screen.getByLabelText('Emoji');
    await userEvent.clear(emojiInput);
    await userEvent.type(emojiInput, '🌟');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('VendorsTab — delete', () => {
  beforeEach(() => {
    mockTxCtx.transactions = [makeTx(saved.name)];
    mockTxCtx.loading = false;
  });

  it('shows delete dialog on delete click, dismisses on Cancel', async () => {
    renderTab();
    await userEvent.click(screen.getByLabelText('Delete Starbucks'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onSave without deleted vendor on confirm', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.click(screen.getByLabelText('Delete Starbucks'));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onSave).toHaveBeenCalledWith([]);
  });
});

describe('VendorsTab — save to list', () => {
  beforeEach(() => {
    mockTxCtx.transactions = [makeTx(saved.name), makeTx(txOnly)];
    mockTxCtx.loading = false;
  });

  it('"Save to list" on a transaction-only vendor calls onSave with that vendor appended', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.click(screen.getByText(/from transactions/i));
    await userEvent.click(screen.getByLabelText(`Save ${txOnly} to list`));
    expect(onSave).toHaveBeenCalledWith([
      saved,
      expect.objectContaining({ name: txOnly, type: 'vendor', emoji: null }),
    ]);
  });
});
