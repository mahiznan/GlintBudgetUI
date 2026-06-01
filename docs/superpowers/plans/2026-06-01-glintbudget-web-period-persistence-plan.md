# Period Preference Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the user's preferred period (week, month, etc.) so it's restored when the app reloads.

**Architecture:** Add `defaultPeriod` field to Preference type, initialize AppShell's period state from it, and sync period changes back to Firestore via the existing `updatePreference` hook.

**Tech Stack:** React, TypeScript, Firestore, existing PreferenceContext and useUpdatePreference hooks

---

## Task 1: Add defaultPeriod Field to Preference Type

**Files:**
- Modify: `src/firestore/types.ts:34-48`

- [ ] **Step 1: Add defaultPeriod field to Preference interface**

Open `src/firestore/types.ts` and add the field after line 46 (after `spendingChartType`):

```typescript
// Mirrors iOS Preference (document ID = user uid)
export interface Preference {
  id: string;
  accounts: BudgetData[];
  categories: BudgetData[];
  subCategories: BudgetData[];
  vendors: BudgetData[];
  payments: BudgetData[];
  archivedAccounts: BudgetData[];
  defaultCurrency: Currency;
  bookmarkedCurrencies: string[];
  defaultEntries: Record<string, string> | null;
  theme?: string; // theme ID: "lime" | "forest" | "ocean" | "amber"
  spendingChartType?: 'bar' | 'line';
  defaultPeriod?: Period;
  layoutWidth?: 'fixed' | 'full';
}
```

- [ ] **Step 2: Run typecheck to verify no errors**

```bash
npm run typecheck
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/firestore/types.ts
git commit -m "feat: add defaultPeriod field to Preference type"
```

---

## Task 2: Initialize Period from Preference in AppShell

**Files:**
- Modify: `src/routes/AppShell.tsx:1-30`

- [ ] **Step 1: Import usePreferenceContext hook**

Open `src/routes/AppShell.tsx`. Add the import at the top after other imports (around line 4):

```typescript
import { usePreferenceContext } from '../context/PreferenceContext';
```

Current imports section (lines 1-9):
```typescript
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactionContext } from '../context/TransactionContext';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import TransactionFAB from '../components/transactions/TransactionFAB';
import { useLayout } from '../context/LayoutProvider';
```

- [ ] **Step 2: Add useEffect to sync preference.defaultPeriod to period state**

Find the `useState` line where period is initialized (currently `const [period, setPeriod] = useState<Period>('month');` around line 20). Add a `useEffect` right after the state declarations:

```typescript
import { useState, useEffect } from 'react';
// ... other imports ...

export default function AppShell() {
  const auth = useAuth();
  const { transactions } = useTransactionContext();
  const { layoutWidth } = useLayout();
  const { preference } = usePreferenceContext();
  const [period, setPeriod] = useState<Period>('month');
  const [fabOpen, setFabOpen] = useState(false);
  const [fabDate, setFabDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    if (preference?.defaultPeriod) {
      setPeriod(preference.defaultPeriod);
    }
  }, [preference?.defaultPeriod]);

  if (auth.status !== 'authenticated') return null;
  // ... rest of component
```

- [ ] **Step 3: Run the app to verify period syncs from preference**

```bash
npm run dev
```

Expected: App runs without errors. Open DevTools console to check for any errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/AppShell.tsx
git commit -m "feat: initialize period from preference in AppShell"
```

---

## Task 3: Sync Period Changes to Preference in Dashboard

**Files:**
- Modify: `src/routes/Dashboard.tsx:158-161`

- [ ] **Step 1: Update SpendingChart's onPeriodChange handler**

Open `src/routes/Dashboard.tsx`. Find the line where SpendingChart is rendered (around line 365). The `onPeriodChange` prop currently calls `setPeriod` directly:

```typescript
<SpendingChart
  transactions={chartTxns}
  period={period}
  onPeriodChange={setPeriod}  // ← Currently just this
  // ... rest of props
/>
```

Replace this with a wrapper function. First, create a handler function near the existing `handleChartTypeChange` (around line 158):

```typescript
async function handleChartTypeChange(type: 'bar' | 'line') {
  setChartType(type);
  await updatePreference({ spendingChartType: type });
}

async function handlePeriodChange(p: Period) {
  setPeriod(p);
  await updatePreference({ defaultPeriod: p });
}
```

- [ ] **Step 2: Update SpendingChart prop to use the new handler**

Replace the `onPeriodChange` prop in the SpendingChart component:

```typescript
<SpendingChart
  transactions={chartTxns}
  period={period}
  onPeriodChange={handlePeriodChange}  // ← Changed from setPeriod
  currencySymbol={currencySymbol}
  chartType={chartType}
  onChartTypeChange={handleChartTypeChange}
  offset={periodOffset}
  onOffsetChange={(delta) => setPeriodOffset((o) => Math.min(0, o + delta))}
/>
```

- [ ] **Step 3: Run the app and test period changes**

```bash
npm run dev
```

Expected: App runs without errors. Manually test: 
1. Click a different period button (e.g., "Week" to "Month")
2. Check browser DevTools → Network tab to see Firestore write
3. Reload the page — verify the period persists

- [ ] **Step 4: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat: persist period changes to preference"
```

---

## Task 4: Verify Period Persists Across App Reload

**Files:**
- Test: Manual verification (no code test needed for this step — the previous tasks cover it)

- [ ] **Step 1: Test period persistence manually**

1. Open the app at `http://localhost:5173`
2. Verify the initial period is 'week' (default)
3. Click the "Month" period button
4. Open DevTools → Application → IndexedDB (if using local cache) or Firestore emulator logs
5. Reload the page (Cmd+R or Ctrl+R)
6. Verify the period is still "Month"
7. Repeat with "Year" and "Quarter" to verify consistency
8. Check that other widgets (CategoryBreakdown, QuickStats, etc.) also reflect the new period

- [ ] **Step 2: Verify chart type and period persist independently**

1. Set period to "Month"
2. Change chart type from "Bar" to "Line"
3. Reload the page
4. Verify both settings persist: period = Month, chartType = Line
5. Change period to "Week"
6. Verify chart type remains "Line"
7. Reload to verify both persist

- [ ] **Step 3: Run tests to ensure no regressions**

```bash
npm run test
```

Expected: All tests pass. If any tests fail, they likely depend on period defaulting to 'month' — update those tests to use the new preference-driven behavior.

- [ ] **Step 4: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: No errors or warnings

- [ ] **Step 5: Build and verify no production errors**

```bash
npm run build
```

Expected: Build completes successfully with no errors. Output size should be unchanged (we didn't add any bundle size).

- [ ] **Step 6: Final commit (if tests needed updates)**

If you had to update any tests, commit them:

```bash
git add src/  # any test files
git commit -m "test: update tests for preference-based period initialization"
```

---

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `src/firestore/types.ts` | Add `defaultPeriod?: Period` to Preference | Store user's preferred period |
| `src/routes/AppShell.tsx` | Add useEffect to sync preference to period state | Restore persisted period on app load |
| `src/routes/Dashboard.tsx` | Add `handlePeriodChange` to sync period to preference | Persist period changes to Firestore |

**Total commits:** 4 (Preference type, AppShell sync, Dashboard handler, test updates if needed)

---

## Testing Checklist

- [ ] Period defaults to 'week' when no preference exists
- [ ] Changing period immediately updates UI
- [ ] Period change is persisted to Firestore
- [ ] Reloading the app restores the last-used period
- [ ] All period-dependent widgets (chart, breakdown, stats) use the restored period
- [ ] Chart type and period persist independently
- [ ] All existing tests pass
- [ ] Build completes without errors
- [ ] No TypeScript or lint errors
