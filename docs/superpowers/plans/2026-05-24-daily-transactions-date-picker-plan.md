# Daily Transactions Calendar Date Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calendar icon button next to the "Today" button in the `DailyTransactions` widget that opens a popover month-grid picker; selecting a past/present date navigates the week strip to that date.

**Architecture:** Extend `MiniCalendar` with an optional `activeType='brand'` value that applies the amber brand gradient and disables future dates. `DailyTransactions` gains a `calendarOpen` boolean state, a ref for click-outside detection, and a `handleCalendarPick` handler that repositions the week strip.

**Tech Stack:** React (hooks), TypeScript strict, Tailwind CSS v4, Vitest + React Testing Library

---

## File Map

| File                                                  | Change                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/components/form/MiniCalendar.tsx`                | Make `activeType` optional (default `'brand'`); add future-date disabling when brand                    |
| `src/components/form/MiniCalendar.test.tsx`           | Add tests for brand default and future-date disabling                                                   |
| `src/components/dashboard/DailyTransactions.tsx`      | Add `calendarOpen` state, `calendarRef`, outside-click + Escape handlers, calendar icon button, popover |
| `src/components/dashboard/DailyTransactions.test.tsx` | Add tests for picker open/close/navigation                                                              |

---

## Task 1: Extend MiniCalendar — write failing tests first

**Files:**

- Test: `src/components/form/MiniCalendar.test.tsx`

- [ ] **Step 1: Add three failing tests to `MiniCalendar.test.tsx`**

Append inside the existing `describe('MiniCalendar', ...)` block (after the last `it` at line 51, before the closing `}`):

```tsx
it('omitting activeType applies the brand gradient to the selected day', () => {
  const { container } = render(<MiniCalendar value="2026-05-19" onChange={vi.fn()} />);
  const dayButtons = Array.from(container.querySelectorAll('button')).filter(
    (b) => !b.getAttribute('aria-label') && b.textContent === '19',
  );
  expect(dayButtons[0]!.getAttribute('style')).toContain('var(--brand-gradient)');
});

it('disables future dates when activeType is brand (default)', async () => {
  const user = userEvent.setup();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  render(<MiniCalendar value={todayStr} onChange={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: /next month/i }));
  const dayBtns = screen
    .getAllByRole('button')
    .filter((b) => !b.getAttribute('aria-label') && b.textContent === '15');
  expect(dayBtns[0]).toBeDisabled();
});

it('does NOT disable future dates when activeType is expense', async () => {
  const user = userEvent.setup();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  render(<MiniCalendar value={todayStr} onChange={vi.fn()} activeType="expense" />);
  await user.click(screen.getByRole('button', { name: /next month/i }));
  const dayBtns = screen
    .getAllByRole('button')
    .filter((b) => !b.getAttribute('aria-label') && b.textContent === '15');
  expect(dayBtns[0]).not.toBeDisabled();
});
```

- [ ] **Step 2: Run the new tests — verify they FAIL**

```bash
npm run test -- MiniCalendar.test
```

Expected: 3 failures — `activeType` is still required, no future-date disabling.

---

## Task 2: Implement MiniCalendar changes

**Files:**

- Modify: `src/components/form/MiniCalendar.tsx`

- [ ] **Step 3: Update the `MiniCalendarProps` interface** (line 3–7)

Replace:

```ts
interface MiniCalendarProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  activeType: 'expense' | 'income';
}
```

With:

```ts
interface MiniCalendarProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  activeType?: 'expense' | 'income' | 'brand';
}
```

- [ ] **Step 4: Set default and update gradient/shadow logic** (line 29)

Replace:

```ts
export default function MiniCalendar({ value, onChange, activeType }: MiniCalendarProps) {
```

With:

```ts
export default function MiniCalendar({ value, onChange, activeType = 'brand' }: MiniCalendarProps) {
```

- [ ] **Step 5: Update the gradient and shadow constants** (lines 52–57)

Replace:

```ts
const selGradient = activeType === 'expense' ? 'var(--expense-gradient)' : 'var(--brand-gradient)';
const selShadow =
  activeType === 'expense' ? '0 2px 6px rgba(220,38,38,0.28)' : '0 2px 6px rgba(34,197,94,0.28)';
```

With:

```ts
const selGradient = activeType === 'expense' ? 'var(--expense-gradient)' : 'var(--brand-gradient)';
const selShadow =
  activeType === 'expense'
    ? '0 2px 6px rgba(220,38,38,0.28)'
    : activeType === 'income'
      ? '0 2px 6px rgba(34,197,94,0.28)'
      : '0 2px 6px rgba(245,158,11,0.30)';

const disableFuture = activeType === 'brand';
```

- [ ] **Step 6: Add `isFuture` per day cell and apply disabled state** (inside the `days.map(...)` block, after the `const isSelected = ds === selectedStr;` line — around line 100)

After `const isSelected = ds === selectedStr;` add:

```ts
const isFuture = disableFuture && ds > todayStr;
```

Then replace the `<button>` element (lines 102–119) with:

```tsx
<button
  key={ds}
  type="button"
  onClick={() => onChange(ds)}
  disabled={isFuture}
  className="aspect-square flex items-center justify-center text-[11px] font-medium rounded-[6px] disabled:cursor-not-allowed"
  style={
    isFuture
      ? { color: '#cbd5e1', opacity: 0.4 }
      : isSelected
        ? { background: selGradient, color: '#fff', fontWeight: 700, boxShadow: selShadow }
        : isToday
          ? { background: '#f1f5f9', fontWeight: 700, color: '#475569' }
          : { color: isCurrentMonth ? '#0f172a' : '#cbd5e1' }
  }
>
  {d.getDate()}
</button>
```

- [ ] **Step 7: Run MiniCalendar tests — verify all pass**

```bash
npm run test -- MiniCalendar.test
```

Expected: all 7 tests pass (4 original + 3 new).

- [ ] **Step 8: Commit**

```bash
git add src/components/form/MiniCalendar.tsx src/components/form/MiniCalendar.test.tsx
git commit -m "feat: extend MiniCalendar with brand activeType and future-date disabling"
```

---

## Task 3: Add calendar picker to DailyTransactions — write failing tests first

**Files:**

- Test: `src/components/dashboard/DailyTransactions.test.tsx`

- [ ] **Step 9: Add a new `describe` block at the end of the test file**

Append after the last `describe` block (after line 301):

```tsx
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
```

- [ ] **Step 10: Run the new tests — verify they FAIL**

```bash
npm run test -- DailyTransactions.test
```

Expected: 4 failures — "Pick a date" button doesn't exist yet.

---

## Task 4: Implement the calendar picker in DailyTransactions

**Files:**

- Modify: `src/components/dashboard/DailyTransactions.tsx`

- [ ] **Step 11: Update React import to include `useRef` and `useEffect`** (line 1)

Replace:

```ts
import { useState } from 'react';
```

With:

```ts
import { useState, useRef, useEffect } from 'react';
```

- [ ] **Step 12: Add `localDateStr` to dateUtils imports and add MiniCalendar import** (lines 3–13)

After the existing dateUtils import block, add `localDateStr` to its named imports:

Replace:

```ts
import {
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatCurrency,
  formatTime,
  formatDayHeading,
  dayOfWeekOffset,
} from '../../lib/dateUtils';
```

With:

```ts
import {
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatCurrency,
  formatTime,
  formatDayHeading,
  dayOfWeekOffset,
  localDateStr,
} from '../../lib/dateUtils';
import MiniCalendar from '../form/MiniCalendar';
```

- [ ] **Step 13: Add `calendarOpen` state and `calendarRef` inside the component body** — add immediately after the existing `const [editingId, setEditingId] = useState<string | null>(null);` line (around line 36)

```ts
const [calendarOpen, setCalendarOpen] = useState(false);
const calendarRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 14: Add `handleCalendarPick` function** — add after the existing `goToNextWeek` function (around line 70)

```ts
function handleCalendarPick(dateStr: string) {
  const picked = new Date(dateStr + 'T00:00:00');
  setWeekStart(getMondayOf(picked));
  setSelectedDate(picked);
  setCalendarOpen(false);
}
```

- [ ] **Step 15: Add outside-click and Escape-key effect** — add after `handleCalendarPick`

```ts
useEffect(() => {
  if (!calendarOpen) return;
  function handleClick(e: MouseEvent) {
    if (!calendarRef.current?.contains(e.target as Node)) setCalendarOpen(false);
  }
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') setCalendarOpen(false);
  }
  document.addEventListener('mousedown', handleClick);
  document.addEventListener('keydown', handleKey);
  return () => {
    document.removeEventListener('mousedown', handleClick);
    document.removeEventListener('keydown', handleKey);
  };
}, [calendarOpen]);
```

- [ ] **Step 16: Replace the left header group** — in the JSX, replace the existing `<div className="flex items-center gap-2">` that contains the Transactions heading and Today button (lines 83–101) with:

```tsx
<div className="flex items-center gap-2">
  <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">Transactions</h2>
  <button
    type="button"
    aria-pressed={isToday}
    onClick={isToday ? undefined : goToToday}
    className={[
      'rounded-md px-2 py-0.5 text-xs font-semibold transition-all',
      isToday ? 'text-white' : 'border border-border bg-surface text-text-muted hover:text-text',
    ].join(' ')}
    style={isToday ? { background: 'var(--brand-gradient)' } : undefined}
  >
    Today
  </button>
  <div ref={calendarRef} className="relative">
    <button
      type="button"
      aria-label="Pick a date"
      aria-expanded={calendarOpen}
      onClick={() => setCalendarOpen((o) => !o)}
      className="p-0.5 rounded text-text-muted hover:text-brand transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </button>
    {calendarOpen && (
      <div className="absolute left-0 top-full mt-1 z-50 bg-surface rounded-xl border border-border shadow-lg p-3 w-64">
        <MiniCalendar value={localDateStr(selectedDate)} onChange={handleCalendarPick} />
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 17: Run all DailyTransactions tests — verify all pass**

```bash
npm run test -- DailyTransactions.test
```

Expected: all tests pass (existing suite + 4 new).

- [ ] **Step 18: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 19: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 20: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx
git commit -m "feat: add calendar date picker popover to DailyTransactions widget"
```

---

## Task 5: Smoke-test in the browser

- [ ] **Step 21: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173`, sign in, go to the Dashboard.

Verify:

- A small calendar icon appears to the right of the "Today" button in the Transactions widget
- Clicking the icon opens a month-grid popover
- Future dates (next month's grid) are grayed and unclickable
- Clicking a past date closes the popover, moves the week strip to that week, and highlights the selected day
- The "Next week" button is enabled after picking a past week
- Clicking the "Today" button returns to the current day
- Pressing Escape while the popover is open closes it
- Clicking outside the popover closes it
