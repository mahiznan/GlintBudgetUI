# DailyTransactions Slide Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a direction-aware, three-panel sliding carousel to the `DailyTransactions` widget so navigating between days and weeks feels instant and smooth — adjacent day content is always pre-rendered off-screen.

**Architecture:** Wrap the content area (day heading + expense total + transaction list) in a clipping container holding a flex track with three panels (left / center / right). All data is already in memory from the `transactions` prop. A single `navigateTo(targetDate)` function replaces all existing navigation handlers; it pre-loads the destination panel, updates the week strip and selected-day highlight immediately, then starts the CSS transition. After `transitionend`, the track snaps back and panel state settles.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, pure CSS `transform` transitions (no new dependencies), Vitest + React Testing Library.

---

### Task 1: Add `dayOffset` to `src/lib/dateUtils.ts`

**Files:**
- Modify: `src/lib/dateUtils.ts`
- Modify: `src/lib/dateUtils.test.ts`

- [ ] **Step 1: Add failing tests for `dayOffset` to `src/lib/dateUtils.test.ts`**

Add `dayOffset` to the import list at the top of `src/lib/dateUtils.test.ts`:

```typescript
import {
  getPeriodRange,
  getChartDateRange,
  formatCurrency,
  groupByDay,
  groupByMonth,
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatDayHeading,
  dayOfWeekOffset,
  shiftPeriodDate,
  getPeriodLabel,
  dayOffset,
} from './dateUtils';
```

Then add this describe block at the end of the file:

```typescript
describe('dayOffset', () => {
  it('adds positive days', () => {
    const base = new Date('2026-05-20T00:00:00');
    const result = dayOffset(base, 3);
    expect(result.getDate()).toBe(23);
    expect(result.getMonth()).toBe(4); // May = 4
    expect(result.getFullYear()).toBe(2026);
  });

  it('subtracts negative days', () => {
    const base = new Date('2026-05-20T00:00:00');
    const result = dayOffset(base, -2);
    expect(result.getDate()).toBe(18);
  });

  it('does not mutate the original date', () => {
    const base = new Date('2026-05-20T00:00:00');
    dayOffset(base, 5);
    expect(base.getDate()).toBe(20);
  });

  it('handles month boundary', () => {
    const base = new Date('2026-05-31T00:00:00');
    const result = dayOffset(base, 1);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(5); // June
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test -- src/lib/dateUtils.test.ts
```

Expected: FAIL — `dayOffset is not exported from './dateUtils'`.

- [ ] **Step 3: Implement `dayOffset` in `src/lib/dateUtils.ts`**

Add after the `dayOfWeekOffset` function (line ~237):

```typescript
export function dayOffset(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test -- src/lib/dateUtils.test.ts
```

Expected: all tests pass (4 new + all existing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/dateUtils.test.ts
git commit -m "feat: add dayOffset utility to dateUtils"
```

---

### Task 2: Extract `DayPanel` internal component

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`

Pull the day heading + expense total + transaction list out of `DailyTransactions` into an internal (non-exported) `DayPanel` component. All existing tests must still pass — this is a pure refactor.

- [ ] **Step 1: Confirm all tests pass before touching anything**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: all pass.

- [ ] **Step 2: Add the `DayPanel` component to `DailyTransactions.tsx`**

Add `dayOffset` to the existing `dateUtils` import:

```typescript
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
  dayOffset,
} from '../../lib/dateUtils';
```

Add this entire block **above** `export default function DailyTransactions`:

```tsx
interface DayPanelProps {
  date: Date;
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function DayPanel({ date, transactions, currencySymbol, onDelete, onEdit }: DayPanelProps) {
  const dayTxns = transactions
    .filter((t) => isSameDay(t.date, date))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const dayExpenses = dayTxns
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
          {formatDayHeading(date)}
        </p>
        <span className="text-sm font-bold font-mono text-red-600">
          −{formatCurrency(dayExpenses, currencySymbol)}
        </span>
      </div>
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
                  <button
                    type="button"
                    onClick={() => onEdit(tx.id)}
                    className="text-text-muted hover:text-brand p-1"
                    aria-label={`Edit ${tx.vendor}`}
                  >
                    ✏️
                  </button>
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

- [ ] **Step 3: Replace the inline content in `DailyTransactions` with `<DayPanel>`**

In `DailyTransactions`, locate the comment `{/* Selected date heading + daily expense total */}` through the end of the transaction list (the `</div>` that closes the `flex flex-col divide-y` block). This spans roughly lines 249–305. Replace the entire block with:

```tsx
<DayPanel
  date={selectedDate}
  transactions={transactions}
  currencySymbol={currencySymbol}
  onDelete={onDelete}
  onEdit={(id) => { setEditingId(id); setDrawerOpen(true); }}
/>
```

Also delete the now-unused `dayTxns` and `dayExpenses` variables from the `DailyTransactions` body (they were computed around lines 99–105).

- [ ] **Step 4: Run tests to confirm no regressions**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx
git commit -m "refactor: extract DayPanel internal component in DailyTransactions"
```

---

### Task 3: Add carousel state and `navigateTo`

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`
- Modify: `src/components/dashboard/DailyTransactions.test.tsx`

Add `panels`, `sliding`, `trackRef`, and the `navigateTo` + `onTransitionEnd` functions. Replace all existing navigation handlers. For now the JSX keeps a single-panel wrapper with `data-testid="carousel-track"` — the full three-panel layout comes in Task 4.

- [ ] **Step 1: Write failing tests for the new carousel behaviour**

Add `fireEvent` to the existing import in `DailyTransactions.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
```

Add this helper function and describe block at the bottom of `DailyTransactions.test.tsx`:

```typescript
// Simulates CSS transitionend so the carousel commits its state.
// jsdom doesn't run CSS transitions, so tests must call this manually.
function settleAnimation(container: HTMLElement) {
  const track = container.querySelector('[data-testid="carousel-track"]');
  if (track) fireEvent.transitionEnd(track);
}

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
});
```

- [ ] **Step 2: Run to confirm these tests fail**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx --reporter=verbose 2>&1 | tail -30
```

Expected: new animation tests fail — `carousel-track` not found.

- [ ] **Step 3: Add carousel state to `DailyTransactions.tsx`**

In the component body, add after `const calendarRef = useRef<HTMLDivElement>(null);`:

```typescript
const [panels, setPanels] = useState<{ left: Date; center: Date; right: Date }>(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    left: dayOffset(today, -1),
    center: today,
    right: dayOffset(today, +1),
  };
});
const [sliding, setSliding] = useState<'left' | 'right' | null>(null);
const trackRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 4: Add `navigateTo` and `onTransitionEnd`, replace old handlers**

Replace the existing `goToToday`, `goToPrevWeek`, and `goToNextWeek` function definitions with the following:

```typescript
function navigateTo(targetDate: Date) {
  if (sliding !== null) return;
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  if (isSameDay(target, panels.center)) return;
  const dir: 'left' | 'right' = target > panels.center ? 'left' : 'right';
  setPanels(prev => ({
    ...prev,
    [dir === 'left' ? 'right' : 'left']: target,
  }));
  setWeekStart(getMondayOf(target));
  setSelectedDate(target);
  setSliding(dir);
}

function goToToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  navigateTo(today);
}

function goToPrevWeek() {
  const newMonday = new Date(weekStart);
  newMonday.setDate(weekStart.getDate() - 7);
  const sunday = getWeekDays(newMonday)[6]!;
  navigateTo(sunday);
}

function goToNextWeek() {
  const newMonday = new Date(weekStart);
  newMonday.setDate(weekStart.getDate() + 7);
  let target: Date;
  if (isCurrentWeek(newMonday)) {
    target = new Date();
    target.setHours(0, 0, 0, 0);
  } else {
    target = new Date(newMonday);
    target.setDate(newMonday.getDate() + dayOfWeekOffset(selectedDate));
  }
  navigateTo(target);
}

function onTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
  if (e.target !== trackRef.current) return;
  if (sliding === null) return;
  const committed = sliding === 'left' ? panels.right : panels.left;
  const track = trackRef.current;
  track.style.transition = 'none';
  setPanels({
    left: dayOffset(committed, -1),
    center: committed,
    right: dayOffset(committed, +1),
  });
  setSliding(null);
  requestAnimationFrame(() => {
    if (track) track.style.transition = '';
  });
}
```

Update `handleCalendarPick` to call `navigateTo`:

```typescript
function handleCalendarPick(dateStr: string) {
  navigateTo(new Date(dateStr + 'T00:00:00'));
  setCalendarOpen(false);
}
```

Update each day-pill `onClick` in the week strip (the `onClick` on the pill button):

```tsx
onClick={() => navigateTo(day)}
```

(Replaces `onClick={() => setSelectedDate(day)}`.)

- [ ] **Step 5: Wrap `<DayPanel>` in the carousel track stub**

Replace:

```tsx
<DayPanel
  date={selectedDate}
  transactions={transactions}
  currencySymbol={currencySymbol}
  onDelete={onDelete}
  onEdit={(id) => { setEditingId(id); setDrawerOpen(true); }}
/>
```

With:

```tsx
<div className="overflow-hidden">
  <div
    data-testid="carousel-track"
    ref={trackRef}
    onTransitionEnd={onTransitionEnd}
  >
    <DayPanel
      date={panels.center}
      transactions={transactions}
      currencySymbol={currencySymbol}
      onDelete={onDelete}
      onEdit={(id) => { setEditingId(id); setDrawerOpen(true); }}
    />
  </div>
</div>
```

Note: `DayPanel` now uses `panels.center` (not `selectedDate`) as its date prop.

- [ ] **Step 6: Update the existing "shows transactions for a different day" test**

In `DailyTransactions.test.tsx`, find the test `'shows transactions for a different day after navigating to it'` inside `describe('DailyTransactions — week navigation', ...)`. Add `settleAnimation(container)` before the final assertion so it works with the single-panel stub (Task 3) and continues to work with the full carousel (Task 4):

```typescript
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
```

- [ ] **Step 7: Run all tests**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: all tests pass — both existing and the four new animation tests.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx
git commit -m "feat: add carousel state and navigateTo to DailyTransactions"
```

---

### Task 4: Replace stub with full three-panel carousel JSX

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`

Expand the single-panel stub from Task 3 into the full sliding three-panel track with CSS transitions.

- [ ] **Step 1: Confirm all tests pass**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: all pass.

- [ ] **Step 2: Replace the carousel stub with the three-panel track**

Locate the `overflow-hidden` wrapper added in Task 3 and replace its entire content:

```tsx
<div className="overflow-hidden">
  <div
    data-testid="carousel-track"
    ref={trackRef}
    className="flex w-[300%] will-change-transform"
    style={{
      transform:
        sliding === 'left'
          ? 'translateX(-66.66%)'
          : sliding === 'right'
          ? 'translateX(0%)'
          : 'translateX(-33.33%)',
      transition: sliding ? 'transform 280ms ease' : 'none',
    }}
    onTransitionEnd={onTransitionEnd}
  >
    {(['left', 'center', 'right'] as const).map((slot) => (
      <div key={slot} className="w-1/3 min-w-0">
        <DayPanel
          date={panels[slot]}
          transactions={transactions}
          currencySymbol={currencySymbol}
          onDelete={onDelete}
          onEdit={(id) => { setEditingId(id); setDrawerOpen(true); }}
        />
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Run all tests**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx
git commit -m "feat: implement three-panel sliding carousel in DailyTransactions"
```

---

### Task 5: Browser verification

**Files:** none

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. Sign in and go to the Dashboard.

- [ ] **Step 2: Verify week arrow navigation**

Click ‹ (previous week). The content panel (day heading + expense total + transaction list) should slide in from the left as the old content exits to the right. The week strip updates instantly.

Click › (next week). Content slides in from the right.

- [ ] **Step 3: Verify day pill navigation**

Within the visible week, click a day tile earlier than the current selection — content slides right (going back in time). Click a later day — content slides left (going forward).

- [ ] **Step 4: Verify rapid-click protection**

Click ‹ several times quickly. Only the first animation should fire; the widget should not stutter or skip multiple weeks.

- [ ] **Step 5: Verify Today button and calendar picker**

Navigate to a past week. Click "Today" — content slides left (forward in time). Open the calendar picker (📅), pick a past date — content slides right.

- [ ] **Step 6: Verify no layout overflow**

Resize the browser to a narrow viewport (~375 px). The carousel must not create horizontal page scroll. The content area should clip cleanly.

- [ ] **Step 7: Run full test suite and commit**

```bash
npm run test
```

Expected: all tests pass with no regressions in other components.

```bash
git add -p   # stage only if any fixup was needed
git commit -m "chore: browser-verified slide animation in DailyTransactions"
```

If no changes were needed, skip the commit.
