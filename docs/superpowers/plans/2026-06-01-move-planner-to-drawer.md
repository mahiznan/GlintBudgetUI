# Move Budget Planner to Detail Drawer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the budget planner carousel from the dashboard into the detail drawer, allowing users to see planner details with bar/radial chart toggle when clicking the MiniBudgetWidget in the hero.

**Architecture:** Remove the BudgetPlannerCarousel component from the dashboard layout. Enhance PlannerDetailDrawer to display the same chart view toggle (bar/radial) that PlannerCard currently has, using the existing `chartView` from the planner object and updating Firestore when the user toggles the view.

**Tech Stack:** React, TypeScript, Firestore (planner.chartView), TailwindCSS

---

### Task 1: Remove BudgetPlannerCarousel from Dashboard

**Files:**
- Modify: `src/routes/Dashboard.tsx:22` (import), `src/routes/Dashboard.tsx:392` (component usage)

- [ ] **Step 1: Remove the import statement**

In `src/routes/Dashboard.tsx`, find line 22:
```typescript
import { BudgetPlannerCarousel } from '../components/planner/BudgetPlannerCarousel';
```

Delete this line entirely.

- [ ] **Step 2: Remove the component from the left column**

In `src/routes/Dashboard.tsx`, find the left column section (around line 392). Currently it looks like:
```typescript
<div className="flex flex-col gap-4 md:flex-[2] min-w-0">
  <SpendingChart ... />
  <DailyTransactions ... />
  <BudgetPlannerCarousel />
</div>
```

Change it to:
```typescript
<div className="flex flex-col gap-4 md:flex-[2] min-w-0">
  <SpendingChart ... />
  <DailyTransactions ... />
</div>
```

- [ ] **Step 3: Verify the file compiles**

Run: `npm run typecheck`

Expected: No TypeScript errors in Dashboard.tsx

- [ ] **Step 4: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat: remove BudgetPlannerCarousel from dashboard"
```

---

### Task 2: Add chart view toggle to PlannerDetailDrawer

**Files:**
- Modify: `src/components/planner/PlannerDetailDrawer.tsx:1-10` (imports), `src/components/planner/PlannerDetailDrawer.tsx:132-160` (state and effects), `src/components/planner/PlannerDetailDrawer.tsx:282-300` (category rendering)

- [ ] **Step 1: Add imports for chart view components and types**

At the top of `src/components/planner/PlannerDetailDrawer.tsx`, after the existing imports, add:

```typescript
import { PlannerCategoryRadial } from './PlannerCategoryRadial';
import { useUpdatePlanner } from '../../hooks/useMutatePlanner';
```

The file should now have these imports:
```typescript
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePlannerAggregation } from '../../hooks/usePlannerAggregation';
import { filterTransactionsForPlanner, formatCurrency } from '../../lib/plannerUtils';
import { PlannerCategoryBar } from './PlannerCategoryBar';
import { PlannerCategoryRadial } from './PlannerCategoryRadial';
import { useUpdatePlanner } from '../../hooks/useMutatePlanner';
import type { BudgetPlanner, CategoryResult, Transaction } from '../../firestore/types';
```

- [ ] **Step 2: Add chartView state**

In the `PlannerDetailDrawer` function (around line 133), after the existing state declarations, add:

```typescript
const [chartView, setChartView] = useState<BudgetPlanner['chartView']>(planner.chartView);
```

The state section should now look like:
```typescript
export function PlannerDetailDrawer({ planner, transactions, initialOffset, onClose }: Props) {
  const [periodOffset, setPeriodOffset] = useState(initialOffset);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [chartView, setChartView] = useState<BudgetPlanner['chartView']>(planner.chartView);
```

- [ ] **Step 3: Add effect to sync chartView from planner prop**

After the `useEffect` that sets `visible` (around line 137), add a new effect:

```typescript
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartView(planner.chartView);
  }, [planner.chartView]);
```

- [ ] **Step 4: Add chart view update handler**

After the `toggleCategory` function (around line 168), add:

```typescript
  const { mutate: updatePlanner } = useUpdatePlanner();

  function handleChartViewToggle(view: BudgetPlanner['chartView']) {
    setChartView(view);
    updatePlanner(planner.id, { chartView: view });
  }
```

- [ ] **Step 5: Add chart toggle buttons to the header**

Find the header section (around line 199-225). After the close button, add the toggle UI. Change:

```typescript
        <div>
          <h2 className="font-semibold text-base text-text">{planner.name}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {agg.periodLabel} · {planner.currency}
          </p>
        </div>
        <button
```

To:

```typescript
        <div className="flex-1">
          <h2 className="font-semibold text-base text-text">{planner.name}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {agg.periodLabel} · {planner.currency}
          </p>
        </div>
        {/* Bar / Radial toggle */}
        <div className="flex gap-0.5 bg-surface-alt border border-border rounded-md p-0.5 shrink-0">
          <button
            type="button"
            aria-label="Bar view"
            onClick={() => handleChartViewToggle('bar')}
            className={`rounded p-1 transition-all ${
              chartView === 'bar' ? 'bg-surface shadow-sm' : ''
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="12" height="2.2" rx="1" fill={chartView === 'bar' ? 'var(--color-brand)' : '#94a3b8'} />
              <rect x="1" y="6.4" width="8" height="2.2" rx="1" fill={chartView === 'bar' ? 'var(--color-brand)' : '#94a3b8'} />
              <rect x="1" y="9.8" width="10" height="2.2" rx="1" fill={chartView === 'bar' ? 'var(--color-brand)' : '#94a3b8'} />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Radial view"
            onClick={() => handleChartViewToggle('radial')}
            className={`rounded p-1 transition-all ${
              chartView === 'radial' ? 'bg-surface shadow-sm' : ''
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5.5" stroke="#e2e8f0" strokeWidth="2" />
              <circle
                cx="7" cy="7" r="5.5"
                stroke={chartView === 'radial' ? 'var(--color-brand)' : '#94a3b8'}
                strokeWidth="2"
                strokeDasharray="21.5 13"
                strokeLinecap="round"
                transform="rotate(-90 7 7)"
              />
            </svg>
          </button>
        </div>
        <button
```

This adds the toggle to the header and uses `flex-1` on the name/period div to push the toggle to the right.

- [ ] **Step 6: Update category rendering to support radial view**

Find the scrollable category list section (around line 282-300). Currently it renders:

```typescript
        {/* Scrollable category list */}
        <div className="overflow-y-auto px-5 py-3 flex-1">
          {allCategories.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">
              No transactions match this planner for the selected period.
            </p>
          )}
          {allCategories.map((result, idx) => (
            <CategoryRow
              key={result.category}
              result={result}
              currency={planner.currency}
              isFirstUnplanned={idx === firstUnplannedIndex}
              expanded={expandedCategory === result.category}
              onToggle={() => toggleCategory(result.category)}
              periodFiltered={periodFiltered}
            />
          ))}
        </div>
```

Replace it with:

```typescript
        {/* Scrollable category list */}
        <div className="overflow-y-auto px-5 py-3 flex-1">
          {allCategories.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">
              No transactions match this planner for the selected period.
            </p>
          )}
          {chartView === 'bar' ? (
            <>
              {allCategories.map((result, idx) => (
                <CategoryRow
                  key={result.category}
                  result={result}
                  currency={planner.currency}
                  isFirstUnplanned={idx === firstUnplannedIndex}
                  expanded={expandedCategory === result.category}
                  onToggle={() => toggleCategory(result.category)}
                  periodFiltered={periodFiltered}
                />
              ))}
            </>
          ) : (
            <div className="grid grid-cols-4 gap-1 py-1">
              {allCategories.map((result) => (
                <PlannerCategoryRadial
                  key={result.category}
                  result={result}
                  currency={planner.currency}
                />
              ))}
            </div>
          )}
        </div>
```

- [ ] **Step 7: Verify the file compiles**

Run: `npm run typecheck`

Expected: No TypeScript errors in PlannerDetailDrawer.tsx

- [ ] **Step 8: Test the drawer in the browser**

Run: `npm run dev`
- Navigate to the dashboard
- Click the MiniBudgetWidget (in the hero area)
- Verify the drawer opens with the chart toggle visible in the header
- Toggle between bar and radial views
- Verify categories render correctly in both views
- Close the drawer

- [ ] **Step 9: Commit**

```bash
git add src/components/planner/PlannerDetailDrawer.tsx
git commit -m "feat: add chart view toggle (bar/radial) to PlannerDetailDrawer"
```

---

### Task 3: Update PlannerDetailDrawer tests

**Files:**
- Modify: `src/components/planner/PlannerDetailDrawer.test.tsx`

- [ ] **Step 1: Check current test coverage**

Run: `npm run test -- src/components/planner/PlannerDetailDrawer.test.tsx`

Review the output to understand existing test structure.

- [ ] **Step 2: Add test for chart view toggle**

Open `src/components/planner/PlannerDetailDrawer.test.tsx`. Add a new test after the existing tests:

```typescript
  it('toggles between bar and radial chart views', async () => {
    const mockPlanner: BudgetPlanner = {
      ...createMockPlanner(),
      chartView: 'bar',
    };
    
    render(
      <PlannerDetailDrawer
        planner={mockPlanner}
        transactions={[]}
        initialOffset={0}
        onClose={() => {}}
      />
    );

    // Initially in bar view
    expect(screen.getByRole('button', { name: /bar view/i })).toHaveClass('bg-surface');

    // Click radial view button
    const radialButton = screen.getByRole('button', { name: /radial view/i });
    fireEvent.click(radialButton);

    // Radial view should now be active
    await waitFor(() => {
      expect(radialButton).toHaveClass('bg-surface');
    });
  });
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/components/planner/PlannerDetailDrawer.test.tsx`

Expected: All tests pass including the new toggle test.

- [ ] **Step 4: Commit**

```bash
git add src/components/planner/PlannerDetailDrawer.test.tsx
git commit -m "test: add chart view toggle test to PlannerDetailDrawer"
```

---

### Task 4: Verify end-to-end behavior

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`

Expected: All tests pass.

- [ ] **Step 2: Run linter and typecheck**

Run: `npm run lint && npm run typecheck`

Expected: No errors or warnings.

- [ ] **Step 3: Manual end-to-end test**

Run: `npm run dev`

1. Navigate to dashboard
2. Verify BudgetPlannerCarousel is no longer visible below transactions
3. Verify dashboard layout is clean without the carousel
4. Click MiniBudgetWidget in hero
5. Verify drawer opens with chart toggle in header
6. Click bar/radial toggle buttons
7. Verify categories render correctly in both views
8. Verify period navigation still works (Prev/Next buttons)
9. Click a category to expand and view transactions
10. Close drawer with escape key or close button

- [ ] **Step 4: Build for production**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: move budget planner to detail drawer with chart view toggle"
```

---

## Self-Review

✅ **Spec coverage:**
- Remove BudgetPlannerCarousel from dashboard left column → Task 1
- Add chart view toggle to PlannerDetailDrawer → Task 2, steps 5-6
- Support radial and bar views in drawer → Task 2, step 6
- Keep toggle functionality → Task 2, steps 4-6

✅ **Placeholder scan:** No TODOs, TBDs, or incomplete references. All code is concrete.

✅ **Type consistency:** `chartView` is consistently typed as `BudgetPlanner['chartView']` across state, effect, and toggle handler.

✅ **Code completeness:** Every code step shows exact implementation with no hand-waving.
