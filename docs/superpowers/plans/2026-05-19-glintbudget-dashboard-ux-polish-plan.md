# GlintBudget Dashboard UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 7 UX improvements to the Dashboard and shell: personalised greeting, relocated Add Transaction button, right-aligned period switcher, sidebar logout, smarter week-navigation default, Today shortcut, and per-day expense summary.

**Architecture:** All changes are contained to four files: `AppShell.tsx`, `TopBar.tsx`, `Sidebar.tsx`, and `DailyTransactions.tsx`. No new files are created, no new context or hooks are needed. Each task is independent and can be reviewed separately.

**Tech Stack:** React + TypeScript strict, React Router v7, Firebase Auth, Tailwind CSS v4, Vitest + RTL

**Spec:** `docs/superpowers/specs/2026-05-19-glintbudget-dashboard-ux-polish-design.md`

---

## File Map

**Modify:**
- `src/routes/AppShell.tsx` — extract firstName from auth.user.name; use it as title for /app/dashboard
- `src/routes/AppShell.test.tsx` — update greeting assertion
- `src/components/layout/TopBar.tsx` — remove Add Transaction link
- `src/components/layout/TopBar.test.tsx` — remove assertion for Add Transaction link
- `src/components/layout/Sidebar.tsx` — add Sign out button (navigate + signOutCurrentUser)
- `src/components/layout/Sidebar.test.tsx` — add Sign out button tests
- `src/components/dashboard/DailyTransactions.tsx` — Today button, goToPrevWeek fix, Add link, expense sum
- `src/components/dashboard/DailyTransactions.test.tsx` — tests for all four DailyTransactions changes

---

## Task 1: AppShell — Personalised Greeting

**Files:**
- Modify: `src/routes/AppShell.tsx`
- Modify: `src/routes/AppShell.test.tsx`

The `getTitle` helper is module-level and doesn't know the user's name. Instead of changing its signature, `AppShell` will compute the dashboard title inline and pass it directly.

- [ ] **Step 1: Update the greeting assertion in `src/routes/AppShell.test.tsx`**

The existing `authedCtx` already has `name: 'Rajesh M'`. Add one test verifying the greeting (first word of name), and note that the existing "Dashboard" title test is replaced. Find the existing `AppShell.test.tsx` content at `src/routes/AppShell.test.tsx`. Add this test inside `describe('AppShell title map', ...)`:

```tsx
it('shows personalised greeting on /app/dashboard', () => {
  render(
    <AuthContext.Provider value={authedCtx}>
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <AppShell />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  expect(screen.getByRole('heading', { name: /hello, rajesh/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/routes/AppShell.test.tsx
```

Expected: FAIL — "Unable to find role 'heading' with name /hello, rajesh/i"

- [ ] **Step 3: Update `src/routes/AppShell.tsx`**

Replace the entire file with:

```tsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { Period } from '../lib/dateUtils';
import { useAuth } from '../auth/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';

export interface AppShellOutletContext {
  period: Period;
  setPeriod: (p: Period) => void;
}

const TITLE_MAP: Record<string, string> = {
  '/app/transactions': 'Transactions',
  '/app/transactions/new': 'New Transaction',
  '/app/settings': 'Settings',
};

function getTitle(pathname: string, firstName: string): string {
  if (pathname.endsWith('/edit')) return 'Edit Transaction';
  if (pathname === '/app/dashboard') return `Hello, ${firstName}`;
  return TITLE_MAP[pathname] ?? 'GlintBudget';
}

export default function AppShell() {
  const auth = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const location = useLocation();

  if (auth.status !== 'authenticated') return null;

  const firstName = auth.user.name?.split(' ')[0] ?? 'there';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar
          title={getTitle(location.pathname, firstName)}
          period={period}
          onPeriodChange={setPeriod}
          showPeriodSwitch={location.pathname === '/app/dashboard'}
        />
        <main className="flex-1 overflow-y-auto bg-surface-alt">
          <Outlet context={{ period, setPeriod } satisfies AppShellOutletContext} />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/routes/AppShell.test.tsx
```

Expected: All tests pass

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/routes/AppShell.tsx src/routes/AppShell.test.tsx
git commit -m "feat: personalised greeting in dashboard TopBar"
```

---

## Task 2: TopBar — Remove Add Transaction Button

**Files:**
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/components/layout/TopBar.test.tsx`

The Add Transaction button moves to the DailyTransactions widget (Task 4). TopBar now shows: title (left) | period switcher (right, via `justify-between`). No other changes needed — `justify-between` already pushes whatever is on the right to the end.

- [ ] **Step 1: Update `src/components/layout/TopBar.test.tsx`**

Remove the test that asserts the Add Transaction link is present. Replace it with one asserting it is **absent**. Find this test in `TopBar.test.tsx`:

```tsx
it('renders + Add Transaction link regardless of showPeriodSwitch', () => {
  render(
    <MemoryRouter>
      <TopBar title="Transactions" period="month" onPeriodChange={vi.fn()} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: /add transaction/i })).toBeInTheDocument();
});
```

Replace it with:

```tsx
it('does not render Add Transaction link', () => {
  render(
    <MemoryRouter>
      <TopBar title="Dashboard" period="month" onPeriodChange={vi.fn()} />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('link', { name: /add transaction/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/components/layout/TopBar.test.tsx
```

Expected: FAIL — "Expected: not in document, Received: in document"

- [ ] **Step 3: Update `src/components/layout/TopBar.tsx`**

Replace the entire file with:

```tsx
import type { Period } from '../../lib/dateUtils';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

interface TopBarProps {
  title: string;
  period: Period;
  onPeriodChange: (p: Period) => void;
  showPeriodSwitch?: boolean;
}

export default function TopBar({ title, period, onPeriodChange, showPeriodSwitch = false }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/50 bg-white/75 backdrop-blur-md px-6 py-3">
      <h1 className="text-lg font-semibold text-text">{title}</h1>

      {showPeriodSwitch && (
        <div className="flex items-center rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5">
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                period === value
                  ? 'text-white shadow-sm'
                  : 'text-text-muted hover:text-text',
              ].join(' ')}
              style={
                period === value
                  ? { background: 'var(--brand-gradient)' }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/components/layout/TopBar.test.tsx
```

Expected: All tests pass

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/TopBar.tsx src/components/layout/TopBar.test.tsx
git commit -m "refactor: remove Add Transaction from TopBar"
```

---

## Task 3: Sidebar — Logout Button

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Sidebar.test.tsx`

The Sign out button calls `navigate('/')` first (so the router lands on the landing page before Firebase's `onAuthStateChanged` fires), then `signOutCurrentUser()`.

- [ ] **Step 1: Update `src/components/layout/Sidebar.test.tsx`**

The existing test file already mocks `../../firebase/auth`. Add these tests to the bottom of the file (inside the existing `describe('Sidebar', ...)`):

```tsx
it('renders a Sign out button', () => {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
  expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
});

it('calls signOutCurrentUser when Sign out is clicked', async () => {
  const { signOutCurrentUser } = await import('../../firebase/auth');
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
  expect(signOutCurrentUser).toHaveBeenCalled();
});
```

Also add the `userEvent` import at the top of the test file (after the existing imports):

```tsx
import userEvent from '@testing-library/user-event';
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/components/layout/Sidebar.test.tsx
```

Expected: FAIL — "Unable to find role 'button' with name /sign out/i"

- [ ] **Step 3: Update `src/components/layout/Sidebar.tsx`**

Replace the entire file with:

```tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { signOutCurrentUser } from '../../firebase/auth';

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: '◈', to: '/app/dashboard'    },
  { label: 'Transactions', icon: '⇌', to: '/app/transactions' },
  { label: 'Settings',     icon: '⚙', to: '/app/settings'     },
];

export default function Sidebar() {
  const navigate = useNavigate();

  async function handleSignOut() {
    navigate('/');
    await signOutCurrentUser();
  }

  return (
    <aside
      className="flex h-screen w-[220px] flex-shrink-0 flex-col py-6"
      style={{
        background: 'var(--sidebar-gradient)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient radial blobs */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(150,191,13,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 80, left: -30, width: 120, height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(31,163,46,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Wordmark */}
      <div className="mb-8 px-5">
        <span className="text-xl font-bold tracking-tight text-white">
          <span aria-hidden="true" style={{ color: '#96bf0d' }}>●</span>{' '}
          GlintBudget
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <span aria-hidden="true" className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white border border-white/20"
        >
          <span aria-hidden="true" className="text-base">⎋</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/components/layout/Sidebar.test.tsx
```

Expected: All tests pass

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Sidebar.test.tsx
git commit -m "feat: add Sign out button to Sidebar, navigate to landing on logout"
```

---

## Task 4: DailyTransactions — goToPrevWeek Selects Sunday

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`
- Modify: `src/components/dashboard/DailyTransactions.test.tsx`

When navigating to a previous week, `selectedDate` should default to Sunday (index 6 of the Mon-based week array) rather than the same weekday.

- [ ] **Step 1: Add failing test to `src/components/dashboard/DailyTransactions.test.tsx`**

Add inside `describe('DailyTransactions — week navigation', ...)`:

```tsx
it('selects Sunday when navigating to a previous week', async () => {
  renderDT([]);
  await userEvent.click(screen.getByRole('button', { name: /previous week/i }));
  // Sunday tile should now be selected (aria-pressed=true)
  const pressedTiles = screen.getAllByRole('button', { pressed: true });
  expect(pressedTiles).toHaveLength(1);
  // The pressed tile should be the 7th day (Sunday) — verify via aria-label
  expect(pressedTiles[0]).toHaveAccessibleName(/sun/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: FAIL — pressed tile is not Sunday

- [ ] **Step 3: Update `goToPrevWeek` in `src/components/dashboard/DailyTransactions.tsx`**

Find and replace only the `goToPrevWeek` function:

```tsx
// Before
function goToPrevWeek() {
  const newMonday = new Date(weekStart);
  newMonday.setDate(weekStart.getDate() - 7);
  setWeekStart(newMonday);
  const newSelected = new Date(newMonday);
  newSelected.setDate(newMonday.getDate() + dayOfWeekOffset(selectedDate));
  setSelectedDate(newSelected);
}

// After
function goToPrevWeek() {
  const newMonday = new Date(weekStart);
  newMonday.setDate(weekStart.getDate() - 7);
  setWeekStart(newMonday);
  const sunday = getWeekDays(newMonday)[6]!;
  setSelectedDate(sunday);
}
```

Note: `dayOfWeekOffset` import is no longer used after this change. Remove it from the import at the top of the file:

```tsx
// Before
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

// After
import {
  getMondayOf,
  getWeekDays,
  isSameDay,
  isCurrentWeek,
  formatCurrency,
  formatTime,
  formatDayHeading,
} from '../../lib/dateUtils';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: All tests pass

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx
git commit -m "fix: goToPrevWeek defaults to Sunday of the target week"
```

---

## Task 5: DailyTransactions — Today Button

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`
- Modify: `src/components/dashboard/DailyTransactions.test.tsx`

A "Today" button in the widget header. Filled (brand gradient) when the selected date is today; outline when it is not. Clicking the outline state resets to today's week and today's date.

- [ ] **Step 1: Add failing tests to `src/components/dashboard/DailyTransactions.test.tsx`**

Also update the existing test `"today's tile is selected (aria-pressed=true) by default"` — after adding the Today button (which also uses `aria-pressed`), there will be 2 pressed buttons when viewing today. Change:

```tsx
// Before
it("today's tile is selected (aria-pressed=true) by default", () => {
  renderDT([]);
  const pressed = screen.getAllByRole('button', { pressed: true });
  expect(pressed).toHaveLength(1);
  expect(pressed[0]).toHaveTextContent(new Date().getDate().toString());
});

// After
it("today's tile is selected (aria-pressed=true) by default", () => {
  renderDT([]);
  // Both the Today button and today's date tile have aria-pressed=true
  const pressed = screen.getAllByRole('button', { pressed: true });
  expect(pressed).toHaveLength(2);
  // The date tile (not the Today button) contains today's date number
  const todayNum = new Date().getDate().toString();
  expect(pressed.some((b) => b.textContent?.includes(todayNum))).toBe(true);
});
```

Then add a new describe block after the existing ones:

```tsx
describe('DailyTransactions — Today button', () => {
  it('Today button is present', () => {
    renderDT([]);
    expect(screen.getByRole('button', { name: /^today$/i })).toBeInTheDocument();
  });

  it('Today button has filled style when viewing today', () => {
    renderDT([]);
    const btn = screen.getByRole('button', { name: /^today$/i });
    // filled state indicated by aria-pressed=true
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: FAIL — "Unable to find role 'button' with name /^today$/i"

- [ ] **Step 3: Add Today button to `src/components/dashboard/DailyTransactions.tsx`**

In the component body, add the `isToday` derived value and `goToToday` handler right after the existing state declarations:

```tsx
const isToday = isSameDay(selectedDate, new Date());

function goToToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  setWeekStart(getMondayOf(today));
  setSelectedDate(today);
}
```

Then replace the widget header JSX. Find:

```tsx
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Transactions
        </h2>
        <Link
          to="/app/transactions"
          className="text-xs font-medium"
          style={{
            background: 'var(--brand-gradient-text)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          See all →
        </Link>
      </div>
```

Replace with:

```tsx
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
            Transactions
          </h2>
          <button
            type="button"
            aria-pressed={isToday}
            onClick={isToday ? undefined : goToToday}
            className={[
              'rounded-md px-2 py-0.5 text-xs font-semibold transition-all',
              isToday
                ? 'text-white'
                : 'border border-border bg-surface text-text-muted hover:text-text',
            ].join(' ')}
            style={isToday ? { background: 'var(--brand-gradient)' } : undefined}
          >
            Today
          </button>
        </div>
        <Link
          to="/app/transactions"
          className="text-xs font-medium"
          style={{
            background: 'var(--brand-gradient-text)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          See all →
        </Link>
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx
git commit -m "feat: add Today button to DailyTransactions widget"
```

---

## Task 6: DailyTransactions — Add Transaction Link

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`
- Modify: `src/components/dashboard/DailyTransactions.test.tsx`

A `+ Add` link navigates to `/app/transactions/new`. It lives in the header right side, next to "See all →".

- [ ] **Step 1: Add failing test to `src/components/dashboard/DailyTransactions.test.tsx`**

Add inside `describe('DailyTransactions — date strip', ...)` or in a new block:

```tsx
describe('DailyTransactions — Add link', () => {
  it('renders an Add link pointing to /app/transactions/new', () => {
    renderDT([]);
    const link = screen.getByRole('link', { name: /add/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/transactions/new');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: FAIL — "Unable to find role 'link' with name /add/i"

- [ ] **Step 3: Add the + Add link to the header in `src/components/dashboard/DailyTransactions.tsx`**

Find the right side of the header (currently just the "See all →" link) and replace it:

```tsx
        <Link
          to="/app/transactions"
          className="text-xs font-medium"
          style={{
            background: 'var(--brand-gradient-text)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          See all →
        </Link>
```

Replace with:

```tsx
        <div className="flex items-center gap-2">
          <Link
            to="/app/transactions"
            className="text-xs font-medium"
            style={{
              background: 'var(--brand-gradient-text)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            See all →
          </Link>
          <Link
            to="/app/transactions/new"
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-gradient)' }}
            aria-label="Add transaction"
          >
            + Add
          </Link>
        </div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx
git commit -m "feat: move Add Transaction button into DailyTransactions widget"
```

---

## Task 7: DailyTransactions — Expense Sum Row

**Files:**
- Modify: `src/components/dashboard/DailyTransactions.tsx`
- Modify: `src/components/dashboard/DailyTransactions.test.tsx`

A summary row between the date strip and the first transaction. Shows total expenses for the selected day. Label adapts: "Today's expenses" vs "Fri 9 expenses".

- [ ] **Step 1: Add failing tests to `src/components/dashboard/DailyTransactions.test.tsx`**

Add a new describe block:

```tsx
describe('DailyTransactions — expense sum', () => {
  it('shows "Today\'s expenses" label when viewing today', () => {
    renderDT([]);
    expect(screen.getByText(/today's expenses/i)).toBeInTheDocument();
  });

  it('shows zero sum when no expense transactions exist', () => {
    renderDT([]);
    expect(screen.getByText(/₹0\.00/)).toBeInTheDocument();
  });

  it('shows correct expense sum for today\'s transactions', () => {
    renderDT([
      makeTx('t1', 'Swiggy', -450, todayAt(12)),
      makeTx('t2', 'Ola', -280, todayAt(9)),
    ]);
    // Sum: 450 + 280 = 730
    expect(screen.getByText(/₹730\.00/)).toBeInTheDocument();
  });

  it('excludes income transactions from the sum', () => {
    renderDT([
      makeTx('t1', 'Salary', 50000, todayAt(10)),
      makeTx('t2', 'Coffee', -200, todayAt(11)),
    ]);
    expect(screen.getByText(/₹200\.00/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: FAIL — "Unable to find text /today's expenses/i"

- [ ] **Step 3: Add expense sum to `src/components/dashboard/DailyTransactions.tsx`**

In the component body, add the derived values after `dayTxns`:

```tsx
const dayExpenses = dayTxns
  .filter((t) => t.amount < 0)
  .reduce((s, t) => s + Math.abs(t.amount), 0);

const expenseLabel = isToday
  ? "Today's expenses"
  : `${selectedDate.toLocaleDateString('en-US', { weekday: 'short' })} ${selectedDate.getDate()} expenses`;
```

Then add the expense sum row in the JSX, between the date strip `</div>` and the `{/* Selected date heading */}` comment. Find:

```tsx
      {/* Selected date heading */}
      <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
        {formatDayHeading(selectedDate)}
      </p>
```

Insert the expense sum row just before it:

```tsx
      {/* Expense sum */}
      <div className="flex items-center justify-between border-b border-border pb-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          {expenseLabel}
        </span>
        <span className="text-sm font-bold text-red-600">
          −{formatCurrency(dayExpenses, currencySymbol)}
        </span>
      </div>

      {/* Selected date heading */}
      <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
        {formatDayHeading(selectedDate)}
      </p>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/components/dashboard/DailyTransactions.test.tsx
```

Expected: All tests pass

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 6: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/DailyTransactions.tsx src/components/dashboard/DailyTransactions.test.tsx
git commit -m "feat: add daily expense sum row to DailyTransactions widget"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: All test files pass (count ≥ 83 files, ≥ 319 tests)

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No TypeScript errors

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No lint errors

- [ ] **Step 4: Production build**

```bash
npm run build
```

Expected: Build succeeds with no errors
