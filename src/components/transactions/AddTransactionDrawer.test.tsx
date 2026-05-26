// src/components/transactions/AddTransactionDrawer.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../firebase/client', () => ({ auth: {}, app: {} }));
vi.mock('../../firebase/db', () => ({ db: {} }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../../hooks/useMutateTransaction', () => ({
  useAddTransaction: vi.fn(),
  useUpdateTransaction: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => undefined }),
  doc: vi.fn(),
}));

import { useAuth } from '../../auth/AuthContext';
import { usePreferenceContext } from '../../context/PreferenceContext';
import { useAddTransaction, useUpdateTransaction } from '../../hooks/useMutateTransaction';
import AddTransactionDrawer from './AddTransactionDrawer';

const stubPreference = {
  id: 'user123',
  categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
  subCategories: [{ name: 'Restaurants', emoji: '🍴', type: 'sub_category', parent: 'Food' }],
  vendors: [{ name: 'Swiggy', emoji: '🛒', type: 'vendor', parent: null }],
  accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
  payments: [{ name: 'UPI', emoji: '📱', type: 'payment', parent: null }],
  bookmarkedCurrencies: ['INR', 'USD'],
  defaultCurrency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
  defaultEntries: {},
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    status: 'authenticated',
    user: { uid: 'u1', name: 'Test', email: 't@t.com' },
  } as ReturnType<typeof useAuth>);
  vi.mocked(usePreferenceContext).mockReturnValue({
    preference: stubPreference,
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as ReturnType<typeof usePreferenceContext>);
  vi.mocked(useAddTransaction).mockReturnValue({
    mutate: vi.fn().mockResolvedValue('new-id'),
    loading: false,
    error: null,
  });
  vi.mocked(useUpdateTransaction).mockReturnValue({
    mutate: vi.fn().mockResolvedValue(undefined),
    loading: false,
    error: null,
  });
});

describe('AddTransactionDrawer', () => {
  it('is not in the DOM when open={false}', () => {
    render(<AddTransactionDrawer open={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open={true}', () => {
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: /new transaction/i })).toBeInTheDocument();
  });

  it('pre-fills the date from the selectedDate prop', () => {
    render(
      <AddTransactionDrawer
        open={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        selectedDate={new Date('2026-03-15T00:00:00')}
      />,
    );
    // The date field row shows a formatted date for March 15, 2026
    expect(screen.getByText(/march 15, 2026/i)).toBeInTheDocument();
  });

  it('renders Expense and Income toggle buttons', () => {
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('renders the INR currency badge', () => {
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: /currency/i })).toHaveTextContent('INR');
  });

  it('opens the vendor picker when the Vendor row is clicked', async () => {
    const user = userEvent.setup();
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /vendor/i }));
    expect(screen.getByPlaceholderText(/search vendor/i)).toBeInTheDocument();
  });

  it('closes the vendor picker and opens the category picker when Category row is clicked', async () => {
    const user = userEvent.setup();
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /vendor/i }));
    expect(screen.getByPlaceholderText(/search vendor/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^category/i }));
    expect(screen.queryByPlaceholderText(/search vendor/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search category/i)).toBeInTheDocument();
  });

  it('renders the Save button', () => {
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
  });

  it('clicking Cancel calls onClose after animation', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<AddTransactionDrawer open={true} onClose={onClose} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    vi.runAllTimers();
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('clicking the backdrop calls onClose after animation', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<AddTransactionDrawer open={true} onClose={onClose} onSaved={vi.fn()} />);
    await user.click(document.querySelector('[data-testid="drawer-backdrop"]')!);
    vi.runAllTimers();
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('pressing Escape calls onClose after animation', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<AddTransactionDrawer open={true} onClose={onClose} onSaved={vi.fn()} />);
    await user.keyboard('{Escape}');
    vi.runAllTimers();
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('pressing Escape when a picker is open closes the picker but not the drawer', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<AddTransactionDrawer open={true} onClose={onClose} onSaved={vi.fn()} />);
    // Open the vendor picker
    await user.click(screen.getByRole('button', { name: /vendor/i }));
    expect(screen.getByPlaceholderText(/search vendor/i)).toBeInTheDocument();
    // Press Escape — should close the picker, not the drawer
    await user.keyboard('{Escape}');
    vi.runAllTimers();
    expect(screen.queryByPlaceholderText(/search vendor/i)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('AddTransactionDrawer — Edit mode', () => {
  it('shows "Edit Transaction" title when editId is provided', () => {
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} editId="tx123" />);
    expect(screen.getByRole('dialog', { name: /edit transaction/i })).toBeInTheDocument();
  });

  it('shows "Update" button when editId is provided', () => {
    render(<AddTransactionDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} editId="tx123" />);
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });
});
