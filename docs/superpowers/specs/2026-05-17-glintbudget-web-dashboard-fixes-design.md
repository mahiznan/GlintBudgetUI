# GlintBudget Web — Dashboard & Form Fixes Design

**Date:** 2026-05-17  
**Status:** Approved

---

## 1. Scope

Five focused fixes to align the web app with the iOS source-of-truth and improve dashboard usability:

1. Amount sign convention wired up in TransactionForm (expense = negative, income = positive)
2. Dashboard HeroStatsRow shows real totalIncome / totalExpenses / txCount
3. CategoryBreakdown, SpendingChart, QuickStats filter to expenses only
4. Period switch (Day/Week/Month/Quarter/Year) visible on Dashboard only
5. All dashboard widgets (including the transactions list) respond to period changes; Month/Quarter/Year list is paginated (page-based, 10/page, date desc)

---

## 2. Amount Sign Convention

### Rule (mirrors iOS `AddViewModel.swift`)

- `amount < 0` → expense
- `amount > 0` → income

### TransactionForm changes

- **Save (`handleSubmit`):** `amount = type === 'expense' ? -Math.abs(parsed) : Math.abs(parsed)`
- **Load (edit mode `useEffect`):** infer `type` from stored sign (`< 0` → `'expense'`, `>= 0` → `'income'`); display `Math.abs(stored)` in the amount field
- `TypeToggle` stays for UX — user picks expense/income; the form applies the sign on save
- `validate()` already requires `amount > 0` (user always types a positive number)

---

## 3. Dashboard Derived Values

### Dashboard.tsx

Replace `const totalIncome = 0` with proper `useMemo` derivations:

```ts
const totalIncome = useMemo(
  () => periodTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
  [periodTxns],
);

const totalExpenses = useMemo(
  () => Math.abs(periodTxns.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
  [periodTxns],
);

const netBalance = totalIncome - totalExpenses;
```

Pass `totalExpenses` (not `totalSpent`) to `IncomeExpenseDonut`. Pass `totalIncome`, `totalExpenses`, `netBalance`, `periodTxns.length` to `HeroStatsRow`.

Remove `todayTxns` derived variable — `PeriodTransactions` widget receives `periodTxns` directly.

### HeroStatsRow — no prop interface change needed

Props: `totalSpent` → renamed to `totalExpenses` for clarity. Labels: "Net Balance", "Income", "Expenses", "Transactions".

---

## 4. Expense-Only Widgets

### CategoryBreakdown.tsx

- Pre-filter: `const expenseTxns = transactions.filter(t => t.amount < 0)`
- All totals use `Math.abs(t.amount)`
- Percentage denominator = total of expense amounts (absolute)

### SpendingChart.tsx

- Change `t.amount > 0` → `t.amount < 0` in `buildChartData`
- Use `Math.abs(t.amount)` for bar heights

### QuickStats.tsx

- Change `t.amount > 0` → `t.amount < 0`
- Use `Math.abs(t.amount)` for avg/highest calculations

---

## 5. Period Switch Visibility

### AppShell.tsx

```tsx
<TopBar
  ...
  showPeriodSwitch={location.pathname === '/app/dashboard'}
/>
```

### TopBar.tsx

- Add `showPeriodSwitch?: boolean` prop (default `false`)
- Render period pill-tabs only when `showPeriodSwitch === true`
- `+ Add Transaction` button always visible

---

## 6. Period-Aware Transactions Widget

### Rename & dynamic heading

`TodayTransactions` component renamed to `PeriodTransactions`. Heading label is period-driven:

| Period  | Heading      |
| ------- | ------------ |
| day     | Today        |
| week    | This Week    |
| month   | This Month   |
| quarter | This Quarter |
| year    | This Year    |

### Pagination

- Day / Week: show all transactions (no pagination UI; typically few rows)
- Month / Quarter / Year: paginate at **10 rows per page**, ordered by date desc (already the order from `useTransactions`)
- Pagination controls: `← Prev  Page N of M  Next →`
- Page resets to 1 whenever the `transactions` prop reference changes (period or data refresh)
- Page state is local to `PeriodTransactions` via `useState`

### Dashboard.tsx change

```tsx
// Before
<TodayTransactions transactions={todayTxns} ... />

// After
<PeriodTransactions transactions={periodTxns} period={period} ... />
```

---

## 7. Files Touched

| File                                             | Change                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `src/routes/TransactionForm.tsx`                 | Apply sign on save; infer type on load                       |
| `src/routes/Dashboard.tsx`                       | Fix derived values; remove todayTxns; use PeriodTransactions |
| `src/components/layout/TopBar.tsx`               | Add `showPeriodSwitch` prop                                  |
| `src/routes/AppShell.tsx`                        | Pass `showPeriodSwitch` based on pathname                    |
| `src/components/dashboard/HeroStatsRow.tsx`      | Rename prop `totalSpent` → `totalExpenses`                   |
| `src/components/dashboard/CategoryBreakdown.tsx` | Filter expenses only                                         |
| `src/components/dashboard/SpendingChart.tsx`     | Fix expense filter direction                                 |
| `src/components/dashboard/QuickStats.tsx`        | Fix expense filter direction                                 |
| `src/components/dashboard/TodayTransactions.tsx` | Rename → PeriodTransactions; add period prop + pagination    |

No new files. No Firestore schema changes. No new hooks.

---

## 8. Testing

Each touched component has a co-located `.test.tsx`. Tests updated to:

- Assert negative amounts are treated as expenses
- Assert positive amounts are treated as income
- Assert `CategoryBreakdown` excludes income transactions
- Assert `PeriodTransactions` shows correct page slice and page count
- Assert `TopBar` hides period switch when `showPeriodSwitch={false}`
