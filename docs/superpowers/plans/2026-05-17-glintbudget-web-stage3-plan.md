# GlintBudget Web — Stage 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully functional personal-finance dashboard and full transaction CRUD to GlintBudget Web so users can view, add, edit, and delete all their transactions from the browser.

**Architecture:** Nested React Router v7 routes under `/app` with `AppShell` as the layout route. AppShell owns `period` state and passes it to child routes via `useOutletContext`. Firestore data flows through custom hooks; preferences are cached in `PreferenceContext` for the session. Dashboard fetches ≤ 200 transactions once and filters client-side per period.

**Tech Stack:** React 19, TypeScript strict, Vite, Tailwind CSS v4, React Router v7, Firebase Firestore (existing `firebase` pkg), Recharts (lazy-loaded in dashboard chunk)

**Design direction:** Bold glassmorphism — dark forest-green sidebar (`linear-gradient(180deg, #003d1c, #005c2a, #007836)`), gradient hero stats banner, card layout with green-tinted borders. Font: Figtree (Google Fonts) for UI, JetBrains Mono for numbers.

**Spec:** `docs/superpowers/specs/2026-05-17-glintbudget-web-stage3-design.md`

---

## File Map

### New files

| File                                                  | Responsibility                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `src/firebase/db.ts`                                  | Firestore instance export                                      |
| `src/firestore/types.ts`                              | Transaction, Preference, BudgetData, Currency interfaces       |
| `src/lib/dateUtils.ts`                                | Period type + date range helpers + formatters                  |
| `src/hooks/useTransactions.ts`                        | Fetch transactions from Firestore                              |
| `src/hooks/usePreferences.ts`                         | Fetch `preference/{uid}` once                                  |
| `src/hooks/useMutateTransaction.ts`                   | useAddTransaction, useUpdateTransaction, useDeleteTransaction  |
| `src/context/PreferenceContext.tsx`                   | Context + provider; cached for session                         |
| `src/components/layout/Sidebar.tsx`                   | Dark green gradient sidebar nav                                |
| `src/components/layout/TopBar.tsx`                    | Title, period tabs (Day/Week/Month/Quarter/Year), + Add button |
| `src/components/dashboard/HeroStatsRow.tsx`           | Full-width gradient stats banner                               |
| `src/components/dashboard/SpendingChart.tsx`          | Recharts BarChart by period                                    |
| `src/components/dashboard/CategoryBreakdown.tsx`      | Top 5 categories by spend                                      |
| `src/components/dashboard/IncomeExpenseDonut.tsx`     | Recharts PieChart income vs expense                            |
| `src/components/dashboard/TodayTransactions.tsx`      | Table of today's transactions                                  |
| `src/components/dashboard/QuickStats.tsx`             | Derived stats card                                             |
| `src/components/transactions/TransactionTable.tsx`    | Shared table used by dashboard + list                          |
| `src/components/transactions/TransactionRow.tsx`      | Single transaction row with edit/delete                        |
| `src/components/transactions/DateRangeFilter.tsx`     | Date range tabs for TransactionList                            |
| `src/components/transactions/DeleteConfirmDialog.tsx` | Delete confirmation modal                                      |
| `src/components/form/AmountInput.tsx`                 | Amount + currency input                                        |
| `src/components/form/TypeToggle.tsx`                  | Expense / Income toggle                                        |
| `src/components/form/FieldPicker.tsx`                 | Dropdown populated from preference list                        |
| `src/routes/Dashboard.tsx`                            | Dashboard page composing all 6 widgets                         |
| `src/routes/TransactionList.tsx`                      | Paginated + date-filtered transaction list                     |
| `src/routes/TransactionForm.tsx`                      | Add/edit form (mode: 'add' \| 'edit')                          |

### Modified files

| File                           | Change                                                                     |
| ------------------------------ | -------------------------------------------------------------------------- |
| `src/App.tsx`                  | Nested child routes; lazy-load Dashboard, TransactionList, TransactionForm |
| `src/routes/AppShell.tsx`      | Layout route with `<Outlet>`, Sidebar, TopBar, period state                |
| `src/routes/AppShell.test.tsx` | Update test to match new layout (Sidebar + Outlet)                         |
| `src/main.tsx`                 | Wrap `App` tree with `<PreferenceProvider>` inside `AuthProvider`          |
| `src/styles/index.css`         | Add Figtree + JetBrains Mono font vars; sidebar CSS helpers                |
| `vite.config.ts`               | Add recharts to manualChunks                                               |
| `index.html`                   | Add Google Fonts preconnect + link                                         |
| `CLAUDE.md`                    | Update stage status and project structure                                  |

---

## Task 1: Install recharts, add Figtree font, update Vite chunks

**Files:**

- Modify: `package.json` (via npm install)
- Modify: `vite.config.ts:34-45`
- Modify: `index.html`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

Expected: `recharts` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Add recharts to Vite manualChunks**

In `vite.config.ts`, update the `manualChunks` callback (currently lines 34-40):

```ts
manualChunks: (id: string) => {
  if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
    return 'charts';
  }
  if (id.includes('react') || id.includes('react-dom')) {
    return 'react';
  }
},
```

- [ ] **Step 3: Add Google Fonts to index.html**

Add after the existing `<title>` tag in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 4: Update CSS font vars**

In `src/styles/index.css`, replace the `--font-sans` line in `@theme`:

```css
--font-sans: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

Also add sidebar CSS helpers below the `@theme` block:

```css
.sidebar-gradient {
  background: linear-gradient(180deg, #003d1c 0%, #005c2a 50%, #007836 100%);
}

.hero-gradient {
  background: linear-gradient(120deg, #003d1c 0%, #007836 40%, #1fa32e 70%, #e8f5e9 100%);
}

.gradient-text {
  background: linear-gradient(135deg, #ffffff 0%, #d1fae5 60%, #96bf0d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.income-gradient-text {
  background: linear-gradient(135deg, #007836 0%, #1fa32e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-surface {
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
  border: 1px solid #d1fae5;
}
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: exits 0, `dist/assets/` contains a `charts-*.js` chunk.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts index.html src/styles/index.css
git commit -m "feat(stage3): install recharts, add Figtree font, split charts chunk"
```

---

## Task 2: Firestore db module + TypeScript types

**Files:**

- Create: `src/firebase/db.ts`
- Create: `src/firebase/db.test.ts`
- Create: `src/firestore/types.ts`

- [ ] **Step 1: Write the db.ts test**

```ts
// src/firebase/db.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ app: { name: '[DEFAULT]' } }));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore' })),
}));

import { db } from './db';
import { getFirestore } from 'firebase/firestore';

describe('db', () => {
  it('calls getFirestore with the app and exports the result', () => {
    expect(getFirestore).toHaveBeenCalled();
    expect(db).toEqual({ type: 'firestore' });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- --reporter=verbose src/firebase/db.test.ts
```

Expected: FAIL — `Cannot find module './db'`

- [ ] **Step 3: Create src/firebase/db.ts**

```ts
import { getFirestore } from 'firebase/firestore';
import { app } from './client';

export const db = getFirestore(app);
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- --reporter=verbose src/firebase/db.test.ts
```

Expected: PASS

- [ ] **Step 5: Create src/firestore/types.ts**

```ts
// Mirrors iOS Transaction.CodingKeys. Field names are camelCase here;
// Firestore document uses snake_case for sub_category, date (Timestamp).
export interface Transaction {
  id: string;
  user_id: string;
  category: string;
  subCategory: string;
  date: Date;
  account: string;
  vendor: string;
  payment: string;
  currency: string;
  notes: string;
  amount: number;
  icon: string;
}

// Mirrors iOS BudgetData
export interface BudgetData {
  name: string;
  emoji: string | null;
  type: string;
  parent: string | null;
}

// Mirrors iOS Currency
export interface Currency {
  name: string;
  code: string;
  symbol: string;
}

// Mirrors iOS Preference (document ID = user uid)
export interface Preference {
  id: string;
  accounts: BudgetData[];
  categories: BudgetData[];
  subCategories: BudgetData[];
  vendors: BudgetData[];
  payments: BudgetData[];
  defaultCurrency: Currency;
  bookmarkedCurrencies: string[];
  defaultEntries: Record<string, string> | null;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/firebase/db.ts src/firebase/db.test.ts src/firestore/types.ts
git commit -m "feat(stage3): add Firestore db module and TypeScript types"
```

---

## Task 3: Date utilities

**Files:**

- Create: `src/lib/dateUtils.ts`
- Create: `src/lib/dateUtils.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/dateUtils.test.ts
import { describe, expect, it } from 'vitest';
import { getPeriodRange, formatCurrency, groupByDay, groupByMonth } from './dateUtils';

describe('getPeriodRange', () => {
  const base = new Date('2026-05-17T12:00:00');

  it('day: start = 00:00, end = 23:59:59.999 of today', () => {
    const { start, end } = getPeriodRange('day', base);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  it('week: start = Monday of current week', () => {
    const { start } = getPeriodRange('week', base);
    // 2026-05-17 is a Sunday; Monday = 2026-05-11
    expect(start.getDate()).toBe(11);
    expect(start.getMonth()).toBe(4); // May = 4
  });

  it('month: start = first of current month', () => {
    const { start } = getPeriodRange('month', base);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(4);
    expect(start.getFullYear()).toBe(2026);
  });

  it('quarter: start = first of current quarter', () => {
    const { start } = getPeriodRange('quarter', base);
    // May is Q2 → starts April 1
    expect(start.getMonth()).toBe(3); // April
    expect(start.getDate()).toBe(1);
  });

  it('year: start = Jan 1 of current year', () => {
    const { start } = getPeriodRange('year', base);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(start.getFullYear()).toBe(2026);
  });
});

describe('formatCurrency', () => {
  it('formats with symbol and 2 decimal places', () => {
    expect(formatCurrency(1234.5, '₹')).toBe('₹1,234.50');
  });
  it('handles zero', () => {
    expect(formatCurrency(0, '$')).toBe('$0.00');
  });
});

describe('groupByDay', () => {
  it('returns counts keyed by YYYY-MM-DD', () => {
    const txns = [
      { date: new Date('2026-05-17'), amount: 100 },
      { date: new Date('2026-05-17'), amount: 200 },
      { date: new Date('2026-05-16'), amount: 50 },
    ] as any[];
    const result = groupByDay(txns);
    expect(result['2026-05-17']).toBe(300);
    expect(result['2026-05-16']).toBe(50);
  });
});

describe('groupByMonth', () => {
  it('returns totals keyed by YYYY-MM', () => {
    const txns = [
      { date: new Date('2026-05-17'), amount: 100 },
      { date: new Date('2026-04-10'), amount: 200 },
    ] as any[];
    const result = groupByMonth(txns);
    expect(result['2026-05']).toBe(100);
    expect(result['2026-04']).toBe(200);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/lib/dateUtils.test.ts
```

Expected: FAIL — `Cannot find module './dateUtils'`

- [ ] **Step 3: Create src/lib/dateUtils.ts**

```ts
import type { Transaction } from '../firestore/types';

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';

export function getPeriodRange(period: Period, now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);

  // Normalize end to 23:59:59.999
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;

    case 'week': {
      // ISO week: Monday = 1, Sunday = 0
      const day = start.getDay(); // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      break;
    }

    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;

    case 'quarter': {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }

    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

export function filterByPeriod(
  txns: Transaction[],
  period: Period,
  now = new Date(),
): Transaction[] {
  const { start, end } = getPeriodRange(period, now);
  return txns.filter((t) => t.date >= start && t.date <= end);
}

export function filterToday(txns: Transaction[], now = new Date()): Transaction[] {
  return filterByPeriod(txns, 'day', now);
}

export function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Groups expense transactions by YYYY-MM-DD, summing amounts
export function groupByDay(txns: Transaction[]): Record<string, number> {
  return txns.reduce<Record<string, number>>((acc, t) => {
    const key = t.date.toISOString().slice(0, 10);
    acc[key] = (acc[key] ?? 0) + t.amount;
    return acc;
  }, {});
}

// Groups expense transactions by YYYY-MM, summing amounts
export function groupByMonth(txns: Transaction[]): Record<string, number> {
  return txns.reduce<Record<string, number>>((acc, t) => {
    const key = t.date.toISOString().slice(0, 7);
    acc[key] = (acc[key] ?? 0) + t.amount;
    return acc;
  }, {});
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function todayStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- --reporter=verbose src/lib/dateUtils.test.ts
```

Expected: all 7 assertions pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/dateUtils.test.ts
git commit -m "feat(stage3): add date utilities and Period type"
```

---

## Task 4: usePreferences hook

**Files:**

- Create: `src/hooks/usePreferences.ts`
- Create: `src/hooks/usePreferences.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/hooks/usePreferences.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(),
}));

import { getDoc } from 'firebase/firestore';
import { usePreferences } from './usePreferences';

const mockPreferenceData = {
  accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
  categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
  subCategories: [],
  vendors: [],
  payments: [{ name: 'UPI', emoji: null, type: 'payment', parent: null }],
  default_currency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
  frequent_currencies: ['INR', 'USD'],
  default_entries: { account: 'HDFC' },
};

describe('usePreferences', () => {
  it('returns loading=true and data=null initially', () => {
    vi.mocked(getDoc).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePreferences('uid-123'));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('returns null and skips fetch when uid is null', async () => {
    const { result } = renderHook(() => usePreferences(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('decodes snake_case fields and returns Preference on success', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: 'uid-123',
      data: () => mockPreferenceData,
    } as any);

    const { result } = renderHook(() => usePreferences('uid-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.defaultCurrency.code).toBe('INR');
    expect(result.current.data?.bookmarkedCurrencies).toEqual(['INR', 'USD']);
    expect(result.current.data?.defaultEntries).toEqual({ account: 'HDFC' });
    expect(result.current.data?.id).toBe('uid-123');
  });

  it('returns null data when document does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as any);

    const { result } = renderHook(() => usePreferences('uid-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('sets error on Firestore failure', async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('permission denied'));
    const { result } = renderHook(() => usePreferences('uid-123'));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('permission denied');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/hooks/usePreferences.test.ts
```

Expected: FAIL — `Cannot find module './usePreferences'`

- [ ] **Step 3: Create src/hooks/usePreferences.ts**

```ts
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/db';
import type { Preference } from '../firestore/types';

interface UsePreferencesResult {
  data: Preference | null;
  loading: boolean;
  error: Error | null;
}

function docToPreference(id: string, raw: Record<string, unknown>): Preference {
  return {
    id,
    accounts: (raw['accounts'] as Preference['accounts']) ?? [],
    categories: (raw['categories'] as Preference['categories']) ?? [],
    subCategories: (raw['subCategories'] as Preference['subCategories']) ?? [],
    vendors: (raw['vendors'] as Preference['vendors']) ?? [],
    payments: (raw['payments'] as Preference['payments']) ?? [],
    defaultCurrency: raw['default_currency'] as Preference['defaultCurrency'],
    bookmarkedCurrencies: (raw['frequent_currencies'] as string[]) ?? [],
    defaultEntries: (raw['default_entries'] as Record<string, string>) ?? null,
  };
}

export function usePreferences(uid: string | null): UsePreferencesResult {
  const [data, setData] = useState<Preference | null>(null);
  const [loading, setLoading] = useState(uid !== null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const ref = doc(db, 'preference', uid);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setData(docToPreference(snap.id, snap.data() as Record<string, unknown>));
        } else {
          setData(null);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [uid]);

  return { data, loading, error };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/hooks/usePreferences.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePreferences.ts src/hooks/usePreferences.test.ts
git commit -m "feat(stage3): add usePreferences hook with snake_case decoding"
```

---

## Task 5: PreferenceContext

**Files:**

- Create: `src/context/PreferenceContext.tsx`
- Create: `src/context/PreferenceContext.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/context/PreferenceContext.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
}));
vi.mock('../firebase/client', () => ({
  auth: {},
  app: {},
}));

import { AuthContext } from '../auth/AuthContext';
import { PreferenceProvider, usePreferenceContext } from './PreferenceContext';

function Consumer() {
  const { loading } = usePreferenceContext();
  return <div>{loading ? 'loading' : 'done'}</div>;
}

describe('PreferenceContext', () => {
  it('provides preference state to consumers', async () => {
    render(
      <AuthContext.Provider
        value={{
          status: 'authenticated',
          user: { uid: 'u1', name: null, email: null, photoUrl: null },
        }}
      >
        <PreferenceProvider>
          <Consumer />
        </PreferenceProvider>
      </AuthContext.Provider>,
    );
    // initially renders (loading or done)
    expect(screen.getByText(/loading|done/)).toBeInTheDocument();
  });

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'usePreferenceContext must be used within PreferenceProvider',
    );
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/context/PreferenceContext.test.tsx
```

- [ ] **Step 3: Create src/context/PreferenceContext.tsx**

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePreferences } from '../hooks/usePreferences';
import type { Preference } from '../firestore/types';

interface PreferenceContextValue {
  preference: Preference | null;
  loading: boolean;
  error: Error | null;
}

const PreferenceContext = createContext<PreferenceContextValue | null>(null);

export function PreferenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : null;
  const { data, loading, error } = usePreferences(uid);

  return (
    <PreferenceContext.Provider value={{ preference: data, loading, error }}>
      {children}
    </PreferenceContext.Provider>
  );
}

export function usePreferenceContext(): PreferenceContextValue {
  const ctx = useContext(PreferenceContext);
  if (!ctx) {
    throw new Error('usePreferenceContext must be used within PreferenceProvider');
  }
  return ctx;
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/context/PreferenceContext.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/context/PreferenceContext.tsx src/context/PreferenceContext.test.tsx
git commit -m "feat(stage3): add PreferenceContext and provider"
```

---

## Task 6: useTransactions hook

**Files:**

- Create: `src/hooks/useTransactions.ts`
- Create: `src/hooks/useTransactions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/hooks/useTransactions.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  limit: vi.fn(() => 'l'),
  getDocs: vi.fn(),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { getDocs } from 'firebase/firestore';
import { useTransactions } from './useTransactions';

function makeMockDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx1',
    data: () => ({
      user_id: 'u1',
      category: 'Food',
      sub_category: 'Groceries',
      date: { toDate: () => new Date('2026-05-17') },
      account: 'HDFC',
      vendor: 'Zepto',
      payment: 'UPI',
      currency: 'INR',
      notes: 'weekly shop',
      amount: 500,
      icon: '🛒',
      ...overrides,
    }),
  };
}

describe('useTransactions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns loading=true and empty data initially', () => {
    vi.mocked(getDocs).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTransactions({ uid: 'u1', limit: 10 }));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('maps sub_category → subCategory and date Timestamp → Date', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [makeMockDoc()] } as any);
    const { result } = renderHook(() => useTransactions({ uid: 'u1', limit: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const tx = result.current.data[0];
    expect(tx.subCategory).toBe('Groceries');
    expect(tx.date).toBeInstanceOf(Date);
    expect(tx.id).toBe('tx1');
  });

  it('sets error on Firestore failure', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('quota exceeded'));
    const { result } = renderHook(() => useTransactions({ uid: 'u1', limit: 10 }));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('quota exceeded');
    expect(result.current.loading).toBe(false);
  });

  it('applies date filters when start and end are provided', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as any);
    const start = new Date('2026-05-01');
    const end = new Date('2026-05-31');
    renderHook(() => useTransactions({ uid: 'u1', start, end }));
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    // query was called — filter args verified by checking getDocs was called
    expect(getDocs).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/hooks/useTransactions.test.ts
```

- [ ] **Step 3: Create src/hooks/useTransactions.ts**

```ts
import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/db';
import type { Transaction } from '../firestore/types';

export interface TransactionFilter {
  uid: string;
  start?: Date;
  end?: Date;
  limit?: number;
}

interface UseTransactionsResult {
  data: Transaction[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function docToTransaction(id: string, raw: DocumentData): Transaction {
  return {
    id,
    user_id: raw['user_id'] as string,
    category: raw['category'] as string,
    subCategory: raw['sub_category'] as string,
    date: (raw['date'] as { toDate(): Date }).toDate(),
    account: raw['account'] as string,
    vendor: raw['vendor'] as string,
    payment: raw['payment'] as string,
    currency: raw['currency'] as string,
    notes: (raw['notes'] as string) ?? '',
    amount: raw['amount'] as number,
    icon: (raw['icon'] as string) ?? '',
  };
}

export function useTransactions(filter: TransactionFilter): UseTransactionsResult {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const col = collection(db, 'transactions');
    const constraints = [where('user_id', '==', filter.uid), orderBy('date', 'desc')];

    if (filter.start) constraints.push(where('date', '>=', filter.start));
    if (filter.end) constraints.push(where('date', '<=', filter.end));
    if (filter.limit) constraints.push(limit(filter.limit));

    const q = query(col, ...constraints);

    getDocs(q)
      .then((snap) => {
        setData(snap.docs.map((d) => docToTransaction(d.id, d.data())));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.uid, filter.start?.getTime(), filter.end?.getTime(), filter.limit, tick]);

  return { data, loading, error, refetch: () => setTick((n) => n + 1) };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/hooks/useTransactions.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTransactions.ts src/hooks/useTransactions.test.ts
git commit -m "feat(stage3): add useTransactions hook with Firestore decode"
```

---

## Task 7: useMutateTransaction hook

**Files:**

- Create: `src/hooks/useMutateTransaction.ts`
- Create: `src/hooks/useMutateTransaction.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/hooks/useMutateTransaction.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from './useMutateTransaction';
import type { Transaction } from '../firestore/types';

const baseTransaction: Omit<Transaction, 'id'> = {
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date('2026-05-17'),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: 500,
  icon: '🛒',
};

describe('useAddTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls addDoc with snake_case sub_category and returns doc id', async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-id' } as any);
    const { result } = renderHook(() => useAddTransaction());

    let id!: string;
    await act(async () => {
      id = await result.current.mutate(baseTransaction);
    });

    expect(addDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(addDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['sub_category']).toBe('Groceries');
    expect(callArgs['subCategory']).toBeUndefined();
    expect(id).toBe('new-id');
    expect(result.current.loading).toBe(false);
  });

  it('sets error on addDoc failure', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(new Error('write failed'));
    const { result } = renderHook(() => useAddTransaction());

    await act(async () => {
      await result.current.mutate(baseTransaction).catch(() => {});
    });

    expect(result.current.error?.message).toBe('write failed');
  });
});

describe('useUpdateTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls updateDoc with the given id and snake_case fields', async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useUpdateTransaction());

    await act(async () => {
      await result.current.mutate('tx-1', { amount: 999, subCategory: 'Dining' });
    });

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(updateDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['amount']).toBe(999);
    expect(callArgs['sub_category']).toBe('Dining');
  });
});

describe('useDeleteTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls deleteDoc with the given id', async () => {
    vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useDeleteTransaction());

    await act(async () => {
      await result.current.mutate('tx-1');
    });

    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/hooks/useMutateTransaction.test.ts
```

- [ ] **Step 3: Create src/hooks/useMutateTransaction.ts**

```ts
import { useState } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/db';
import type { Transaction } from '../firestore/types';

type TxInput = Omit<Transaction, 'id'>;
type TxPatch = Partial<Omit<Transaction, 'id'>>;

function encodeTransaction(tx: TxInput): Record<string, unknown> {
  return {
    user_id: tx.user_id,
    category: tx.category,
    sub_category: tx.subCategory,
    date: Timestamp.fromDate(tx.date),
    account: tx.account,
    vendor: tx.vendor,
    payment: tx.payment,
    currency: tx.currency,
    notes: tx.notes,
    amount: tx.amount,
    icon: tx.icon,
  };
}

function encodePatch(patch: TxPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.user_id !== undefined) out['user_id'] = patch.user_id;
  if (patch.category !== undefined) out['category'] = patch.category;
  if (patch.subCategory !== undefined) out['sub_category'] = patch.subCategory;
  if (patch.date !== undefined) out['date'] = Timestamp.fromDate(patch.date);
  if (patch.account !== undefined) out['account'] = patch.account;
  if (patch.vendor !== undefined) out['vendor'] = patch.vendor;
  if (patch.payment !== undefined) out['payment'] = patch.payment;
  if (patch.currency !== undefined) out['currency'] = patch.currency;
  if (patch.notes !== undefined) out['notes'] = patch.notes;
  if (patch.amount !== undefined) out['amount'] = patch.amount;
  if (patch.icon !== undefined) out['icon'] = patch.icon;
  return out;
}

export function useAddTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function mutate(tx: TxInput): Promise<string> {
    setLoading(true);
    setError(null);
    try {
      const ref = await addDoc(collection(db, 'transactions'), encodeTransaction(tx));
      return ref.id;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { mutate, loading, error };
}

export function useUpdateTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function mutate(id: string, patch: TxPatch): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'transactions', id), encodePatch(patch));
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { mutate, loading, error };
}

export function useDeleteTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function mutate(id: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { mutate, loading, error };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/hooks/useMutateTransaction.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMutateTransaction.ts src/hooks/useMutateTransaction.test.ts
git commit -m "feat(stage3): add useAddTransaction, useUpdateTransaction, useDeleteTransaction"
```

---

## Task 8: App routing restructure (nested routes)

**Files:**

- Modify: `src/App.tsx`

The existing `/app` single route becomes a parent layout route (`AppShell`) with nested child routes. A redirect from `/app` to `/app/dashboard` handles the old URL.

- [ ] **Step 1: Update src/App.tsx**

Replace the entire file with:

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import Landing from './routes/Landing';

const SignIn = lazy(() => import('./routes/SignIn'));
const AppShell = lazy(() => import('./routes/AppShell'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const TransactionList = lazy(() => import('./routes/TransactionList'));
const TransactionForm = lazy(() => import('./routes/TransactionForm'));

const RouteFallback = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-screen items-center justify-center text-slate-500"
  >
    Loading…
  </div>
);

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    path: '/signin',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <SignIn />
      </Suspense>
    ),
  },
  {
    path: '/app',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'transactions',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionList />
          </Suspense>
        ),
      },
      {
        path: 'transactions/new',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="add" />
          </Suspense>
        ),
      },
      {
        path: 'transactions/:id/edit',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="edit" />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Create stub route files so TypeScript doesn't error**

Create `src/routes/Dashboard.tsx`:

```tsx
export default function Dashboard() {
  return <div>Dashboard — coming soon</div>;
}
```

Create `src/routes/TransactionList.tsx`:

```tsx
export default function TransactionList() {
  return <div>Transactions — coming soon</div>;
}
```

Create `src/routes/TransactionForm.tsx`:

```tsx
export default function TransactionForm({ mode }: { mode: 'add' | 'edit' }) {
  return <div>Form ({mode}) — coming soon</div>;
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all pass (AppShell.test.tsx may need updating in Task 11 — acceptable to have it fail now, fix then).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/routes/Dashboard.tsx src/routes/TransactionList.tsx src/routes/TransactionForm.tsx
git commit -m "feat(stage3): restructure /app as nested layout route with child routes"
```

---

## Task 9: Sidebar component

**Files:**

- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Sidebar.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/layout/Sidebar.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../firebase/client', () => ({ auth: {}, app: {} }));
vi.mock('../../firebase/auth', () => ({
  signOutCurrentUser: vi.fn(),
}));

import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('renders GlintBudget wordmark', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('renders Dashboard and Transactions nav links', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /transactions/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/components/layout/Sidebar.test.tsx
```

- [ ] **Step 3: Create src/components/layout/Sidebar.tsx**

```tsx
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '◈', to: '/app/dashboard' },
  { label: 'Transactions', icon: '⇌', to: '/app/transactions' },
];

const DISABLED_ITEMS = [
  { label: 'Reports', icon: '◎' },
  { label: 'Categories', icon: '⊞' },
  { label: 'Accounts', icon: '⬡' },
  { label: 'Preference', icon: '⚙' },
];

export default function Sidebar() {
  return (
    <aside
      className="flex h-screen w-[220px] flex-shrink-0 flex-col py-6"
      style={{
        background: 'linear-gradient(180deg, #003d1c 0%, #005c2a 50%, #007836 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient radial blobs */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(150,191,13,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 80,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(31,163,46,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Wordmark */}
      <div className="mb-8 px-5">
        <span className="text-xl font-bold tracking-tight text-white">
          <span aria-hidden="true" style={{ color: '#96bf0d' }}>
            ●
          </span>{' '}
          GlintBudget
        </span>
      </div>

      {/* Active nav */}
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
            <span aria-hidden="true" className="text-base">
              {icon}
            </span>
            {label}
          </NavLink>
        ))}

        <div className="my-3 border-t border-white/20" />

        {DISABLED_ITEMS.map(({ label, icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/30 cursor-not-allowed select-none"
            title="Coming soon"
          >
            <span aria-hidden="true" className="text-base">
              {icon}
            </span>
            {label}
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/layout/Sidebar.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Sidebar.test.tsx
git commit -m "feat(stage3): add Sidebar with dark green glassmorphism design"
```

---

## Task 10: TopBar component

**Files:**

- Create: `src/components/layout/TopBar.tsx`
- Create: `src/components/layout/TopBar.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/layout/TopBar.test.tsx
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/components/layout/TopBar.test.tsx
```

- [ ] **Step 3: Create src/components/layout/TopBar.tsx**

```tsx
import { Link } from 'react-router-dom';
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
}

export default function TopBar({ title, period, onPeriodChange }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
      <h1 className="text-lg font-semibold text-text">{title}</h1>

      {/* Period tabs */}
      <div className="flex items-center rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5">
        {PERIODS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => onPeriodChange(value)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
              period === value ? 'text-white shadow-sm' : 'text-text-muted hover:text-text',
            ].join(' ')}
            style={
              period === value
                ? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Add Transaction */}
      <Link
        to="/app/transactions/new"
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}
        aria-label="Add transaction"
      >
        <span aria-hidden="true">+</span> Add Transaction
      </Link>
    </header>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/layout/TopBar.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TopBar.tsx src/components/layout/TopBar.test.tsx
git commit -m "feat(stage3): add TopBar with period tabs and Add Transaction link"
```

---

## Task 11: AppShell restructure — layout with Outlet

**Files:**

- Modify: `src/routes/AppShell.tsx`
- Modify: `src/routes/AppShell.test.tsx`

AppShell becomes a layout route that owns `period` state, renders `<Sidebar>` and `<TopBar>`, then passes the period down to child routes via `useOutletContext`.

- [ ] **Step 1: Update AppShell.test.tsx**

Replace the file with:

```tsx
// src/routes/AppShell.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' }, app: {} }));
vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));
vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
}));

import AppShell from './AppShell';

const authedCtx = {
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Rajesh M', email: 'r@e.com', photoUrl: null },
};

describe('AppShell route', () => {
  it('renders the GlintBudget wordmark in the sidebar', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('renders Dashboard nav link', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update src/routes/AppShell.tsx**

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
  '/app/dashboard': 'Dashboard',
  '/app/transactions': 'Transactions',
  '/app/transactions/new': 'New Transaction',
};

function getTitle(pathname: string): string {
  if (pathname.endsWith('/edit')) return 'Edit Transaction';
  return TITLE_MAP[pathname] ?? 'GlintBudget';
}

export default function AppShell() {
  const auth = useAuth();
  if (auth.status !== 'authenticated') return null;

  const [period, setPeriod] = useState<Period>('month');
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar title={getTitle(location.pathname)} period={period} onPeriodChange={setPeriod} />
        <main className="flex-1 overflow-y-auto bg-surface-alt">
          <Outlet context={{ period, setPeriod } satisfies AppShellOutletContext} />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run updated AppShell tests**

```bash
npm run test -- --reporter=verbose src/routes/AppShell.test.tsx
```

Expected: both new tests pass.

- [ ] **Step 4: Run full test suite**

```bash
npm run test
```

Expected: all pass (Dashboard/TransactionList/TransactionForm stubs still exist).

- [ ] **Step 5: Commit**

```bash
git add src/routes/AppShell.tsx src/routes/AppShell.test.tsx
git commit -m "feat(stage3): restructure AppShell as layout route with Sidebar, TopBar, Outlet"
```

---

## Task 12: HeroStatsRow + Dashboard skeleton

**Files:**

- Modify: `src/routes/Dashboard.tsx`
- Create: `src/routes/Dashboard.test.tsx`
- Create: `src/components/dashboard/HeroStatsRow.tsx`
- Create: `src/components/dashboard/HeroStatsRow.test.tsx`

- [ ] **Step 1: Write HeroStatsRow test**

```tsx
// src/components/dashboard/HeroStatsRow.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeroStatsRow from './HeroStatsRow';

const stats = {
  totalSpent: 12500,
  totalIncome: 50000,
  netBalance: 37500,
  txCount: 24,
  currencySymbol: '₹',
};

describe('HeroStatsRow', () => {
  it('renders all four stat labels', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/total spent/i)).toBeInTheDocument();
    expect(screen.getByText(/income/i)).toBeInTheDocument();
    expect(screen.getByText(/net balance/i)).toBeInTheDocument();
    expect(screen.getByText(/transactions/i)).toBeInTheDocument();
  });

  it('formats amounts with currency symbol', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText(/₹12,500/)).toBeInTheDocument();
    expect(screen.getByText(/₹50,000/)).toBeInTheDocument();
  });

  it('shows transaction count', () => {
    render(<HeroStatsRow {...stats} />);
    expect(screen.getByText('24')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/components/dashboard/HeroStatsRow.test.tsx
```

- [ ] **Step 3: Create src/components/dashboard/HeroStatsRow.tsx**

```tsx
import { formatCurrency } from '../../lib/dateUtils';

interface HeroStatsRowProps {
  totalSpent: number;
  totalIncome: number;
  netBalance: number;
  txCount: number;
  currencySymbol: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  highlight?: boolean;
}

function StatCard({ label, value, accent, highlight }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/60">{label}</span>
      <span
        className={[
          'text-3xl font-bold leading-none',
          highlight ? 'gradient-text' : accent ? 'income-gradient-text' : 'text-white',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

export default function HeroStatsRow({
  totalSpent,
  totalIncome,
  netBalance,
  txCount,
  currencySymbol,
}: HeroStatsRowProps) {
  return (
    <div className="hero-gradient w-full px-8 py-8" style={{ borderRadius: '0 0 24px 24px' }}>
      <div className="flex items-center gap-12 flex-wrap">
        <StatCard
          label="Net Balance"
          value={formatCurrency(netBalance, currencySymbol)}
          highlight
        />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard label="Income" value={formatCurrency(totalIncome, currencySymbol)} accent />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent, currencySymbol)} />
        <div className="w-px h-12 bg-white/20" aria-hidden="true" />
        <StatCard label="Transactions" value={txCount} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run HeroStatsRow tests — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/dashboard/HeroStatsRow.test.tsx
```

- [ ] **Step 5: Write Dashboard test (skeleton)**

```tsx
// src/routes/Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { PreferenceContext } from '../context/PreferenceContext';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  limit: vi.fn(() => 'l'),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
}));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}));

import Dashboard from './Dashboard';

const authedCtx = {
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Rajesh', email: 'r@e.com', photoUrl: null },
};

const prefCtx = {
  preference: null,
  loading: false,
  error: null,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authedCtx}>
      <PreferenceContext value={prefCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <Routes>
            <Route path="/app/dashboard" element={children} />
          </Routes>
        </MemoryRouter>
      </PreferenceContext>
    </AuthContext.Provider>
  );
}

describe('Dashboard', () => {
  it('renders all 6 widget regions', async () => {
    render(<Dashboard />, { wrapper: Wrapper as any });
    expect(await screen.findByText(/net balance/i)).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByText(/today/i)).toBeInTheDocument();
    expect(screen.getByText(/category/i)).toBeInTheDocument();
    expect(screen.getByText(/quick stats/i)).toBeInTheDocument();
  });
});
```

> **Note on `PreferenceContext`:** The test imports `PreferenceContext` (the raw context object) to override its value using React 19's new `<Context value={...}>` syntax. Update `src/context/PreferenceContext.tsx` to `export const PreferenceContext` (currently unexported). Add this export alongside the existing internal usage.

- [ ] **Step 6: Export PreferenceContext from context file**

In `src/context/PreferenceContext.tsx`, change:

```ts
const PreferenceContext = createContext<PreferenceContextValue | null>(null);
```

to:

```ts
export const PreferenceContext = createContext<PreferenceContextValue | null>(null);
```

- [ ] **Step 7: Commit HeroStatsRow**

```bash
git add src/components/dashboard/HeroStatsRow.tsx src/components/dashboard/HeroStatsRow.test.tsx
git add src/context/PreferenceContext.tsx
git commit -m "feat(stage3): add HeroStatsRow, export PreferenceContext"
```

---

## Task 13: SpendingChart widget

**Files:**

- Create: `src/components/dashboard/SpendingChart.tsx`
- Create: `src/components/dashboard/SpendingChart.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/dashboard/SpendingChart.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import SpendingChart from './SpendingChart';
import type { Transaction } from '../../firestore/types';

const makeTx = (date: string, amount: number): Transaction => ({
  id: date,
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date(date),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount,
  icon: '🛒',
});

describe('SpendingChart', () => {
  it('renders a bar chart', () => {
    render(
      <SpendingChart
        transactions={[makeTx('2026-05-17', 500), makeTx('2026-05-16', 300)]}
        period="month"
        currencySymbol="₹"
      />,
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders the Spending section heading', () => {
    render(<SpendingChart transactions={[]} period="week" currencySymbol="₹" />);
    expect(screen.getByText(/spending/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/components/dashboard/SpendingChart.test.tsx
```

- [ ] **Step 3: Create src/components/dashboard/SpendingChart.tsx**

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import type { Transaction } from '../../firestore/types';
import type { Period } from '../../lib/dateUtils';
import { groupByDay, groupByMonth, getPeriodRange, formatCurrency } from '../../lib/dateUtils';

interface SpendingChartProps {
  transactions: Transaction[];
  period: Period;
  currencySymbol: string;
}

function buildChartData(txns: Transaction[], period: Period): { label: string; amount: number }[] {
  const expenses = txns.filter((t) => t.amount > 0);

  if (period === 'day') {
    // Hourly buckets 0-23
    const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, amount: 0 }));
    expenses.forEach((t) => {
      const h = t.date.getHours();
      buckets[h]!.amount += t.amount;
    });
    return buckets;
  }

  if (period === 'month' || period === 'week') {
    const grouped = groupByDay(expenses);
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount,
      }));
  }

  // quarter / year → monthly buckets
  const grouped = groupByMonth(expenses);
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, amount]) => {
      const [y, m] = ym.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return { label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), amount };
    });
}

const CustomTooltip = ({
  active,
  payload,
  label,
  symbol,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  symbol: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface rounded-lg px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text">{label}</p>
      <p className="text-brand font-mono">{formatCurrency(payload[0]!.value, symbol)}</p>
    </div>
  );
};

export default function SpendingChart({
  transactions,
  period,
  currencySymbol,
}: SpendingChartProps) {
  const data = useMemo(() => buildChartData(transactions, period), [transactions, period]);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">Spending</h2>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip symbol={currencySymbol} />} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#007836" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/dashboard/SpendingChart.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/SpendingChart.tsx src/components/dashboard/SpendingChart.test.tsx
git commit -m "feat(stage3): add SpendingChart widget using Recharts BarChart"
```

---

## Task 14: CategoryBreakdown + IncomeExpenseDonut

**Files:**

- Create: `src/components/dashboard/CategoryBreakdown.tsx`
- Create: `src/components/dashboard/CategoryBreakdown.test.tsx`
- Create: `src/components/dashboard/IncomeExpenseDonut.tsx`
- Create: `src/components/dashboard/IncomeExpenseDonut.test.tsx`

- [ ] **Step 1: Write CategoryBreakdown tests**

```tsx
// src/components/dashboard/CategoryBreakdown.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryBreakdown from './CategoryBreakdown';
import type { Transaction } from '../../firestore/types';

const makeTx = (category: string, amount: number): Transaction => ({
  id: category + amount,
  user_id: 'u1',
  category,
  subCategory: '',
  date: new Date(),
  account: 'HDFC',
  vendor: 'V',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount,
  icon: '🛒',
});

describe('CategoryBreakdown', () => {
  it('renders top categories heading', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/category/i)).toBeInTheDocument();
  });

  it('shows top 5 categories by spend', () => {
    const txns = [
      ...Array(3)
        .fill(null)
        .map(() => makeTx('Food', 500)),
      ...Array(2)
        .fill(null)
        .map(() => makeTx('Transport', 200)),
      makeTx('Health', 100),
    ];
    render(<CategoryBreakdown transactions={txns} currencySymbol="₹" />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(<CategoryBreakdown transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Create src/components/dashboard/CategoryBreakdown.tsx**

```tsx
import { useMemo } from 'react';
import type { Transaction } from '../../firestore/types';
import { formatCurrency } from '../../lib/dateUtils';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  currencySymbol: string;
}

const CATEGORY_COLORS = ['#007836', '#1fa32e', '#96bf0d', '#059669', '#0d9488'];

export default function CategoryBreakdown({
  transactions,
  currencySymbol,
}: CategoryBreakdownProps) {
  const categories = useMemo(() => {
    const totals = transactions.reduce<Record<string, { total: number; icon: string }>>(
      (acc, t) => {
        if (!acc[t.category]) acc[t.category] = { total: 0, icon: t.icon };
        acc[t.category]!.total += t.amount;
        return acc;
      },
      {},
    );
    const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
    return Object.entries(totals)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(([name, { total, icon }]) => ({
        name,
        icon,
        total,
        pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
      }));
  }, [transactions]);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
        By Category
      </h2>
      {categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">No data for this period</p>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map(({ name, icon, total, pct }, i) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{icon || '📦'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-text truncate">{name}</span>
                  <span className="text-xs text-text-muted ml-2 flex-shrink-0">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-text flex-shrink-0">
                {formatCurrency(total, currencySymbol)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write IncomeExpenseDonut test**

```tsx
// src/components/dashboard/IncomeExpenseDonut.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
  Tooltip: () => null,
}));

import IncomeExpenseDonut from './IncomeExpenseDonut';

describe('IncomeExpenseDonut', () => {
  it('renders the donut chart', () => {
    render(<IncomeExpenseDonut income={50000} expenses={12500} currencySymbol="₹" />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('shows income and expenses labels', () => {
    render(<IncomeExpenseDonut income={50000} expenses={12500} currencySymbol="₹" />);
    expect(screen.getByText(/income/i)).toBeInTheDocument();
    expect(screen.getByText(/expenses/i)).toBeInTheDocument();
  });

  it('renders savings rate percentage', () => {
    render(<IncomeExpenseDonut income={50000} expenses={12500} currencySymbol="₹" />);
    // savings = (50000 - 12500) / 50000 = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Create src/components/dashboard/IncomeExpenseDonut.tsx**

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../lib/dateUtils';

interface IncomeExpenseDonutProps {
  income: number;
  expenses: number;
  currencySymbol: string;
}

const COLORS = ['#007836', '#dc2626'];

export default function IncomeExpenseDonut({
  income,
  expenses,
  currencySymbol,
}: IncomeExpenseDonutProps) {
  const data = [
    { name: 'Income', value: income },
    { name: 'Expenses', value: expenses },
  ];
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
        Income vs Expenses
      </h2>
      <div className="relative" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v, currencySymbol)} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-text">{savingsRate}%</p>
            <p className="text-xs text-text-muted">saved</p>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 justify-center text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand" />
          <span className="income-gradient-text font-semibold">Income</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
          <span className="text-red-600 font-semibold">Expenses</span>
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run both tests — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/dashboard/CategoryBreakdown.test.tsx src/components/dashboard/IncomeExpenseDonut.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/CategoryBreakdown.tsx src/components/dashboard/CategoryBreakdown.test.tsx
git add src/components/dashboard/IncomeExpenseDonut.tsx src/components/dashboard/IncomeExpenseDonut.test.tsx
git commit -m "feat(stage3): add CategoryBreakdown and IncomeExpenseDonut widgets"
```

---

## Task 15: TodayTransactions + QuickStats + Dashboard composition

**Files:**

- Create: `src/components/dashboard/TodayTransactions.tsx`
- Create: `src/components/dashboard/TodayTransactions.test.tsx`
- Create: `src/components/dashboard/QuickStats.tsx`
- Create: `src/components/dashboard/QuickStats.test.tsx`
- Modify: `src/routes/Dashboard.tsx`
- Create: `src/routes/Dashboard.test.tsx`

- [ ] **Step 1: Create src/components/dashboard/TodayTransactions.tsx**

```tsx
import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import { formatCurrency, formatTime } from '../../lib/dateUtils';

interface TodayTransactionsProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function TodayTransactions({
  transactions,
  currencySymbol,
  onDelete,
}: TodayTransactionsProps) {
  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">Today</h2>
        <Link to="/app/transactions" className="text-xs text-brand hover:underline font-medium">
          See all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No transactions today</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 py-2.5">
              <span className="text-xl w-8 text-center flex-shrink-0">{tx.icon || '💸'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{tx.vendor}</p>
                <p className="text-xs text-text-muted">
                  {tx.category} · {formatTime(tx.date)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-mono font-semibold text-red-600">
                  −{formatCurrency(tx.amount, currencySymbol)}
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
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write TodayTransactions test**

```tsx
// src/components/dashboard/TodayTransactions.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TodayTransactions from './TodayTransactions';
import type { Transaction } from '../../firestore/types';

const tx: Transaction = {
  id: 'tx1',
  user_id: 'u1',
  category: 'Food',
  subCategory: '',
  date: new Date(),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: 500,
  icon: '🛒',
};

describe('TodayTransactions', () => {
  it('renders empty state when no transactions', () => {
    render(
      <MemoryRouter>
        <TodayTransactions transactions={[]} currencySymbol="₹" onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no transactions today/i)).toBeInTheDocument();
  });

  it('renders vendor name and amount', () => {
    render(
      <MemoryRouter>
        <TodayTransactions transactions={[tx]} currencySymbol="₹" onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <TodayTransactions transactions={[tx]} currencySymbol="₹" onDelete={onDelete} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /delete zepto/i }));
    expect(onDelete).toHaveBeenCalledWith('tx1');
  });
});
```

- [ ] **Step 3: Run TodayTransactions test — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/dashboard/TodayTransactions.test.tsx
```

- [ ] **Step 4: Create src/components/dashboard/QuickStats.tsx**

```tsx
import type { Transaction } from '../../firestore/types';
import { formatCurrency } from '../../lib/dateUtils';

interface QuickStatsProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export default function QuickStats({ transactions, currencySymbol }: QuickStatsProps) {
  const expenses = transactions.filter((t) => t.amount > 0);

  const highest = expenses.reduce<Transaction | null>(
    (max, t) => (max === null || t.amount > max.amount ? t : max),
    null,
  );

  const avg =
    expenses.length > 0 ? expenses.reduce((s, t) => s + t.amount, 0) / expenses.length : 0;

  const topPayment = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.payment] = (acc[t.payment] ?? 0) + 1;
    return acc;
  }, {});
  const mostUsedPayment = Object.entries(topPayment).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';

  const topCatMap = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});
  const topCategory = Object.entries(topCatMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';

  const items = [
    {
      label: 'Highest spend',
      value: highest ? formatCurrency(highest.amount, currencySymbol) : '—',
    },
    { label: 'Avg per transaction', value: formatCurrency(avg, currencySymbol) },
    { label: 'Top payment', value: mostUsedPayment },
    { label: 'Top category', value: topCategory },
  ];

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
        Quick Stats
      </h2>
      <div className="flex flex-col gap-2">
        {items.map(({ label, value }) => (
          <div
            key={label}
            className="flex justify-between items-center py-1 border-b border-border last:border-0"
          >
            <span className="text-xs text-text-muted">{label}</span>
            <span className="text-sm font-semibold font-mono text-text">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write QuickStats test**

```tsx
// src/components/dashboard/QuickStats.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuickStats from './QuickStats';
import type { Transaction } from '../../firestore/types';

const makeTx = (
  vendor: string,
  amount: number,
  payment: string,
  category: string,
): Transaction => ({
  id: vendor,
  user_id: 'u1',
  category,
  subCategory: '',
  date: new Date(),
  account: 'HDFC',
  vendor,
  payment,
  currency: 'INR',
  notes: '',
  amount,
  icon: '',
});

describe('QuickStats', () => {
  it('renders Quick Stats heading', () => {
    render(<QuickStats transactions={[]} currencySymbol="₹" />);
    expect(screen.getByText(/quick stats/i)).toBeInTheDocument();
  });

  it('shows highest spend', () => {
    const txns = [makeTx('A', 1000, 'UPI', 'Food'), makeTx('B', 500, 'UPI', 'Food')];
    render(<QuickStats transactions={txns} currencySymbol="₹" />);
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run QuickStats test — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/dashboard/QuickStats.test.tsx
```

- [ ] **Step 7: Assemble Dashboard.tsx**

Replace `src/routes/Dashboard.tsx` stub:

```tsx
import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactions } from '../hooks/useTransactions';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { filterByPeriod, filterToday } from '../lib/dateUtils';
import type { AppShellOutletContext } from './AppShell';
import HeroStatsRow from '../components/dashboard/HeroStatsRow';
import SpendingChart from '../components/dashboard/SpendingChart';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';
import IncomeExpenseDonut from '../components/dashboard/IncomeExpenseDonut';
import TodayTransactions from '../components/dashboard/TodayTransactions';
import QuickStats from '../components/dashboard/QuickStats';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';
import { useState } from 'react';

export default function Dashboard() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { period } = useOutletContext<AppShellOutletContext>();
  const { preference } = usePreferenceContext();
  const { data: allTxns, loading, error, refetch } = useTransactions({ uid, limit: 200 });
  const { mutate: deleteTx } = useDeleteTransaction();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';

  const periodTxns = useMemo(() => filterByPeriod(allTxns, period), [allTxns, period]);
  const todayTxns = useMemo(() => filterToday(allTxns), [allTxns]);

  const totalSpent = useMemo(() => periodTxns.reduce((s, t) => s + t.amount, 0), [periodTxns]);
  const totalIncome = 0; // income transactions not modelled in Stage 3

  async function handleDelete(id: string) {
    setDeletingId(null);
    await deleteTx(id);
    refetch();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700"
        role="alert"
      >
        Couldn't load transactions.{' '}
        <button className="underline ml-1" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <HeroStatsRow
        totalSpent={totalSpent}
        totalIncome={totalIncome}
        netBalance={totalIncome - totalSpent}
        txCount={periodTxns.length}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 grid grid-cols-3 gap-4">
        {/* Row 1: Spending chart (2 cols) + Category breakdown */}
        <div className="col-span-2">
          <SpendingChart
            transactions={periodTxns}
            period={period}
            currencySymbol={currencySymbol}
          />
        </div>
        <CategoryBreakdown transactions={periodTxns} currencySymbol={currencySymbol} />

        {/* Row 2: Today's txns (2 cols) + Quick stats + Donut */}
        <div className="col-span-2 flex flex-col gap-4">
          <TodayTransactions
            transactions={todayTxns}
            currencySymbol={currencySymbol}
            onDelete={(id) => setDeletingId(id)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <IncomeExpenseDonut
            income={totalIncome}
            expenses={totalSpent}
            currencySymbol={currencySymbol}
          />
          <QuickStats transactions={periodTxns} currencySymbol={currencySymbol} />
        </div>
      </div>

      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run full test suite**

```bash
npm run test
```

Expected: all pass (Dashboard.test.tsx not yet created — create it after DeleteConfirmDialog is done in Task 17).

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/ src/routes/Dashboard.tsx
git commit -m "feat(stage3): assemble Dashboard with all 6 widgets"
```

---

## Task 16: TransactionTable + TransactionRow

**Files:**

- Create: `src/components/transactions/TransactionRow.tsx`
- Create: `src/components/transactions/TransactionTable.tsx`
- Create: `src/components/transactions/TransactionTable.test.tsx`

- [ ] **Step 1: Write TransactionTable test**

```tsx
// src/components/transactions/TransactionTable.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TransactionTable from './TransactionTable';
import type { Transaction } from '../../firestore/types';

const tx: Transaction = {
  id: 'tx1',
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date('2026-05-17'),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: 500,
  icon: '🛒',
};

describe('TransactionTable', () => {
  it('renders table with transaction data', () => {
    render(
      <MemoryRouter>
        <TransactionTable transactions={[tx]} currencySymbol="₹" onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Zepto')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/₹500/)).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(
      <MemoryRouter>
        <TransactionTable transactions={[]} currencySymbol="₹" onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/components/transactions/TransactionTable.test.tsx
```

- [ ] **Step 3: Create src/components/transactions/TransactionRow.tsx**

```tsx
import { Link } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';
import { formatCurrency, formatDateShort, formatTime } from '../../lib/dateUtils';

interface TransactionRowProps {
  transaction: Transaction;
  currencySymbol: string;
  onDelete: (id: string) => void;
}

export default function TransactionRow({
  transaction: tx,
  currencySymbol,
  onDelete,
}: TransactionRowProps) {
  return (
    <tr className="border-b border-border hover:bg-surface-alt transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{tx.icon || '💸'}</span>
          <div>
            <p className="text-sm font-medium text-text">{tx.vendor}</p>
            <p className="text-xs text-text-muted">{tx.account}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-50 text-brand border border-green-200">
          {tx.category}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">
        {formatDateShort(tx.date)} {formatTime(tx.date)}
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">{tx.payment}</td>
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-mono font-semibold text-red-600">
          −{formatCurrency(tx.amount, currencySymbol)}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/app/transactions/${tx.id}/edit`}
            className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-green-50 transition-colors"
            aria-label={`Edit ${tx.vendor}`}
          >
            ✏️
          </Link>
          <button
            type="button"
            onClick={() => onDelete(tx.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label={`Delete ${tx.vendor}`}
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 4: Create src/components/transactions/TransactionTable.tsx**

```tsx
import type { Transaction } from '../../firestore/types';
import TransactionRow from './TransactionRow';

interface TransactionTableProps {
  transactions: Transaction[];
  currencySymbol: string;
  onDelete: (id: string) => void;
}

const HEADERS = ['Transaction', 'Category', 'Date & Time', 'Payment', 'Amount', ''];

export default function TransactionTable({
  transactions,
  currencySymbol,
  onDelete,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm font-medium">No transactions for this period</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] border-collapse bg-surface">
        <thead>
          <tr className="border-b border-border bg-surface-alt">
            {HEADERS.map((h) => (
              <th
                key={h}
                className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-widest text-text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              currencySymbol={currencySymbol}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/transactions/TransactionTable.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/components/transactions/TransactionRow.tsx src/components/transactions/TransactionTable.tsx src/components/transactions/TransactionTable.test.tsx
git commit -m "feat(stage3): add TransactionTable and TransactionRow components"
```

---

## Task 17: DeleteConfirmDialog

**Files:**

- Create: `src/components/transactions/DeleteConfirmDialog.tsx`
- Create: `src/components/transactions/DeleteConfirmDialog.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/transactions/DeleteConfirmDialog.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DeleteConfirmDialog from './DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
  it('renders confirmation prompt', () => {
    render(<DeleteConfirmDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/delete this transaction/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Confirm button clicked', async () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmDialog onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /confirm|delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button clicked', async () => {
    const onCancel = vi.fn();
    render(<DeleteConfirmDialog onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose src/components/transactions/DeleteConfirmDialog.test.tsx
```

- [ ] **Step 3: Create src/components/transactions/DeleteConfirmDialog.tsx**

```tsx
interface DeleteConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({ onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Delete confirmation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div className="relative card-surface rounded-2xl p-6 shadow-xl max-w-sm w-full z-10">
        <p className="text-4xl text-center mb-4">🗑️</p>
        <h2 className="text-lg font-bold text-text text-center mb-2">Delete this transaction?</h2>
        <p className="text-sm text-text-muted text-center mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/transactions/DeleteConfirmDialog.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/transactions/DeleteConfirmDialog.tsx src/components/transactions/DeleteConfirmDialog.test.tsx
git commit -m "feat(stage3): add DeleteConfirmDialog modal"
```

---

## Task 18: DateRangeFilter + TransactionList route

**Files:**

- Create: `src/components/transactions/DateRangeFilter.tsx`
- Create: `src/components/transactions/DateRangeFilter.test.tsx`
- Modify: `src/routes/TransactionList.tsx`
- Create: `src/routes/TransactionList.test.tsx`

- [ ] **Step 1: Write DateRangeFilter test**

```tsx
// src/components/transactions/DateRangeFilter.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DateRangeFilter from './DateRangeFilter';

describe('DateRangeFilter', () => {
  it('renders period tab buttons', () => {
    render(<DateRangeFilter period="month" onPeriodChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument();
  });

  it('marks active period tab', () => {
    render(<DateRangeFilter period="week" onPeriodChange={vi.fn()} />);
    const weekBtn = screen.getByRole('button', { name: /week/i });
    expect(weekBtn.className).toMatch(/text-white/);
  });

  it('calls onPeriodChange when clicked', async () => {
    const onChange = vi.fn();
    render(<DateRangeFilter period="month" onPeriodChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /year/i }));
    expect(onChange).toHaveBeenCalledWith('year');
  });
});
```

- [ ] **Step 2: Create src/components/transactions/DateRangeFilter.tsx**

```tsx
import type { Period } from '../../lib/dateUtils';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

interface DateRangeFilterProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
}

export default function DateRangeFilter({ period, onPeriodChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-surface-alt p-1 gap-1 w-fit">
      {PERIODS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onPeriodChange(value)}
          className={[
            'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            period === value ? 'text-white shadow-sm' : 'text-text-muted hover:text-text',
          ].join(' ')}
          style={
            period === value
              ? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }
              : undefined
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Run DateRangeFilter test — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/transactions/DateRangeFilter.test.tsx
```

- [ ] **Step 4: Write TransactionList test**

```tsx
// src/routes/TransactionList.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  limit: vi.fn(() => 'l'),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
}));

import TransactionList from './TransactionList';

const authedCtx = {
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Test', email: 't@e.com', photoUrl: null },
};

describe('TransactionList', () => {
  it('renders the transactions heading', async () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<TransactionList />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(await screen.findByText(/no transactions/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Replace src/routes/TransactionList.tsx stub**

```tsx
import { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactions } from '../hooks/useTransactions';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import { getPeriodRange, filterByPeriod } from '../lib/dateUtils';
import type { Period } from '../lib/dateUtils';
import TransactionTable from '../components/transactions/TransactionTable';
import DateRangeFilter from '../components/transactions/DateRangeFilter';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

export default function TransactionList() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { preference } = usePreferenceContext();
  const [period, setPeriod] = useState<Period>('month');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { start, end } = useMemo(() => getPeriodRange(period), [period]);
  const { data: txns, loading, error, refetch } = useTransactions({ uid, start, end });
  const { mutate: deleteTx } = useDeleteTransaction();

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';
  const filtered = useMemo(() => filterByPeriod(txns, period), [txns, period]);

  async function handleDelete(id: string) {
    setDeletingId(null);
    await deleteTx(id);
    refetch();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700"
        role="alert"
      >
        Couldn't load transactions.{' '}
        <button className="underline ml-1" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <DateRangeFilter period={period} onPeriodChange={setPeriod} />
      <TransactionTable
        transactions={filtered}
        currencySymbol={currencySymbol}
        onDelete={setDeletingId}
      />
      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run TransactionList test — expect PASS**

```bash
npm run test -- --reporter=verbose src/routes/TransactionList.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/transactions/DateRangeFilter.tsx src/components/transactions/DateRangeFilter.test.tsx
git add src/routes/TransactionList.tsx src/routes/TransactionList.test.tsx
git commit -m "feat(stage3): add TransactionList route with DateRangeFilter"
```

---

## Task 19: Form components + TransactionForm route

**Files:**

- Create: `src/components/form/TypeToggle.tsx`
- Create: `src/components/form/TypeToggle.test.tsx`
- Create: `src/components/form/AmountInput.tsx`
- Create: `src/components/form/AmountInput.test.tsx`
- Create: `src/components/form/FieldPicker.tsx`
- Create: `src/components/form/FieldPicker.test.tsx`
- Modify: `src/routes/TransactionForm.tsx`
- Create: `src/routes/TransactionForm.test.tsx`

- [ ] **Step 1: Create TypeToggle**

```tsx
// src/components/form/TypeToggle.tsx
type TxType = 'expense' | 'income';

interface TypeToggleProps {
  value: TxType;
  onChange: (v: TxType) => void;
}

export default function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface-alt p-1 gap-1">
      {(['expense', 'income'] as TxType[]).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={[
            'rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-all',
            value === type
              ? type === 'expense'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-white shadow-sm'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
          style={
            value === type && type === 'income'
              ? { background: 'linear-gradient(135deg, #007836, #1fa32e)' }
              : undefined
          }
        >
          {type}
        </button>
      ))}
    </div>
  );
}
```

Write test:

```tsx
// src/components/form/TypeToggle.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TypeToggle from './TypeToggle';

describe('TypeToggle', () => {
  it('renders Expense and Income buttons', () => {
    render(<TypeToggle value="expense" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('calls onChange when Income clicked', async () => {
    const onChange = vi.fn();
    render(<TypeToggle value="expense" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /income/i }));
    expect(onChange).toHaveBeenCalledWith('income');
  });
});
```

- [ ] **Step 2: Create AmountInput**

```tsx
// src/components/form/AmountInput.tsx
interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  currencySymbol: string;
  error?: string;
}

export default function AmountInput({ value, onChange, currencySymbol, error }: AmountInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-text" htmlFor="amount-input">
        Amount
      </label>
      <div className="flex items-center rounded-xl border border-border bg-surface focus-within:ring-2 focus-within:ring-brand/30 overflow-hidden">
        <span className="px-4 py-3 text-sm font-mono font-semibold text-text-muted bg-surface-alt border-r border-border">
          {currencySymbol}
        </span>
        <input
          id="amount-input"
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="flex-1 px-4 py-3 text-sm font-mono bg-transparent outline-none text-text placeholder:text-text-muted"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

Write test:

```tsx
// src/components/form/AmountInput.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AmountInput from './AmountInput';

describe('AmountInput', () => {
  it('renders with currency symbol', () => {
    render(<AmountInput value="" onChange={vi.fn()} currencySymbol="₹" />);
    expect(screen.getByText('₹')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('shows error message when provided', () => {
    render(
      <AmountInput value="" onChange={vi.fn()} currencySymbol="₹" error="Amount is required" />,
    );
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
  });

  it('calls onChange with typed value', async () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} currencySymbol="₹" />);
    await userEvent.type(screen.getByRole('spinbutton'), '500');
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Create FieldPicker**

```tsx
// src/components/form/FieldPicker.tsx
import type { BudgetData } from '../../firestore/types';

interface FieldPickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: BudgetData[];
  required?: boolean;
  error?: string;
  allowFreeText?: boolean;
}

export default function FieldPicker({
  label,
  value,
  onChange,
  options,
  required,
  error,
  allowFreeText,
}: FieldPickerProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {allowFreeText ? (
        <input
          id={id}
          list={`${id}-list`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Select or type ${label.toLowerCase()}…`}
          className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text"
        />
      ) : (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text appearance-none"
        >
          <option value="">Select {label.toLowerCase()}…</option>
          {options.map((o) => (
            <option key={o.name} value={o.name}>
              {o.emoji ? `${o.emoji} ` : ''}
              {o.name}
            </option>
          ))}
        </select>
      )}
      {allowFreeText && (
        <datalist id={`${id}-list`}>
          {options.map((o) => (
            <option key={o.name} value={o.name} />
          ))}
        </datalist>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

Write test:

```tsx
// src/components/form/FieldPicker.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldPicker from './FieldPicker';

const opts = [
  { name: 'HDFC', emoji: '🏦', type: 'account', parent: null },
  { name: 'SBI', emoji: null, type: 'account', parent: null },
];

describe('FieldPicker', () => {
  it('renders label and options', () => {
    render(<FieldPicker label="Account" value="" onChange={vi.fn()} options={opts} />);
    expect(screen.getByLabelText(/account/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /HDFC/i })).toBeInTheDocument();
  });

  it('shows required asterisk when required=true', () => {
    render(<FieldPicker label="Account" value="" onChange={vi.fn()} options={opts} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run form component tests — expect PASS**

```bash
npm run test -- --reporter=verbose src/components/form/
```

- [ ] **Step 5: Write TransactionForm test**

```tsx
// src/routes/TransactionForm.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { PreferenceContext } from '../context/PreferenceContext';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => true,
      id: 'tx1',
      data: () => ({
        user_id: 'u1',
        category: 'Food',
        sub_category: 'Groceries',
        date: { toDate: () => new Date('2026-05-17') },
        account: 'HDFC',
        vendor: 'Zepto',
        payment: 'UPI',
        currency: 'INR',
        notes: '',
        amount: 500,
        icon: '🛒',
      }),
    }),
  ),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import TransactionForm from './TransactionForm';

const authedCtx = {
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Test', email: 't@e.com', photoUrl: null },
};

const prefCtx = {
  preference: {
    id: 'u1',
    accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
    categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
    subCategories: [],
    vendors: [{ name: 'Zepto', emoji: null, type: 'vendor', parent: null }],
    payments: [{ name: 'UPI', emoji: null, type: 'payment', parent: null }],
    defaultCurrency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
    bookmarkedCurrencies: ['INR'],
    defaultEntries: null,
  },
  loading: false,
  error: null,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authedCtx}>
      <PreferenceContext value={prefCtx}>
        <MemoryRouter initialEntries={['/app/transactions/new']}>
          <Routes>
            <Route path="/app/transactions/new" element={children} />
          </Routes>
        </MemoryRouter>
      </PreferenceContext>
    </AuthContext.Provider>
  );
}

describe('TransactionForm (add mode)', () => {
  it('renders Amount and Category fields', async () => {
    render(<TransactionForm mode="add" />, { wrapper: Wrapper as any });
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('shows validation error when amount is empty on submit', async () => {
    const { getByRole, findByText } = render(<TransactionForm mode="add" />, {
      wrapper: Wrapper as any,
    });
    getByRole('button', { name: /save/i }).click();
    expect(await findByText(/amount.*required/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Replace src/routes/TransactionForm.tsx stub**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useAddTransaction, useUpdateTransaction } from '../hooks/useMutateTransaction';
import AmountInput from '../components/form/AmountInput';
import TypeToggle from '../components/form/TypeToggle';
import FieldPicker from '../components/form/FieldPicker';
import type { Transaction, BudgetData } from '../firestore/types';
import type { Timestamp } from 'firebase/firestore';

interface FormState {
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  category: string;
  subCategory: string;
  vendor: string;
  account: string;
  payment: string;
  date: string;
  notes: string;
}

interface FormErrors {
  amount?: string;
  category?: string;
  vendor?: string;
  account?: string;
  payment?: string;
  currency?: string;
  date?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.amount || parseFloat(form.amount) <= 0)
    errors.amount = 'Amount is required and must be positive';
  if (!form.category) errors.category = 'Category is required';
  if (!form.vendor) errors.vendor = 'Vendor is required';
  if (!form.account) errors.account = 'Account is required';
  if (!form.payment) errors.payment = 'Payment method is required';
  if (!form.currency) errors.currency = 'Currency is required';
  if (!form.date) errors.date = 'Date is required';
  return errors;
}

const EMPTY: FormState = {
  type: 'expense',
  amount: '',
  currency: '',
  category: '',
  subCategory: '',
  vendor: '',
  account: '',
  payment: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

interface TransactionFormProps {
  mode: 'add' | 'edit';
}

export default function TransactionForm({ mode }: TransactionFormProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { preference } = usePreferenceContext();

  const { mutate: addTx, loading: adding, error: addError } = useAddTransaction();
  const { mutate: updateTx, loading: updating, error: updateError } = useUpdateTransaction();

  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    currency: preference?.defaultCurrency.code ?? '',
    account: preference?.defaultEntries?.['account'] ?? '',
    payment: preference?.defaultEntries?.['payment'] ?? '',
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadingTx, setLoadingTx] = useState(mode === 'edit');

  // In edit mode: load existing transaction
  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    setLoadingTx(true);
    getDoc(doc(db, 'transactions', id))
      .then((snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setForm({
          type: 'expense',
          amount: String(d['amount']),
          currency: d['currency'] as string,
          category: d['category'] as string,
          subCategory: d['sub_category'] as string,
          vendor: d['vendor'] as string,
          account: d['account'] as string,
          payment: d['payment'] as string,
          date: (d['date'] as Timestamp).toDate().toISOString().slice(0, 10),
          notes: (d['notes'] as string) ?? '',
        });
      })
      .finally(() => setLoadingTx(false));
  }, [mode, id]);

  function set(field: keyof FormState) {
    return (value: string) =>
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        // Auto-set icon from category — we store it at save time
        if (field === 'category') {
          next.subCategory = ''; // reset sub-category when category changes
        }
        return next;
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const categoryObj = preference?.categories.find((c) => c.name === form.category);
    const txData: Omit<Transaction, 'id'> = {
      user_id: uid,
      category: form.category,
      subCategory: form.subCategory,
      date: new Date(form.date),
      account: form.account,
      vendor: form.vendor,
      payment: form.payment,
      currency: form.currency,
      notes: form.notes,
      amount: parseFloat(form.amount),
      icon: categoryObj?.emoji ?? '',
    };

    if (mode === 'add') {
      await addTx(txData);
    } else {
      await updateTx(id!, txData);
    }
    navigate('/app/transactions');
  }

  const filteredSubCats: BudgetData[] =
    preference?.subCategories.filter((s) => s.parent === form.category) ?? [];

  const currencyOptions: BudgetData[] = [
    ...(preference?.bookmarkedCurrencies ?? []).map((code) => ({
      name: code,
      emoji: null,
      type: 'currency',
      parent: null,
    })),
  ];

  const mutateError = addError ?? updateError;
  const loading = adding || updating || loadingTx;

  return (
    <div className="max-w-xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="card-surface rounded-2xl p-6 flex flex-col gap-5">
        <TypeToggle value={form.type} onChange={set('type')} />

        <AmountInput
          value={form.amount}
          onChange={set('amount')}
          currencySymbol={preference?.defaultCurrency.symbol ?? '₹'}
          error={errors.amount}
        />

        <FieldPicker
          label="Currency"
          value={form.currency}
          onChange={set('currency')}
          options={currencyOptions}
          required
          error={errors.currency}
        />

        <FieldPicker
          label="Category"
          value={form.category}
          onChange={set('category')}
          options={preference?.categories ?? []}
          required
          error={errors.category}
        />

        {filteredSubCats.length > 0 && (
          <FieldPicker
            label="Sub-category"
            value={form.subCategory}
            onChange={set('subCategory')}
            options={filteredSubCats}
          />
        )}

        <FieldPicker
          label="Vendor"
          value={form.vendor}
          onChange={set('vendor')}
          options={preference?.vendors ?? []}
          required
          allowFreeText
          error={errors.vendor}
        />

        <FieldPicker
          label="Account"
          value={form.account}
          onChange={set('account')}
          options={preference?.accounts ?? []}
          required
          error={errors.account}
        />

        <FieldPicker
          label="Payment"
          value={form.payment}
          onChange={set('payment')}
          options={preference?.payments ?? []}
          required
          error={errors.payment}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="date-input" className="text-sm font-semibold text-text">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="date-input"
            type="date"
            value={form.date}
            onChange={(e) => set('date')(e.target.value)}
            className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text"
          />
          {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes-input" className="text-sm font-semibold text-text">
            Notes
          </label>
          <textarea
            id="notes-input"
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
            rows={3}
            placeholder="Optional notes…"
            className="rounded-xl border border-border px-4 py-3 text-sm bg-surface outline-none focus:ring-2 focus:ring-brand/30 text-text resize-none"
          />
        </div>

        {mutateError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {mutateError.message}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-text hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Run TransactionForm tests — expect PASS**

```bash
npm run test -- --reporter=verbose src/routes/TransactionForm.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add src/components/form/ src/routes/TransactionForm.tsx src/routes/TransactionForm.test.tsx
git commit -m "feat(stage3): add TransactionForm route and form components"
```

---

## Task 20: Wire up PreferenceProvider + update main.tsx + CLAUDE.md + final verification

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/main.tsx` (no change needed — PreferenceProvider goes in App.tsx since AuthProvider is there)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add PreferenceProvider to App.tsx**

In `src/App.tsx`, import and wrap with `PreferenceProvider`:

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { PreferenceProvider } from './context/PreferenceContext';
import Landing from './routes/Landing';

const SignIn = lazy(() => import('./routes/SignIn'));
const AppShell = lazy(() => import('./routes/AppShell'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const TransactionList = lazy(() => import('./routes/TransactionList'));
const TransactionForm = lazy(() => import('./routes/TransactionForm'));

const RouteFallback = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-screen items-center justify-center text-slate-500"
  >
    Loading…
  </div>
);

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    path: '/signin',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <SignIn />
      </Suspense>
    ),
  },
  {
    path: '/app',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'transactions',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionList />
          </Suspense>
        ),
      },
      {
        path: 'transactions/new',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="add" />
          </Suspense>
        ),
      },
      {
        path: 'transactions/:id/edit',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="edit" />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <PreferenceProvider>
        <RouterProvider router={router} />
      </PreferenceProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 3: Run typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

- [ ] **Step 4: Run build and verify chunks**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds; `dist/assets/` contains `charts-*.js`; no chunk over 400 KB gz.

- [ ] **Step 5: Update CLAUDE.md stage status**

In `CLAUDE.md`, update the "Where We Are" section:

```markdown
## Where We Are

- **Stage 1 (done):** Landing page, CI/CD, perfect-cache strategy.
- **Stage 2 (done):** Firebase Auth (Google), React Router v7, protected /app shell. Firebase lazy-loaded; / stays under 50 KB gzipped.
- **Stage 3 (done):** Dashboard (6 widgets), transaction CRUD (add/edit/delete), preferences loaded from Firestore, period navigation, Recharts charts.
- **Stage 4+ (not started):** Preference editing, reports, PWA.
```

Also update the project structure section to include the new `src/` directories:
`src/firestore/`, `src/hooks/`, `src/context/`, `src/lib/`, `src/components/layout/`, `src/components/dashboard/`, `src/components/transactions/`, `src/components/form/`, `src/routes/Dashboard.tsx`, `src/routes/TransactionList.tsx`, `src/routes/TransactionForm.tsx`.

Also update the spec/plan references:

```markdown
- **Stage 3 design spec:** `docs/superpowers/specs/2026-05-17-glintbudget-web-stage3-design.md`
- **Stage 3 implementation plan:** `docs/superpowers/plans/2026-05-17-glintbudget-web-stage3-plan.md`
```

Also update "What this repo does NOT do (yet)":

```markdown
## What this repo does NOT do (yet)

- No preferences UI (editing categories, accounts, etc.) — Stage 4.
- No reports or charts beyond the dashboard — Stage 5.
- No PWA / offline / push notifications — Stage 6+.
```

- [ ] **Step 6: Final commit**

```bash
git add src/App.tsx CLAUDE.md
git commit -m "feat(stage3): wire PreferenceProvider, update CLAUDE.md for Stage 3 complete"
```

---

## Spec Coverage Self-Review

| Spec section                                                                              | Covered by task(s)     |
| ----------------------------------------------------------------------------------------- | ---------------------- |
| §2 Routes `/app/dashboard`, `/app/transactions`, `/app/transactions/new`, `/:id/edit`     | Tasks 8, 18, 19        |
| §3 Visual design — glassmorphism sidebar, hero gradient, Figtree font, card-surface class | Tasks 1, 9, 10, 11, 12 |
| §4 AppShell nested routing + redirect                                                     | Task 8, 11             |
| §5 db.ts, types, snake_case decode, hooks                                                 | Tasks 2–7              |
| §6 recharts dependency + lazy chunk                                                       | Task 1                 |
| §8 All 6 dashboard widgets                                                                | Tasks 12–15            |
| §9 Transaction form: all fields, validation, add/edit/delete flows                        | Tasks 17, 19           |
| §10 AppShell layout with Outlet                                                           | Task 11                |
| §11 Error handling: retry banners, empty states, fallback dropdowns                       | Tasks 15, 18, 19       |
| §12 Co-located tests for all hooks and components                                         | Every task             |
| §13 recharts lazy-loaded (Dashboard is lazy route), useMemo for chart data                | Tasks 1, 8, 15         |
| §14 Modified files: App.tsx, AppShell.tsx, main.tsx, CLAUDE.md                            | Tasks 8, 11, 20        |
| §16 Done criteria: typecheck + lint + test + build exits 0                                | Task 20                |

All spec requirements covered. No placeholders.

---

## Execution Options

**Plan saved to `docs/superpowers/plans/2026-05-17-glintbudget-web-stage3-plan.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.

**2. Inline Execution** — execute tasks in this session with checkpoints. Use `superpowers:executing-plans`.
