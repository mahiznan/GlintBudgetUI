vi.mock('../transactions/AddTransactionDrawer', () => ({
  default: ({ open, editId }: { open: boolean; editId?: string }) =>
    open ? (
      <div role="dialog" aria-label={editId ? 'Edit Transaction' : 'New Transaction'}>
        drawer
      </div>
    ) : null,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DailyTransactions from './DailyTransactions';
import type { Transaction } from '../../firestore/types';

function makeTx(id: string, vendor: string, amount: number, date: Date): Transaction {
  return {
    id,
    user_id: 'u1',
    category: 'Food',
    subCategory: vendor,
    date,
    account: 'HDFC',
    vendor,
    payment: 'UPI',
    currency: 'INR',
    notes: '',
    amount,
    icon: '🛒',
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
      <DailyTransactions transactions={transactions} currencySymbol="₹" onDelete={vi.fn()} />
    </MemoryRouter>,
  );
}

// Simulates CSS transitionend so the carousel commits its state.
// jsdom doesn't run CSS transitions, so tests must call this manually.
function settleAnimation(container: HTMLElement) {
  const track = container.querySelector('[data-testid="carousel-track"]');
  if (track) fireEvent.transitionEnd(track);
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
    // Three-panel carousel renders the message for all three days; verify at least one is present
    expect(screen.getAllByText(/no transactions for this day/i).length).toBeGreaterThan(0);
  });

  it('formats amount with currency symbol', () => {
    renderDT([makeTx('tx1', 'Zepto', -500, todayAt())]);
    // Symbol and number are in separate spans; check via the full transaction row
    const row = screen.getByText('Zepto').closest('div')!.parentElement!;
    expect(row.textContent).toMatch(/₹/);
    expect(row.textContent).toMatch(/500/);
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
    const { container } = renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    settleAnimation(container);
    await userEvent.click(screen.getByRole('button', { name: /next week/i }));
    settleAnimation(container);
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
    const today = new Date();
    const targetDate = new Date(today);
    if (today.getDay() !== 1) {
      const diff = today.getDay() === 0 ? -6 : 1 - today.getDay();
      targetDate.setDate(today.getDate() + diff);
    } else {
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
    settleAnimation(container);
    expect(screen.getByText('TargetVendor')).toBeInTheDocument();
  });
});

describe('DailyTransactions — expense sum', () => {
  it('hides day total when there are no transactions', () => {
    renderDT([]);
    // Day total footer is only rendered when dayExpenses > 0
    expect(screen.queryByText('Day total')).not.toBeInTheDocument();
  });

  it("shows correct expense sum for today's transactions", () => {
    renderDT([makeTx('t1', 'Swiggy', -450, todayAt(12)), makeTx('t2', 'Ola', -280, todayAt(9))]);
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

describe('DailyTransactions — Add button', () => {
  it('does not render an Add transaction button (moved to global FAB)', () => {
    renderDT([]);
    expect(screen.queryByRole('button', { name: /add transaction/i })).not.toBeInTheDocument();
  });
});

describe('DailyTransactions — edit button', () => {
  it('edit icon is a button, not a link', () => {
    render(
      <MemoryRouter>
        <DailyTransactions
          transactions={[makeTx('tx1', 'Swiggy', -400, todayAt())]}
          currencySymbol="₹"
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /edit swiggy/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit swiggy/i })).not.toBeInTheDocument();
  });

  it('clicking edit button opens the edit drawer', async () => {
    render(
      <MemoryRouter>
        <DailyTransactions
          transactions={[makeTx('tx1', 'Swiggy', -400, todayAt())]}
          currencySymbol="₹"
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /edit swiggy/i }));
    expect(screen.getByRole('dialog', { name: /edit transaction/i })).toBeInTheDocument();
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
    const { container } = renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    settleAnimation(container);
    await userEvent.click(screen.getByRole('button', { name: /^today$/i }));
    settleAnimation(container);
    // Next week button should be disabled again (we're back on the current week)
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
    // Today's date tile should be selected
    const todayNum = new Date().getDate().toString();
    const pressed = screen.getAllByRole('button', { pressed: true });
    const todayTile = pressed.find(
      (b) =>
        b.textContent?.includes(todayNum) && b !== screen.getByRole('button', { name: /^today$/i }),
    );
    expect(todayTile).toBeTruthy();
  });
});

describe('DailyTransactions — calendar date picker', () => {
  it('renders a "Pick a date" button', () => {
    renderDT([]);
    expect(screen.getByRole('button', { name: /pick a date/i })).toBeInTheDocument();
  });

  it('shows a month calendar when the picker icon is clicked', async () => {
    renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
  });

  it('closes the calendar when Escape is pressed', async () => {
    renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: /previous month/i })).not.toBeInTheDocument();
  });

  it('navigates to the picked date and closes the popover', async () => {
    renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    // Go to last month so all days are in the past
    await userEvent.click(screen.getByRole('button', { name: /previous month/i }));
    // Pick the 15th (always a past date)
    const dayBtns = screen
      .getAllByRole('button')
      .filter(
        (b) =>
          !b.getAttribute('aria-label') && b.textContent === '15' && !b.hasAttribute('disabled'),
      );
    await userEvent.click(dayBtns[0]!);
    // Popover closed
    expect(screen.queryByRole('button', { name: /previous month/i })).not.toBeInTheDocument();
    // Week strip now shows a past week — next-week button is enabled
    expect(screen.getByRole('button', { name: /next week/i })).not.toBeDisabled();
  });
});

describe('DailyTransactions — slide animation', () => {
  it('rapid clicks during animation are ignored (next-week button stays enabled only once)', async () => {
    const { container } = renderDT([]);
    const prevBtn = screen.getByRole('button', { name: /previous week/i });
    await userEvent.click(prevBtn); // starts animation
    await userEvent.click(prevBtn); // ignored while sliding
    settleAnimation(container);
    // We went back exactly one week — next week button is enabled
    expect(screen.getByRole('button', { name: /next week/i })).not.toBeDisabled();
    // Settle a second animation if somehow two fired — should still be one week back
    settleAnimation(container);
    expect(screen.getByRole('button', { name: /next week/i })).not.toBeDisabled();
  });

  it('same-day tap does not start animation', async () => {
    const { container } = renderDT([]);
    const todayNum = new Date().getDate().toString();
    const allTiles = container.querySelectorAll('button[aria-pressed]');
    const todayTile = Array.from(allTiles).find(
      (b) => b.textContent?.includes(todayNum) && b.textContent !== 'Today',
    )!;
    await userEvent.click(todayTile); // already selected — should be a no-op
    settleAnimation(container);
    // weekStart unchanged — next week button remains disabled
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
  });

  it('shows prev-week transactions in center panel after settling animation', async () => {
    // Build prev Sunday's date (what goToPrevWeek targets)
    const today = new Date();
    const currentMonday = new Date(today);
    const diff = today.getDay() === 0 ? -6 : 1 - today.getDay();
    currentMonday.setDate(today.getDate() + diff);
    currentMonday.setHours(0, 0, 0, 0);
    const prevMonday = new Date(currentMonday);
    prevMonday.setDate(currentMonday.getDate() - 7);
    const prevSunday = new Date(prevMonday);
    prevSunday.setDate(prevMonday.getDate() + 6);
    prevSunday.setHours(12, 0, 0, 0);

    const { container } = render(
      <MemoryRouter>
        <DailyTransactions
          transactions={[makeTx('tx-prev', 'PrevWeekVendor', -100, prevSunday)]}
          currencySymbol="₹"
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    settleAnimation(container);
    expect(screen.getByText('PrevWeekVendor')).toBeInTheDocument();
  });

  it('transitionend fired on a child element does not commit state prematurely', async () => {
    const { container } = renderDT([]);
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    // Fire transitionend on an inner child — should be ignored by the handler
    const track = container.querySelector('[data-testid="carousel-track"]')!;
    const inner = track.firstElementChild as HTMLElement;
    if (inner) fireEvent.transitionEnd(inner);
    // Week strip already updated (navigateTo fires immediately)
    expect(screen.getByRole('button', { name: /next week/i })).not.toBeDisabled();
    // Now settle properly
    settleAnimation(container);
    expect(screen.getByRole('button', { name: /next week/i })).not.toBeDisabled();
  });

  it('day-pill click direction: earlier day slides right, later day slides left', async () => {
    const { container } = renderDT([]);
    // Navigate to prev week → center becomes Sunday of prev week
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    settleAnimation(container);

    const track = container.querySelector('[data-testid="carousel-track"]')!;

    // The Today button also carries aria-pressed; filter it out to get only the 7 day pills
    const getDayPills = () =>
      Array.from(container.querySelectorAll('button[aria-pressed]')).filter(
        (b) => b.textContent?.trim() !== 'Today',
      );

    // Click Monday (index 0, earlier than center=Sunday) → should slide right
    await userEvent.click(getDayPills()[0]!);
    expect(track.getAttribute('style')).toContain('translateX(0%)');
    settleAnimation(container); // center is now Monday

    // Click Wednesday (index 2, later than center=Monday) → should slide left
    await userEvent.click(getDayPills()[2]!);
    expect(track.getAttribute('style')).toContain('translateX(-66.66%)');
    settleAnimation(container);
  });

  it('Today button navigates back to the current week', async () => {
    const { container } = renderDT([]);

    // Navigate to prev week so Today is in the future
    await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
    settleAnimation(container);

    // Click Today — should navigate forward and land back on current week
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    settleAnimation(container);

    // Next week button should now be disabled (back on current week)
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^today$/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
