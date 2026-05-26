# Dashboard Transactions Widget — Weekly Date Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `PeriodTransactions` dashboard widget with `DailyTransactions` — a weekly date-strip navigator that shows all transactions for a selected day, with ‹/› week navigation and a diagonal green gradient on the selected tile.

**Architecture:** Add four date-utility helpers to `dateUtils.ts`, build a self-contained `DailyTransactions` component that holds week/selected-date state internally and filters from the full `allTxns` array passed by Dashboard, then swap the old component out in `Dashboard.tsx` and delete the old files.

**Tech Stack:** React, TypeScript (strict), Tailwind CSS v4, Vitest + React Testing Library, react-router-dom Link.

---

## File Map

| Action | Path                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| Modify | `src/lib/dateUtils.ts` — add `getMondayOf`, `getWeekDays`, `isSameDay`, `isCurrentWeek`, `formatDayHeading` |
| Create | `src/lib/dateUtils.test.ts` — unit tests for the five new helpers                                           |
| Create | `src/components/dashboard/DailyTransactions.tsx` — new widget component                                     |
| Create | `src/components/dashboard/DailyTransactions.test.tsx` — component tests                                     |
| Modify | `src/routes/Dashboard.tsx` — swap import + JSX, pass `allTxns` instead of `periodTxns`                      |
| Delete | `src/components/dashboard/PeriodTransactions.tsx`                                                           |
| Delete | `src/components/dashboard/PeriodTransactions.test.tsx`                                                      |

---

## Task 1: Add date-utility helpers

**Files:**

- Modify: `src/lib/dateUtils.ts`
- Create: `src/lib/dateUtils.test.ts`

- [ ] **Step 1: Create the failing test file**

Create `src/lib/dateUtils.test.ts` with this content:

```ts
import { describe, it, expect } from 'vitest';
import { getMondayOf, getWeekDays, isSameDay, isCurrentWeek, formatDayHeading } from './dateUtils';

describe('getMondayOf', () => {
  it('returns Monday when given a Wednesday', () => {
    const wed = new Date(2026, 4, 20); // May 20, 2026 is a Wednesday
    const monday = getMondayOf(wed);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(18);
  });

  it('returns the previous Monday when given a Sunday', () => {
    const sun = new Date(2026, 4, 24); // May 24, 2026 is a Sunday
    const monday = getMondayOf(sun);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(18);
  });

  it('returns the same day when given a Monday', () => {
    const mon = new Date(2026, 4, 18); // May 18, 2026 is a Monday
    const monday = getMondayOf(mon);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(18);
  });

  it('normalises time to midnight', () => {
    const d = new Date(2026, 4, 20, 15, 30, 0);
    const monday = getMondayOf(d);
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
  });
});

describe('getWeekDays', () => {
  it('returns 7 dates starting from the given Monday', () => {
    const monday = new Date(2026, 4, 18);
    const days = getWeekDays(monday);
    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(18);
    expect(days[6].getDate()).toBe(24);
  });

  it('returns dates in ascending order', () => {
    const monday = new Date(2026, 4, 18);
    const days = getWeekDays(monday);
    for (let i = 1; i < 7; i++) {
      expect(days[i].getTime()).toBeGreaterThan(days[i - 1].getTime());
    }
  });
});

describe('isSameDay', () => {
  it('returns true for same date at different times', () => {
    const a = new Date(2026, 4, 18, 9, 0);
    const b = new Date(2026, 4, 18, 22, 0);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for consecutive dates', () => {
    const a = new Date(2026, 4, 18);
    const b = new Date(2026, 4, 19);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('isCurrentWeek', () => {
  it("returns true for this week's Monday", () => {
    expect(isCurrentWeek(getMondayOf(new Date()))).toBe(true);
  });

  it("returns false for last week's Monday", () => {
    const lastMonday = getMondayOf(new Date());
    lastMonday.setDate(lastMonday.getDate() - 7);
    expect(isCurrentWeek(lastMonday)).toBe(false);
  });
});

describe('formatDayHeading', () => {
  it('includes weekday, day number, and month', () => {
    const d = new Date(2026, 4, 18); // Monday May 18
    const result = formatDayHeading(d);
    expect(result).toMatch(/Monday/);
    expect(result).toMatch(/18/);
    expect(result).toMatch(/May/);
  });
});
```

- [ ] **Step 2: Run tests — expect all 11 to fail**

```bash
npm run test -- dateUtils
```

Expected output: 11 tests fail with "is not a function" errors.

- [ ] **Step 3: Add the five helpers to `src/lib/dateUtils.ts`**

Append these five functions at the end of the file (after `todayStart`):

```ts
export function getMondayOf(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isCurrentWeek(monday: Date): boolean {
  return isSameDay(monday, getMondayOf(new Date()));
}

export function formatDayHeading(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
```

- [ ] **Step 4: Run tests — expect all 11 to pass**

```bash
npm run test -- dateUtils
```

Expected output: 11 tests pass, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/dateUtils.test.ts
git commit -m "feat: add getMondayOf, getWeekDays, isSameDay, isCurrentWeek, formatDayHeading to dateUtils"
```

---

## Task 2: Create DailyTransactions component (TDD)

**Files:**

- Create: `src/components/dashboard/DailyTransactions.tsx`
- Create: `src/components/dashboard/DailyTransactions.test.tsx`

- [ ] **Step 1: Create the failing test file**

Create `src/components/dashboard/DailyTransactions.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
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
    subCategory: '',
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

describe('DailyTransactions — date strip', () => {
  it('renders exactly 7 date tiles', () => {
    renderDT([]);
    const tiles = screen.getAllByRole('button', { pressed: /true|false/ });
    expect(tiles).toHaveLength(7);
  });

  it("today's tile is selected (aria-pressed=true) by default", () => {
    renderDT([]);
    const pressed = screen.getAllByRole('button', { pressed: true });
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent(new Date().getDate().toString());
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
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
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

  it('shows transactions for a different day after navigating to it', async () => {
    // Transaction is yesterday — navigate if needed (yesterday may be in current week)
    const yesterday = daysAgo(1);
    renderDT([makeTx('tx1', 'YesterdayVendor', -300, yesterday)]);

    // If yesterday is in the current week, click its tile directly
    const yesterdayNum = yesterday.getDate().toString();
    const tiles = screen.getAllByRole('button', { pressed: /true|false/ });
    const target = tiles.find(
      (b) => b.textContent?.includes(yesterdayNum) && b.getAttribute('aria-pressed') === 'false',
    );
    if (target) {
      await userEvent.click(target);
      expect(screen.getByText('YesterdayVendor')).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
npm run test -- DailyTransactions
```

Expected output: Tests fail with "Cannot find module './DailyTransactions'".

- [ ] **Step 3: Create `src/components/dashboard/DailyTransactions.tsx`**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import {
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatCurrency,
  formatTime,
  formatDayHeading,
} from '../../lib/dateUtils';

interface DailyTransactionsProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function DailyTransactions({
  transactions,
  currencySymbol,
  onDelete,
}: DailyTransactionsProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const weekDays = getWeekDays(weekStart);
  const onCurrentWeek = isCurrentWeek(weekStart);

  function dayOfWeekOffset(d: Date): number {
    return d.getDay() === 0 ? 6 : d.getDay() - 1;
  }

  function goToPrevWeek() {
    const newMonday = new Date(weekStart);
    newMonday.setDate(weekStart.getDate() - 7);
    setWeekStart(newMonday);
    const newSelected = new Date(newMonday);
    newSelected.setDate(newMonday.getDate() + dayOfWeekOffset(selectedDate));
    setSelectedDate(newSelected);
  }

  function goToNextWeek() {
    const newMonday = new Date(weekStart);
    newMonday.setDate(weekStart.getDate() + 7);
    setWeekStart(newMonday);
    if (isCurrentWeek(newMonday)) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setSelectedDate(d);
    } else {
      const newSelected = new Date(newMonday);
      newSelected.setDate(newMonday.getDate() + dayOfWeekOffset(selectedDate));
      setSelectedDate(newSelected);
    }
  }

  const dayTxns = transactions
    .filter((t) => isSameDay(t.date, selectedDate))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Transactions
        </h2>
        <Link
          to="/app/transactions"
          className="text-xs font-medium"
          style={{
            background: 'linear-gradient(135deg, rgb(150,191,13), #22c55e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          See all →
        </Link>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goToPrevWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-alt text-text-muted hover:bg-border text-sm font-bold flex-shrink-0"
          aria-label="Previous week"
        >
          ‹
        </button>

        <div className="flex gap-1.5 flex-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const hasTxns = transactions.some((t) => isSameDay(t.date, day));
            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
            const dayNum = day.getDate();

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                aria-label={`${dayName} ${dayNum}`}
                aria-pressed={isSelected}
                className={`flex flex-col items-center py-2 rounded-lg flex-1 min-w-0 ${
                  !isSelected ? 'bg-surface-alt border border-border' : ''
                }`}
                style={
                  isSelected
                    ? {
                        background: 'linear-gradient(135deg, rgb(150,191,13), #22c55e)',
                        boxShadow: '0 3px 12px rgba(150,191,13,0.45)',
                      }
                    : undefined
                }
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    isSelected ? 'text-white opacity-80' : 'text-text-muted'
                  }`}
                >
                  {dayName}
                </span>
                <span
                  className={`text-lg font-bold leading-tight mt-0.5 ${
                    isSelected ? 'text-white' : 'text-text'
                  }`}
                >
                  {dayNum}
                </span>
                <span
                  className="w-1 h-1 rounded-full mt-1"
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.75)' : '#22c55e',
                    visibility: hasTxns ? 'visible' : 'hidden',
                  }}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goToNextWeek}
          disabled={onCurrentWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-alt text-text-muted hover:bg-border text-sm font-bold flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      {/* Selected date heading */}
      <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
        {formatDayHeading(selectedDate)}
      </p>

      {/* Transaction list */}
      {dayTxns.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">No transactions for this day</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {dayTxns.map((tx) => {
            const isExpense = tx.amount < 0;
            return (
              <div key={tx.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl w-8 text-center flex-shrink-0">{tx.icon || '💸'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{tx.vendor}</p>
                  <p className="text-xs text-text-muted">
                    {tx.category} · {formatTime(tx.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-sm font-mono font-semibold ${
                      isExpense ? 'text-red-600' : 'text-brand'
                    }`}
                  >
                    {isExpense ? '−' : '+'}
                    {formatCurrency(Math.abs(tx.amount), currencySymbol)}
                  </span>
                  <Link
                    to={`/app/transactions/${tx.id}/edit`}
                    className="text-text-muted hover:text-brand p-1"
                    aria-label={`Edit ${tx.vendor}`}
                  >
                    ✏️
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    className="text-text-muted hover:text-red-600 p-1"
                    aria-label={`Delete ${tx.vendor}`}
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm run test -- DailyTransactions
```

Expected output: all tests pass.

- [ ] **Step 5: Run the full test suite to catch regressions**

```bash
npm run test
```

Expected output: all tests pass (PeriodTransactions tests still pass at this point — they'll be deleted in Task 3).

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx
git commit -m "feat: add DailyTransactions widget with weekly date-strip and green gradient"
```

---

## Task 3: Wire into Dashboard and remove old component

**Files:**

- Modify: `src/routes/Dashboard.tsx`
- Delete: `src/components/dashboard/PeriodTransactions.tsx`
- Delete: `src/components/dashboard/PeriodTransactions.test.tsx`

- [ ] **Step 1: Update `src/routes/Dashboard.tsx`**

Replace the import line:

```tsx
// Before
import PeriodTransactions from '../components/dashboard/PeriodTransactions';

// After
import DailyTransactions from '../components/dashboard/DailyTransactions';
```

Replace the JSX (inside the `col-span-2` div):

```tsx
// Before
<PeriodTransactions
  transactions={periodTxns}
  period={period}
  currencySymbol={currencySymbol}
  onDelete={(id) => setDeletingId(id)}
/>

// After
<DailyTransactions
  transactions={allTxns}
  currencySymbol={currencySymbol}
  onDelete={(id) => setDeletingId(id)}
/>
```

Note: `DailyTransactions` receives `allTxns` (the full 200-transaction fetch), not `periodTxns`. This lets the widget display transactions from any week the user navigates to, not just the currently selected dashboard period.

- [ ] **Step 2: Delete the old component files**

```bash
rm src/components/dashboard/PeriodTransactions.tsx
rm src/components/dashboard/PeriodTransactions.test.tsx
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected output: no errors.

- [ ] **Step 4: Run the full test suite**

```bash
npm run test
```

Expected output: all tests pass, no references to PeriodTransactions remain.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected output: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/Dashboard.tsx
git rm src/components/dashboard/PeriodTransactions.tsx src/components/dashboard/PeriodTransactions.test.tsx
git commit -m "feat: wire DailyTransactions into Dashboard, remove PeriodTransactions"
```

---

## Verification Checklist

After all tasks are complete, manually verify in the browser (`npm run dev`):

- [ ] Dashboard shows the Transactions widget with a 7-day strip (Mon–Sun of current week)
- [ ] Today's tile has the diagonal green gradient and drop shadow
- [ ] Unselected tiles have slate background and border
- [ ] Clicking a past tile updates the transaction list below
- [ ] A green dot appears under tiles that have transactions; absent for empty days
- [ ] The `‹` button steps back one week; date strip updates to previous Mon–Sun
- [ ] The `›` button is disabled on the current week
- [ ] After going back, `›` is enabled and stepping forward returns to current week, re-selecting today
- [ ] `See all →` link has the green gradient text and navigates to `/app/transactions`
- [ ] No pagination controls visible anywhere in the widget
- [ ] Deleting a transaction from the widget triggers the delete confirm dialog
