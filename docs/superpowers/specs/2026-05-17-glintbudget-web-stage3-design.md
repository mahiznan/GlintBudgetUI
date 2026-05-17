# GlintBudget Web — Stage 3 Design Spec

**Date:** 2026-05-17
**Status:** Draft — pending owner review
**Author:** Claude Code (brainstorming session)

---

## §1 Goal

Add a fully functional personal-finance dashboard and full transaction CRUD to the GlintBudget web app. After Stage 3 the web app is a standalone product: users can view, add, edit, and delete all their transactions from the browser without touching the iOS app.

---

## §2 Scope

### In scope
- `/app/dashboard` — hero stats, spending chart, category breakdown, income/expense donut, today's transactions table, quick stats
- `/app/transactions` — paginated, date-filtered transaction list
- `/app/transactions/new` — add transaction form
- `/app/transactions/:id/edit` — edit transaction form
- Delete transaction (inline in list and dashboard)
- Read `preference/{uid}` once on login to populate form dropdowns (categories, sub-categories, accounts, vendors, payments, default currency)
- Period navigation: Day · Week · Month · Quarter · Year (controls chart + stats)

### Out of scope (future stages)
- Editing preference metadata (categories, accounts, etc.) — Stage 4
- Reports & charts beyond the dashboard widgets — Stage 5
- Currency conversion — Stage 5
- PWA / offline — Stage 6
- Real-time Firestore listeners — nice-to-have in Stage 4

---

## §3 Visual Design

**Direction:** Bold & Colorful with glassmorphism (approved in brainstorming session 2026-05-17).

**Layout:** Desktop-first full-screen web app. Sidebar + top bar + scrollable bento content area.

### Layout structure
```
┌─────────────┬────────────────────────────────────────────┐
│  Sidebar    │  Top Bar (title, search, date range, +Add) │
│  220px      ├────────────────────────────────────────────┤
│  dark green │  Scrollable content                        │
│  gradient   │  ┌──────────────────────────────────────┐  │
│             │  │  Hero stats row (full width)          │  │
│  Nav items: │  └──────────────────────────────────────┘  │
│  Dashboard  │  ┌──────────────┬──────────┬───────────┐  │
│  Transact.  │  │ Spend Chart  │ By Cat.  │ Donut     │  │
│  Reports    │  │ (2 col)      │          │           │  │
│  ─────────  │  ├──────────────┴──────────┤ Quick     │  │
│  Categories │  │ Today's Txns (2 col)    │ Stats     │  │
│  Accounts   │  └─────────────────────────┴───────────┘  │
│  Currencies │                                            │
│  Preference │                                            │
│  ─────────  │                                            │
│  User card  │                                            │
└─────────────┴────────────────────────────────────────────┘
```

### Colour tokens (existing — do not change)
| Token | Value | Usage |
|---|---|---|
| `--color-brand` | `#007836` | CTAs, active nav, chart fill, FAB |
| `--color-brand-dark` | `#005c2a` | Sidebar gradient deep end, hover states |
| `--color-accent` | `#1fa32e` | Income amounts, gradient mid-point |
| `--color-highlight` | `#96bf0d` | Lime — current-bar highlight, gradient text end |

### Gradient rules
- **Sidebar:** `linear-gradient(180deg, #003d1c, #005c2a, #007836)` with ambient radial blobs
- **Hero stats row:** `linear-gradient(120deg, #003d1c → #007836 → #1fa32e → #e8f5e9)` fading to white
- **Hero balance text:** gradient text (`#fff → #d1fae5 → #96bf0d`)
- **Cards:** `linear-gradient(135deg, #f0fdf4, #fff)` with `border: 1px solid #d1fae5`
- **Income amounts:** gradient text (`#007836 → #1fa32e`)
- **Expense amounts:** `#dc2626` (plain red — universal convention)
- **Active period tab / Add button:** `linear-gradient(135deg, #007836, #1fa32e)`
- **Category chips (in form):** each category colour blended with white (keep category colours from iOS)
- **Gradient text on balance/income:** CSS `background-clip: text` technique

---

## §4 Routes

AppShell becomes a **layout route** with nested child routes rendered into an `<Outlet>`. The existing `/app` route becomes the dashboard.

```
/                   → Landing (unchanged)
/signin             → SignIn (unchanged)
/app                → AppShell layout (RequireAuth)
  /app              → redirect → /app/dashboard
  /app/dashboard    → Dashboard
  /app/transactions → TransactionList
  /app/transactions/new       → TransactionForm (mode=add)
  /app/transactions/:id/edit  → TransactionForm (mode=edit)
```

`App.tsx` changes: replace the single `/app` route with a parent route + children using React Router v7 nested routing.

---

## §5 Data Layer

### 5.1 New Firebase module

Create `src/firebase/db.ts` — exports the Firestore instance (mirrors the pattern of `client.ts`/`auth.ts`):

```ts
import { getFirestore } from 'firebase/firestore';
import { app } from './client';
export const db = getFirestore(app);
```

No new env vars needed — Firestore uses the same Firebase app.

### 5.2 TypeScript types (`src/firestore/types.ts`)

Mirror the iOS `Transaction` and `Preference` models exactly. Field names match Firestore document keys.

```ts
// Mirrors iOS Transaction.CodingKeys
export interface Transaction {
  id: string;           // UUID string
  user_id: string;
  category: string;
  subCategory: string;  // Firestore key: sub_category — decode on read
  date: Date;           // Firestore Timestamp → Date on read
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

// Mirrors iOS Preference
export interface Preference {
  id: string;  // = user uid (document ID)
  accounts: BudgetData[];
  categories: BudgetData[];
  subCategories: BudgetData[];  // Firestore key: subCategories
  vendors: BudgetData[];
  payments: BudgetData[];
  defaultCurrency: Currency;    // Firestore key: default_currency
  bookmarkedCurrencies: string[]; // Firestore key: frequent_currencies
  // defaultEntries maps BudgetDataType string → default value name,
  // e.g. { "account": "HDFC Bank", "currency": "USD" }
  // Used to pre-fill form fields. Stored as a plain object in Firestore.
  defaultEntries: Record<string, string> | null;
}
```

**Important:** Firestore document fields use snake_case for some fields (matching iOS CodingKeys). Decode carefully on read:
- `sub_category` → `subCategory`
- `default_currency` → `defaultCurrency`
- `frequent_currencies` → `bookmarkedCurrencies`
- `default_entries` → `defaultEntries`
- `date` is a Firestore Timestamp — call `.toDate()` on read

### 5.3 Firestore queries

| Operation | Collection | Query |
|---|---|---|
| Dashboard transactions | `transactions` | `where('user_id','==',uid)`, `orderBy('date','desc')`, `limit(200)` |
| Transaction list | `transactions` | same + `where('date','>=',start)`, `where('date','<=',end)` |
| Add transaction | `transactions` | `addDoc` |
| Update transaction | `transactions/{id}` | `updateDoc` |
| Delete transaction | `transactions/{id}` | `deleteDoc` |
| Preferences | `preference/{uid}` | `getDoc` once on login |

**Dashboard strategy:** fetch up to 200 most recent transactions once. Filter client-side for today's widget and chart grouping. Avoids extra round-trips and keeps the dashboard fast. Revisit with real-time listeners in Stage 4 if needed.

### 5.4 Data hooks (`src/hooks/`)

| Hook | Returns | Notes |
|---|---|---|
| `useTransactions(filter)` | `{ data, loading, error, refetch }` | filter = `{ start?: Date, end?: Date, limit?: number }` — dashboard passes `{ limit: 200 }`, list passes `{ start, end }` |
| `usePreferences()` | `{ data, loading, error }` | fetched once, cached in context |
| `useAddTransaction()` | `{ mutate, loading, error }` | |
| `useUpdateTransaction()` | `{ mutate, loading, error }` | |
| `useDeleteTransaction()` | `{ mutate, loading, error }` | |

All hooks manage loading/error state internally. No external state library needed for Stage 3. Preferences are stored in a `PreferenceContext` so any component can read them without prop-drilling.

---

## §6 New Dependencies

| Package | Purpose |
|---|---|
| `recharts` | Spending bar chart + donut chart — React-native, composable, ~50 KB gz |
| (firebase already installed) | `firebase/firestore` is part of the existing firebase package |

No additional state management library. React context + `useState`/`useEffect` is sufficient for Stage 3 data volume.

---

## §7 Component Architecture

```
src/
├── firebase/
│   └── db.ts                         NEW — Firestore instance
├── firestore/
│   └── types.ts                      NEW — Transaction, Preference, BudgetData, Currency
├── hooks/
│   ├── useTransactions.ts            NEW
│   ├── usePreferences.ts             NEW
│   └── useMutateTransaction.ts       NEW — add/update/delete
├── context/
│   └── PreferenceContext.tsx         NEW — wraps app, exposes preference data
├── routes/
│   ├── AppShell.tsx                  MODIFY — becomes layout with <Outlet>
│   ├── Dashboard.tsx                 NEW
│   ├── TransactionList.tsx           NEW
│   └── TransactionForm.tsx           NEW — mode: 'add' | 'edit'
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               NEW — extracted from AppShell
│   │   └── TopBar.tsx                NEW — extracted from AppShell
│   ├── dashboard/
│   │   ├── HeroStatsRow.tsx          NEW
│   │   ├── SpendingChart.tsx         NEW — Recharts BarChart
│   │   ├── CategoryBreakdown.tsx     NEW
│   │   ├── IncomeExpenseDonut.tsx    NEW — Recharts PieChart
│   │   ├── TodayTransactions.tsx     NEW — table, today only
│   │   └── QuickStats.tsx            NEW
│   ├── transactions/
│   │   ├── TransactionTable.tsx      NEW — shared by dashboard + list
│   │   ├── TransactionRow.tsx        NEW
│   │   ├── DateRangeFilter.tsx       NEW — Day/Week/Month/Quarter/Year tabs
│   │   └── DeleteConfirmDialog.tsx   NEW
│   └── form/
│       ├── AmountInput.tsx           NEW
│       ├── TypeToggle.tsx            NEW — Expense / Income
│       └── FieldPicker.tsx           NEW — dropdown from preference lists
├── lib/
│   └── dateUtils.ts                  NEW — period start/end helpers
```

---

## §8 Dashboard Widgets (detail)

### Period tab scope
The Day/Week/Month/Quarter/Year tabs in TopBar control: HeroStatsRow, SpendingChart, CategoryBreakdown, IncomeExpenseDonut, and QuickStats. **TodayTransactions always shows today's transactions regardless of selected period** — it is a fixed "what happened today" widget, not period-aware.

### HeroStatsRow
Full-width gradient banner. Shows: total spent (selected period), income (selected period), net balance, transaction count. Period controlled by TopBar tabs. Gradient text on balance amount.

### SpendingChart
`recharts` `<BarChart>`. X-axis = days (Month view) or weeks/months depending on period. Y-axis = expense amount. Current day/period bar uses lime gradient + tooltip. Tab strip: Day · Week · Month · Quarter · Year.

### CategoryBreakdown
Top 5 categories by spend. Each row: emoji icon + category name + % + amount + gradient progress bar. Link to full breakdown (Transaction list filtered by category — Stage 5).

### IncomeExpenseDonut
`recharts` `<PieChart>` with inner ring showing savings rate %. Legend: income (green gradient text), expenses (red), net (plain). Same period as dashboard.

### TodayTransactions
Table of today's transactions only. Columns: icon+name, category badge, time, account, payment, amount, edit/delete actions. "See all →" link goes to `/app/transactions`.

### QuickStats
Simple card: highest spend, avg per transaction, most used payment, top category, savings rate. Derived from same period data.

---

## §9 Transaction Form

### Fields (all required except notes)
| Field | Input type | Source |
|---|---|---|
| Type | Toggle (Expense/Income) | hardcoded |
| Amount | Number input | user |
| Currency | Dropdown | `preference.bookmarkedCurrencies` + `preference.defaultCurrency` |
| Category | Dropdown | `preference.categories` |
| Sub-category | Dropdown (filtered by parent) | `preference.subCategories` |
| Vendor | Dropdown + free text | `preference.vendors` |
| Account | Dropdown | `preference.accounts` |
| Payment | Dropdown | `preference.payments` |
| Date | Date picker | default today |
| Notes | Text area | optional |
| Icon | Auto-set from category emoji | not user-editable in Stage 3 |

### Add flow
1. User clicks "+ Add Transaction" → navigate to `/app/transactions/new`
2. Form pre-fills defaults from `preference.defaultEntries` and `preference.defaultCurrency`
3. User fills fields → "Save" → `addDoc` → navigate to `/app/transactions`
4. On error: inline error message below the form, stay on page

### Edit flow
1. User clicks ✏️ on any transaction row → navigate to `/app/transactions/:id/edit`
2. Load transaction by ID → pre-fill all fields
3. User edits → "Save" → `updateDoc` → navigate back
4. Cancel → navigate back without saving

### Delete flow
1. User clicks 🗑 → `<DeleteConfirmDialog>` (modal) asking "Delete this transaction?"
2. Confirm → `deleteDoc` → close modal → remove row from UI optimistically
3. On error: restore row, show toast error

### Validation (client-side before submit)
- Amount: required, must be a positive number
- Category: required
- Vendor: required
- Account: required
- Payment: required
- Currency: required (defaults to `defaultCurrency`)
- Date: required (defaults to today)

---

## §10 AppShell Restructure

Current AppShell renders a single page. It becomes a **layout route** with `<Outlet>` for child routes.

### New AppShell structure
```tsx
export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-surface-alt">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

The existing "Welcome back" content moves into `Dashboard.tsx`.

---

## §11 Error Handling

| Scenario | UI response |
|---|---|
| Firestore read fails (dashboard) | Red banner: "Couldn't load transactions. Retry." |
| Firestore read fails (preferences) | Dropdowns show empty with free-text fallback |
| Add/update fails | Inline error below form |
| Delete fails | Toast error, row restored |
| User has no transactions yet | Empty state illustration + "Add your first transaction" CTA |
| Preference document missing | Dropdowns allow free-text entry; no crash |

---

## §12 Testing Strategy

Each new component/hook ships with a co-located `*.test.tsx`. Firestore is mocked via `vi.mock('firebase/firestore')` — same pattern as the existing Firebase auth mocks.

| Test target | What to test |
|---|---|
| `useTransactions` | loading state, data mapping, error state |
| `usePreferences` | caches result, handles missing document |
| `useMutateTransaction` | optimistic update, rollback on error |
| `Dashboard` | renders all 6 widgets, shows loading skeleton |
| `TransactionForm` | required field validation, pre-fills defaults, calls addDoc/updateDoc |
| `DeleteConfirmDialog` | confirm calls deleteDoc, cancel does not |
| `SpendingChart` | renders bars, period tab switches data |
| `TransactionTable` | renders rows, edit/delete buttons present |

---

## §13 Performance Considerations

- Recharts is lazy-loaded (only Dashboard and Reports import it) — keeps landing chunk clean
- Dashboard data fetch: 200-transaction limit, one-time read on mount
- `PreferenceContext` fetches once after login; result is stable for the session
- Category breakdown and chart data computed with `useMemo` from raw transaction array
- No unnecessary re-renders: each widget receives its own derived slice of data

---

## §14 What Changes in Existing Files

| File | Change |
|---|---|
| `src/App.tsx` | Add nested child routes under `/app` |
| `src/routes/AppShell.tsx` | Becomes layout shell with `<Outlet>` |
| `src/components/UserMenu.tsx` | No change |
| `src/main.tsx` | Wrap with `<PreferenceProvider>` after `<AuthProvider>` |
| `CLAUDE.md` | Update project structure + stage status |
| `package.json` | Add `recharts` |
| `.github/workflows/deploy.yml` | No change needed |

---

## §15 Session-Resume Cheat Sheet

1. Read this file (§1–§14).
2. Check `git log --oneline -10` to see where implementation stopped.
3. Look in `docs/superpowers/plans/2026-05-17-glintbudget-web-stage3-plan.md` for unchecked tasks.
4. Key architectural decisions locked in here:
   - Nested routing under `/app` via React Router v7 `<Outlet>`
   - Firestore via `src/firebase/db.ts` + hooks in `src/hooks/`
   - Preferences in `PreferenceContext` — fetched once, no re-fetch
   - Recharts for charts (lazy-loaded)
   - No external state manager — React context is sufficient
   - `sub_category` → `subCategory` decode on Firestore read (matches iOS CodingKeys)
   - Icon field auto-set from category emoji — not user-editable in Stage 3

---

## §16 Stage 3 Done When

1. All plan tasks checked.
2. `npm run typecheck && npm run lint && npm run test && npm run build` exits 0.
3. Dashboard renders all 6 widgets with real Firestore data.
4. Add, edit, delete transactions all persist to Firestore and update UI.
5. Form dropdowns populated from `preference/{uid}`.
6. Period navigation (Day/Week/Month/Quarter/Year) updates all dashboard widgets.
7. `/app/transactions` shows full list with date filter.
8. Bundle budget: `/` still under 50 KB gz (Recharts and Firestore stay in lazy chunks).
