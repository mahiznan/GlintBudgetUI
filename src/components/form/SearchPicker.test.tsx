import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SearchPicker from './SearchPicker';
import type { BudgetData } from '../../firestore/types';

const OPTIONS: BudgetData[] = [
  { name: 'Swiggy', emoji: '🛒', type: 'vendor', parent: null },
  { name: 'Amazon', emoji: '📦', type: 'vendor', parent: null },
  { name: 'Swifton Pharmacy', emoji: '💊', type: 'vendor', parent: null },
];

describe('SearchPicker', () => {
  it('renders the search input with placeholder derived from label', () => {
    render(
      <SearchPicker label="Vendor" value="" options={OPTIONS} onSelect={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByPlaceholderText(/search vendor/i)).toBeInTheDocument();
  });

  it('shows all options when query is empty', () => {
    render(
      <SearchPicker label="Vendor" value="" options={OPTIONS} onSelect={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText('Swiggy')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
  });

  it('filters options as the user types (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(
      <SearchPicker label="Vendor" value="" options={OPTIONS} onSelect={vi.fn()} onClose={vi.fn()} />
    );
    await user.type(screen.getByPlaceholderText(/search vendor/i), 'swi');
    expect(screen.getByRole('button', { name: /swiggy/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /amazon/i })).not.toBeInTheDocument();
    // "Swifton Pharmacy" also contains 'swi'
    expect(screen.getByRole('button', { name: /swifton pharmacy/i })).toBeInTheDocument();
  });

  it('calls onSelect with the option name when an item is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SearchPicker label="Vendor" value="" options={OPTIONS} onSelect={onSelect} onClose={vi.fn()} />
    );
    await user.click(screen.getByText('Amazon'));
    expect(onSelect).toHaveBeenCalledWith('Amazon');
  });

  it('shows a checkmark next to the currently selected option', () => {
    render(
      <SearchPicker label="Vendor" value="Swiggy" options={OPTIONS} onSelect={vi.fn()} onClose={vi.fn()} />
    );
    // The checkmark is rendered as '✓' next to the selected item
    const swiggyButton = screen.getByRole('button', { name: /swiggy/i });
    expect(swiggyButton).toHaveTextContent('✓');
  });

  it('shows "Add …" option when allowFreeText is true and no match found', async () => {
    const user = userEvent.setup();
    render(
      <SearchPicker label="Vendor" value="" options={OPTIONS} onSelect={vi.fn()} onClose={vi.fn()} allowFreeText />
    );
    await user.type(screen.getByPlaceholderText(/search vendor/i), 'New Cafe');
    expect(screen.getByRole('button', { name: /add.*new cafe/i })).toBeInTheDocument();
  });

  it('calls onSelect with the typed text when "Add …" is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SearchPicker label="Vendor" value="" options={OPTIONS} onSelect={onSelect} onClose={vi.fn()} allowFreeText />
    );
    await user.type(screen.getByPlaceholderText(/search vendor/i), 'New Cafe');
    await user.click(screen.getByRole('button', { name: /add.*new cafe/i }));
    expect(onSelect).toHaveBeenCalledWith('New Cafe');
  });

  it('calls onSelect with highlighted item on Enter key', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SearchPicker label="Vendor" value="" options={OPTIONS} onSelect={onSelect} onClose={vi.fn()} />
    );
    // First item is highlighted by default; press Enter
    await user.click(screen.getByPlaceholderText(/search vendor/i));
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('Swiggy');
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SearchPicker label="Vendor" value="" options={OPTIONS} onSelect={vi.fn()} onClose={onClose} />
    );
    await user.click(screen.getByPlaceholderText(/search vendor/i));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
