import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../firebase/client', () => ({ auth: {}, app: {} }));
vi.mock('../../firebase/db', () => ({ db: {} }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../../hooks/useMutateTransaction', () => ({ useAddTransaction: vi.fn() }));

import { useAuth } from '../../auth/AuthContext';
import { usePreferenceContext } from '../../context/PreferenceContext';
import { useAddTransaction } from '../../hooks/useMutateTransaction';
import AddTransactionDrawer from './AddTransactionDrawer';

const stubPreference = {
  id: 'user123',
  categories: [],
  subCategories: [],
  vendors: [],
  accounts: [],
  payments: [],
  bookmarkedCurrencies: [],
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
    const backdrop = document.querySelector('[data-testid="drawer-backdrop"]') as HTMLElement;
    await user.click(backdrop);
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
});
