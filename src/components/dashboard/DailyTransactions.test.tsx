import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DailyTransactions from './DailyTransactions';
import type { Transaction } from '../../firestore/types';

function makeTx(id: string, vendor: string, amount: number, date: Date): Transaction {
  return {
    id, user_id: 'u1', category: 'Food', subCategory: '',
    date, account: 'HDFC', vendor, payment: 'UPI',
    currency: 'INR', notes: '', amount, icon: '🛒',
  };
}

function todayAt(hours = 12): Date {
  const d = new Date();
  d.setHours(hours, 0, 0, 0);
  return d;
}

function daysAgo(n: number, hours = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hours, 0, 0, 0);
  return d;
}

function renderDT(transactions: Transaction[]) {
  return render(
    <MemoryRouter>
      <DailyTransactions
        transactions={transactions}
        currencySymbol="₹"
        onDelete={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('DailyTransactions — date strip', () => {
  it('renders exactly 7 date tiles', () => {
    const { container } = renderDT([]);
    // button[aria-pressed] includes the Today button + 7 date tiles = 8 total
    const allPressed = container.querySelectorAll('button[aria-pressed]');
    const dateTiles = Array.from(allPressed).filter((b) => b.textContent !== 'Today');
    expect(dateTiles).toHaveLength(7);
  });

  it("today's tile is selected (aria-pressed=true) by default", () => {
    renderDT([]);
    // Both the Today button and today's date tile have aria-pressed=true
    const pressed = screen.getAllByRole('button', { pressed: true });
    expect(pressed).toHaveLength(2);
    // The date tile (not the Today button) contains today's date number
    const todayNum = new Date().getDate().toString();
    expect(pressed.some((b) => b.textContent?.includes(todayNum))).toBe(true);
  });

  it('next week button is disabled on the current week', () => {
    renderDT([]);
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
  });

  it('prev week button is always enabled', () => {
    renderDT([]);
    expect(screen.getByRole('button', { name: /previous week/i })).not.toBeDisabled();
  });
});

describe('DailyTransactions — transaction list', () => {
  it('shows transactions for today by default', () => {
    renderDT([makeTx('tx1', 'Swiggy', -400, todayAt())]);
    expect(screen.getByText('Swiggy')).toBeInTheDocument();
  });

  it('does not show transactions from other days', () => {
    renderDT([makeTx('tx1', 'OldVendor', -400, daysAgo(3))]);
    expect(screen.queryByText('OldVendor')).not.toBeInTheDocument();
  });

  it('shows empty state when today has no transactions', () => {
    renderDT([]);
    expect(screen.getByText(/no transactions for this day/i)).toBeInTheDocument();
  });

  it('formats amount with currency symbol', () => {
    renderDT([makeTx('tx1', 'Zepto', -500, todayAt())]);
    expect(screen.getAllByText(/₹500/).length).toBeGreaterThan(0);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <DailyTransactions
          transactions={[makeTx('tx1', 'Zomato', -350, todayAt())]}
          currencySymbol="₹"
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /delete zomato/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});

describe('DailyTransactions — week navigation', () => {
  it('enables the next week button after navigating to a previous week', async () => {
    renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    expect(screen.getByRole('button', { name: /next week/i })).not.toBeDisabled();
  });

  it('disables next week button again after returning to current week', async () => {
    renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    await userEvent.click(screen.getByRole('button', { name: /next week/i }));
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
  });

  it('selects Sunday when navigating to a previous week', async () => {
    renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    // Sunday tile should now be selected (aria-pressed=true)
    const pressedTiles = screen.getAllByRole('button', { pressed: true });
    expect(pressedTiles).toHaveLength(1);
    // The pressed tile should be Sunday — verify via aria-label
    expect(pressedTiles[0]).toHaveAccessibleName(/sun/i);
  });

  it('shows transactions for a different day after navigating to it', async () => {
    // Pick a day in the current week that is NOT today (always in the current strip, no navigation needed)
    const today = new Date();
    const targetDate = new Date(today);
    if (today.getDay() !== 1) {
      // Go to Monday of this week
      const diff = today.getDay() === 0 ? -6 : 1 - today.getDay();
      targetDate.setDate(today.getDate() + diff);
    } else {
      // Today is Monday — pick Tuesday instead
      targetDate.setDate(today.getDate() + 1);
    }
    targetDate.setHours(12, 0, 0, 0);

    const { container } = render(
      <MemoryRouter>
        <DailyTransactions
          transactions={[makeTx('tx1', 'TargetVendor', -300, targetDate)]}
          currencySymbol="₹"
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );

    const targetNum = targetDate.getDate().toString();
    const allTiles = container.querySelectorAll('button[aria-pressed]');
    const target = Array.from(allTiles).find(
      (b) => b.textContent?.includes(targetNum) && b.getAttribute('aria-pressed') === 'false',
    );
    expect(target).toBeTruthy();
    await userEvent.click(target!);

    expect(screen.getByText('TargetVendor')).toBeInTheDocument();
  });
});

describe('DailyTransactions — expense sum', () => {
  it('shows zero expense total next to date heading when no transactions', () => {
    renderDT([]);
    // The zero sum shows as −₹0.00 (the currency symbol depends on the test setup)
    // Check for the minus sign + zero pattern
    const sumEl = screen.getByText(/−.*0/);
    expect(sumEl).toBeInTheDocument();
  });

  it("shows correct expense sum for today's transactions", () => {
    renderDT([
      makeTx('t1', 'Swiggy', -450, todayAt(12)),
      makeTx('t2', 'Ola', -280, todayAt(9)),
    ]);
    // Sum: 450 + 280 = 730 — look for the amount in the expense sum row
    expect(screen.getByText(/−.*730/)).toBeInTheDocument();
  });

  it('excludes income transactions from the sum', () => {
    renderDT([
      makeTx('t1', 'Salary', 50000, todayAt(10)),
      makeTx('t2', 'Coffee', -200, todayAt(11)),
    ]);
    // The expense sum row should show 200 (not 50,200)
    const sumElements = screen.getAllByText(/−.*200/);
    expect(sumElements.length).toBeGreaterThan(0);
    // None of the matching elements should show the income (50,000) included
    sumElements.forEach((el) => {
      expect(el.textContent).not.toMatch(/50[,.]?[0-9]/);
    });
  });
});

describe('DailyTransactions — Add link', () => {
  it('renders an Add link pointing to /app/transactions/new', () => {
    renderDT([]);
    const link = screen.getByRole('link', { name: /add/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/transactions/new');
  });
});

describe('DailyTransactions — Today button', () => {
  it('Today button is present', () => {
    renderDT([]);
    expect(screen.getByRole('button', { name: /^today$/i })).toBeInTheDocument();
  });

  it('Today button has filled style when viewing today', () => {
    renderDT([]);
    const btn = screen.getByRole('button', { name: /^today$/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('Today button has outline style (not pressed) after navigating to prev week', async () => {
    renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    const btn = screen.getByRole('button', { name: /^today$/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Today from a past week returns to today', async () => {
    renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    await userEvent.click(screen.getByRole('button', { name: /^today$/i }));
    // Next week button should be disabled again (we're back on the current week)
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
    // Today's date tile should be selected
    const todayNum = new Date().getDate().toString();
    const pressed = screen.getAllByRole('button', { pressed: true });
    const todayTile = pressed.find((b) => b.textContent?.includes(todayNum) && b !== screen.getByRole('button', { name: /^today$/i }));
    expect(todayTile).toBeTruthy();
  });
});
