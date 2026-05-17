import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TopBar from './TopBar';
import type { Period } from '../../lib/dateUtils';

describe('TopBar', () => {
  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" period="month" onPeriodChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders period tabs', () => {
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" period="month" onPeriodChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument();
  });

  it('calls onPeriodChange when a tab is clicked', async () => {
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" period="month" onPeriodChange={onChange} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /week/i }));
    expect(onChange).toHaveBeenCalledWith('week' as Period);
  });

  it('renders + Add Transaction link', () => {
    render(
      <MemoryRouter>
        <TopBar title="Dashboard" period="month" onPeriodChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /add transaction/i })).toBeInTheDocument();
  });
});
