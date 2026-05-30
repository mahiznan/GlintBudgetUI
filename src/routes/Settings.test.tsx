import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../context/PreferenceContext', () => ({
  usePreferenceContext: vi.fn(() => ({
    preference: {
      id: 'u1',
      accounts: [],
      archivedAccounts: [],
      categories: [],
      subCategories: [],
      vendors: [],
      payments: [],
      defaultCurrency: { name: 'Singapore Dollar', code: 'SGD', symbol: 'S$' },
      bookmarkedCurrencies: [],
      defaultEntries: null,
    },
    loading: false,
    error: null,
  })),
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated', user: { uid: 'u1' } }),
}));
vi.mock('../hooks/useUpdatePreference', () => ({
  useUpdatePreference: () => ({ mutate: vi.fn() }),
}));
vi.mock('../components/settings/AccountsTab', () => ({
  default: () => <div data-testid="accounts-tab" />,
}));
vi.mock('../components/settings/BudgetDataTab', () => ({
  default: ({ itemType }: { itemType: string }) => <div data-testid={`budget-tab-${itemType}`} />,
}));
vi.mock('../components/settings/SubcategoriesTab', () => ({
  default: () => <div data-testid="subcategories-tab" />,
}));
vi.mock('../components/settings/CurrencyTab', () => ({
  default: () => <div data-testid="currency-tab" />,
}));
vi.mock('../components/settings/DefaultsTab', () => ({
  default: () => <div data-testid="defaults-tab" />,
}));

import Settings from './Settings';

function renderSettings(tab = '') {
  const path = tab ? `/app/settings?tab=${tab}` : '/app/settings';
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/settings" element={<Settings />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Settings — tab bar', () => {
  it('renders all 7 tab buttons', () => {
    renderSettings();
    [
      'Accounts',
      'Categories',
      'Subcategories',
      'Vendors',
      'Payments',
      'Currency',
      'Defaults',
    ].forEach((label) => expect(screen.getByRole('button', { name: label })).toBeInTheDocument());
  });

  it('defaults to Accounts tab when no query param', () => {
    renderSettings();
    expect(screen.getByTestId('accounts-tab')).toBeInTheDocument();
  });

  it('renders Categories tab when tab=categories', () => {
    renderSettings('categories');
    expect(screen.getByTestId('budget-tab-category')).toBeInTheDocument();
  });

  it('renders Subcategories tab when tab=subcategories', () => {
    renderSettings('subcategories');
    expect(screen.getByTestId('subcategories-tab')).toBeInTheDocument();
  });

  it('renders Vendors tab when tab=vendors', () => {
    renderSettings('vendors');
    expect(screen.getByTestId('budget-tab-vendor')).toBeInTheDocument();
  });

  it('renders Payments tab when tab=payments', () => {
    renderSettings('payments');
    expect(screen.getByTestId('budget-tab-payment')).toBeInTheDocument();
  });

  it('renders Currency tab when tab=currency', () => {
    renderSettings('currency');
    expect(screen.getByTestId('currency-tab')).toBeInTheDocument();
  });

  it('renders Defaults tab when tab=defaults', () => {
    renderSettings('defaults');
    expect(screen.getByTestId('defaults-tab')).toBeInTheDocument();
  });

  it('switches tab on button click', async () => {
    renderSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Currency' }));
    expect(screen.getByTestId('currency-tab')).toBeInTheDocument();
  });
});

describe('Settings — loading state', () => {
  it('shows loading spinner when preference is loading', async () => {
    const { usePreferenceContext } = await import('../context/PreferenceContext');
    vi.mocked(usePreferenceContext).mockReturnValueOnce({
      preference: null,
      loading: true,
      error: null,
    });
    renderSettings();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
