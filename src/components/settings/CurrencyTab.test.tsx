import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CurrencyTab from './CurrencyTab';
import type { Currency } from '../../firestore/types';

const sgd: Currency = { name: 'Singapore Dollar', code: 'SGD', symbol: 'S$' };

function renderTab(overrides: Partial<Parameters<typeof CurrencyTab>[0]> = {}) {
  return render(
    <CurrencyTab
      defaultCurrency={sgd}
      bookmarkedCurrencies={['SGD', 'INR']}
      onSaveCurrency={vi.fn()}
      onSaveBookmarks={vi.fn()}
      saving={false}
      {...overrides}
    />,
  );
}

describe('CurrencyTab — default currency', () => {
  it('shows the current default currency selected', () => {
    renderTab();
    expect(screen.getByRole('combobox', { name: /default currency/i })).toHaveValue('SGD');
  });

  it('calls onSaveCurrency with full Currency object when changed', async () => {
    const onSaveCurrency = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSaveCurrency });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /default currency/i }),
      'INR',
    );
    expect(onSaveCurrency).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INR', name: 'Indian Rupee', symbol: '₹' }),
    );
  });
});

describe('CurrencyTab — bookmarked currencies', () => {
  it('lists all bookmarked currencies', () => {
    renderTab();
    expect(screen.getByText('SGD')).toBeInTheDocument();
    expect(screen.getByText('INR')).toBeInTheDocument();
  });

  it('removes a bookmarked currency', async () => {
    const onSaveBookmarks = vi.fn().mockResolvedValue(undefined);
    renderTab({ onSaveBookmarks });
    await userEvent.click(screen.getByRole('button', { name: /remove sgd/i }));
    expect(onSaveBookmarks).toHaveBeenCalledWith(['INR']);
  });

  it('adds a bookmarked currency', async () => {
    const onSaveBookmarks = vi.fn().mockResolvedValue(undefined);
    renderTab({ bookmarkedCurrencies: ['SGD'], onSaveBookmarks });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /add currency/i }), 'INR');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(onSaveBookmarks).toHaveBeenCalledWith(['SGD', 'INR']);
  });

  it('rejects adding a currency already bookmarked', async () => {
    const onSaveBookmarks = vi.fn();
    // SGD and INR are already bookmarked; the Add dropdown only shows unbookmarked currencies,
    // so we force the scenario by selecting via the already-bookmarked value
    renderTab({ bookmarkedCurrencies: ['SGD'], onSaveBookmarks });
    // The combobox should not contain SGD since it's already bookmarked
    const options = screen.getByRole('combobox', { name: /add currency/i });
    const sgdOption = Array.from(options.querySelectorAll('option')).find((o) => o.value === 'SGD');
    expect(sgdOption).toBeUndefined();
  });
});
