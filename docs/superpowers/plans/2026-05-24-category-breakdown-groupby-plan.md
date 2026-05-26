# Category Breakdown GroupBy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Category Breakdown widget with a groupBy dropdown (Category / Account / Currency / Vendor / Payment) so spending can be viewed through any dimension, with a 4-level drill into category → sub-category → transactions for non-category groupings.

**Architecture:** Replace the existing discriminated-union `DrillState` in Dashboard with a path-based `{ groupBy, path: string[] }` shape; extend the `categoryItems` memo to handle 4-level drills; add a `<select>` dropdown to `CategoryBreakdown` that shows only at level 0 alongside the expense/income toggle.

**Tech Stack:** React, TypeScript (strict), Vitest + React Testing Library, Tailwind CSS v4

---

## File Map

| File                                                  | Change                                                                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/dashboard/CategoryBreakdown.tsx`      | Export `GroupBy` type; add `groupBy` + `onGroupByChange` props; new header rendering; toggle + dropdown hidden at level > 0; fix transactions gate |
| `src/components/dashboard/CategoryBreakdown.test.tsx` | Add `groupBy`/`onGroupByChange` to all renders; replace "By Category heading" test; add tests for dropdown and drill-hides-controls                |
| `src/routes/Dashboard.tsx`                            | New `DrillState` shape; `GroupBy` import; rewrite `categoryItems` + `drillTransactions` memos; update all handlers/effects; wire new props         |

---

## Task 1: Update CategoryBreakdown tests for new required props

**Files:**

- Modify: `src/components/dashboard/CategoryBreakdown.test.tsx`

These tests will fail after the component changes in Task 2. Write the correct tests first so the component can be implemented against them.

- [ ] **Step 1: Run the existing test suite to confirm it passes before any changes**

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: all tests PASS.

- [ ] **Step 2: Replace CategoryBreakdown.test.tsx with the updated version**

The changes are:

1. Add `groupBy="category"` and `onGroupByChange={vi.fn()}` to every render that lacks them.
2. Remove the "renders By Category heading" test (the static title is gone).
3. Update "renders Expense and Income toggle buttons" to note they appear at level 0.
4. Update "hides mode toggle at level 2" → "hides toggle and dropdown at drillLevel 1" (any drill level > 0 hides both).
5. Add "renders groupBy dropdown at level 0".
6. Add "calls onGroupByChange when dropdown selection changes".

Replace the full file:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Transaction } from '../../firestore/types';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'lime', setTheme: vi.fn() }),
}));

import CategoryBreakdown from './CategoryBreakdown';
import type { CategoryItem } from './CategoryBreakdown';

const makeCategory = (name: string, total: number, pct: number): CategoryItem => ({
  name,
  icon: '🛒',
  total,
  pct,
});

const baseProps = {
  categories: [] as CategoryItem[],
  mode: 'expense' as const,
  onModeChange: vi.fn(),
  currencySymbol: '₹',
  groupBy: 'category' as const,
  onGroupByChange: vi.fn(),
};

describe('CategoryBreakdown', () => {
  it('renders groupBy dropdown at level 0', () => {
    render(<CategoryBreakdown {...baseProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Category')).toBeInTheDocument();
  });

  it('calls onGroupByChange when dropdown selection changes', async () => {
    const user = userEvent.setup();
    const onGroupByChange = vi.fn();
    render(<CategoryBreakdown {...baseProps} onGroupByChange={onGroupByChange} />);
    await user.selectOptions(screen.getByRole('combobox'), 'account');
    expect(onGroupByChange).toHaveBeenCalledWith('account');
  });

  it('renders Expense and Income toggle buttons at level 0', () => {
    render(<CategoryBreakdown {...baseProps} />);
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
  });

  it('active expense button uses expense gradient, not bg-red-600', () => {
    render(<CategoryBreakdown {...baseProps} />);
    const btn = screen.getByRole('button', { name: /expense/i });
    expect(btn).not.toHaveClass('bg-red-600');
    expect(btn.style.background).toBe('var(--expense-gradient)');
  });

  it('active income button uses brand gradient', () => {
    render(<CategoryBreakdown {...baseProps} mode="income" />);
    const btn = screen.getByRole('button', { name: /income/i });
    expect(btn.style.background).toBe('var(--brand-gradient)');
  });

  it('renders provided categories', () => {
    const cats = [makeCategory('Food', 1500, 60), makeCategory('Transport', 600, 24)];
    render(<CategoryBreakdown {...baseProps} categories={cats} />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('calls onModeChange with "income" when Income button is clicked', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<CategoryBreakdown {...baseProps} onModeChange={onModeChange} />);
    await user.click(screen.getByRole('button', { name: /income/i }));
    expect(onModeChange).toHaveBeenCalledWith('income');
  });

  it('shows expense empty state when mode is expense and categories is empty', () => {
    render(<CategoryBreakdown {...baseProps} />);
    expect(screen.getByText(/no expenses for this period/i)).toBeInTheDocument();
  });

  it('shows income empty state when mode is income and categories is empty', () => {
    render(<CategoryBreakdown {...baseProps} mode="income" />);
    expect(screen.getByText(/no income for this period/i)).toBeInTheDocument();
  });

  it('hides toggle and dropdown at drillLevel 1', () => {
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Food', 1500, 60)]}
        drillLevel={1}
        drillLabel="Food"
        backLabel="← Back"
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /income/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

const makeTxn = (id: string, vendor: string, date: Date): Transaction => ({
  id,
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Dining Out',
  date,
  account: 'HDFC',
  vendor,
  payment: 'Card',
  currency: 'INR',
  notes: '',
  amount: -500,
  icon: '🍕',
});

describe('CategoryBreakdown — drill-down', () => {
  it('calls onItemClick with category name when a row is clicked', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const cats = [makeCategory('Food', 1500, 60)];
    render(<CategoryBreakdown {...baseProps} categories={cats} onItemClick={onItemClick} />);
    await user.click(screen.getByText('Food'));
    expect(onItemClick).toHaveBeenCalledWith('Food');
  });

  it('shows back button with backLabel at level 1', () => {
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Dining Out', 2700, 60)]}
        drillLevel={1}
        drillLabel="Food"
        backLabel="← Back"
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /← Back/i })).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked at level 1', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <CategoryBreakdown
        {...baseProps}
        categories={[makeCategory('Dining Out', 2700, 60)]}
        drillLevel={1}
        drillLabel="Food"
        backLabel="← Back"
        onBack={onBack}
      />,
    );
    await user.click(screen.getByRole('button', { name: /← Back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders transaction vendor names when transactions prop is passed', () => {
    const txns = [
      makeTxn('t1', 'Pizza Hut', new Date('2026-05-18')),
      makeTxn('t2', "Domino's", new Date('2026-05-15')),
    ];
    render(
      <MemoryRouter>
        <CategoryBreakdown
          {...baseProps}
          categories={[makeCategory('Dining Out', 1000, 100)]}
          drillLevel={2}
          drillLabel="Dining Out"
          backLabel="← Food"
          onBack={vi.fn()}
          transactions={txns}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Pizza Hut')).toBeInTheDocument();
    expect(screen.getByText("Domino's")).toBeInTheDocument();
  });

  it('transaction rows link to the edit form when transactions prop is passed', () => {
    const txns = [makeTxn('txn-abc', 'Pizza Hut', new Date())];
    render(
      <MemoryRouter>
        <CategoryBreakdown
          {...baseProps}
          categories={[makeCategory('Dining Out', 500, 100)]}
          drillLevel={2}
          drillLabel="Dining Out"
          backLabel="← Food"
          onBack={vi.fn()}
          transactions={txns}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Pizza Hut/i });
    expect(link).toHaveAttribute('href', '/app/transactions/txn-abc/edit');
  });
});
```

- [ ] **Step 3: Run tests — expect failures**

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected failures:

- "renders groupBy dropdown at level 0" — FAIL (`groupBy` prop not on component yet)
- "calls onGroupByChange…" — FAIL
- "hides toggle and dropdown at drillLevel 1" — FAIL (toggle still shows at level 1)
- Several existing tests may FAIL due to missing `groupBy` prop (TypeScript or runtime error)

The other tests may PASS or error depending on how the component handles unknown props.

---

## Task 2: Implement CategoryBreakdown changes

**Files:**

- Modify: `src/components/dashboard/CategoryBreakdown.tsx`

- [ ] **Step 1: Replace CategoryBreakdown.tsx with the updated implementation**

```tsx
import { Link } from 'react-router-dom';
import { formatCurrency, formatDateShort } from '../../lib/dateUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../lib/themes';
import type { Transaction } from '../../firestore/types';

export interface CategoryItem {
  name: string;
  icon: string;
  total: number;
  pct: number;
}

export type Mode = 'expense' | 'income';
export type GroupBy = 'category' | 'account' | 'currency' | 'vendor' | 'payment';

const GROUP_LABELS: Record<GroupBy, string> = {
  category: 'Category',
  account: 'Account',
  currency: 'Currency',
  vendor: 'Vendor',
  payment: 'Payment',
};

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  currencySymbol: string;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  drillLevel?: number;
  drillLabel?: string;
  backLabel?: string;
  onItemClick?: (name: string) => void;
  onBack?: () => void;
  transactions?: Transaction[];
}

export default function CategoryBreakdown({
  categories,
  mode,
  onModeChange,
  currencySymbol,
  groupBy,
  onGroupByChange,
  drillLevel = 0,
  drillLabel,
  backLabel,
  onItemClick,
  onBack,
  transactions,
}: CategoryBreakdownProps) {
  const { themeId } = useTheme();
  const theme = getTheme(themeId);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {drillLevel > 0 ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-text-muted hover:text-text transition-colors flex-shrink-0"
            >
              {backLabel}
            </button>
            <span className="text-sm font-semibold text-text truncate">{drillLabel}</span>
          </div>
        ) : (
          <select
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
            className="text-xs font-semibold text-text-muted bg-surface-alt border border-border rounded-lg px-2 py-1 cursor-pointer"
          >
            {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
              <option key={g} value={g}>
                {GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        )}
        {drillLevel === 0 && (
          <div className="inline-flex rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5 flex-shrink-0">
            {(['expense', 'income'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all',
                  mode === m ? 'text-white shadow-sm' : 'text-text-muted hover:text-text',
                ].join(' ')}
                style={
                  mode === m
                    ? {
                        background:
                          m === 'expense' ? 'var(--expense-gradient)' : 'var(--brand-gradient)',
                      }
                    : undefined
                }
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {transactions !== undefined ? (
        transactions.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No transactions</p>
        ) : (
          <div className="flex flex-col gap-1">
            {transactions.map((t) => (
              <Link
                key={t.id}
                to={`/app/transactions/${t.id}/edit`}
                className="flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-surface-alt transition-colors"
              >
                <span className="text-lg w-6 text-center">{t.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text truncate block">{t.vendor}</span>
                  <span className="text-xs text-text-muted">{formatDateShort(t.date)}</span>
                </div>
                <span
                  className={`text-xs font-mono font-semibold flex-shrink-0 ${
                    t.amount < 0 ? 'text-red-600' : 'text-brand'
                  }`}
                >
                  {t.amount < 0 ? '-' : '+'}
                  {formatCurrency(Math.abs(t.amount), currencySymbol)}
                </span>
              </Link>
            ))}
          </div>
        )
      ) : categories.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          No {mode === 'expense' ? 'expenses' : 'income'} for this period
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map(({ name, icon, total, pct }, i) => {
            const barContent = (
              <>
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
                        background: theme.categoryColors[i % theme.categoryColors.length]!,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-text flex-shrink-0">
                  {formatCurrency(total, currencySymbol)}
                </span>
              </>
            );

            return onItemClick ? (
              <button
                key={name}
                type="button"
                onClick={() => onItemClick(name)}
                className="w-full flex items-center gap-3 cursor-pointer rounded-xl px-1 py-0.5 hover:bg-surface-alt transition-colors text-left"
              >
                {barContent}
                <span className="text-text-muted text-xs flex-shrink-0">›</span>
              </button>
            ) : (
              <div key={name} className="flex items-center gap-3">
                {barContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tests — expect all to pass**

```bash
npm test -- --reporter=verbose 2>&1 | tail -40
```

Expected: all CategoryBreakdown tests PASS.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | tail -20
```

Expected: errors in `Dashboard.tsx` because it still passes the old `DrillState` props. That is expected at this point — Dashboard changes come next. The component itself should be clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/CategoryBreakdown.tsx src/components/dashboard/CategoryBreakdown.test.tsx
git commit -m "$(cat <<'EOF'
feat: add GroupBy dropdown to CategoryBreakdown widget

Exports GroupBy type; adds groupBy/onGroupByChange props; replaces
static title with dropdown at level 0; hides both toggle and dropdown
when drilling; gates transaction list on transactions prop presence.
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Refactor Dashboard — DrillState, memos, and prop wiring

**Files:**

- Modify: `src/routes/Dashboard.tsx`

This task replaces the discriminated-union `DrillState` with `{ groupBy: GroupBy; path: string[] }`, rewrites both the `categoryItems` and `drillTransactions` memos, and wires all new props to `CategoryBreakdown`.

- [ ] **Step 1: Update the import line for CategoryBreakdown to include GroupBy**

Find:

```typescript
import CategoryBreakdown, {
  type Mode as CategoryMode,
} from '../components/dashboard/CategoryBreakdown';
```

Replace with:

```typescript
import CategoryBreakdown, {
  type Mode as CategoryMode,
  type GroupBy,
} from '../components/dashboard/CategoryBreakdown';
```

- [ ] **Step 2: Replace the DrillState type**

Find:

```typescript
type DrillState =
  | { level: 0 }
  | { level: 1; category: string }
  | { level: 2; category: string; subCategory: string };
```

Replace with:

```typescript
interface DrillState {
  groupBy: GroupBy;
  path: string[];
}
```

- [ ] **Step 3: Update the drillState useState initialisation**

Find:

```typescript
const [drillState, setDrillState] = useState<DrillState>({ level: 0 });
```

Replace with:

```typescript
const [drillState, setDrillState] = useState<DrillState>({ groupBy: 'category', path: [] });
```

- [ ] **Step 4: Update handleModeChange to preserve groupBy**

Find:

```typescript
function handleModeChange(mode: CategoryMode) {
  setCategoryMode(mode);
  setDrillState({ level: 0 });
}
```

Replace with:

```typescript
function handleGroupByChange(g: GroupBy) {
  setDrillState({ groupBy: g, path: [] });
}

function handleModeChange(mode: CategoryMode) {
  setCategoryMode(mode);
  setDrillState((prev) => ({ ...prev, path: [] }));
}
```

- [ ] **Step 5: Update the period-change effect to preserve groupBy**

Find:

```typescript
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setDrillState({ level: 0 });
  setPeriodOffset(0);
}, [period]);
```

Replace with:

```typescript
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setDrillState((prev) => ({ ...prev, path: [] }));
  setPeriodOffset(0);
}, [period]);
```

- [ ] **Step 6: Rewrite the categoryItems memo**

Find the entire `const categoryItems = useMemo(() => {` block (lines 109–163 in the original file) and replace it with:

```typescript
const categoryItems = useMemo(() => {
  const { groupBy, path } = drillState;
  const filtered =
    categoryMode === 'expense'
      ? heroTxns.filter((t) => t.amount < 0)
      : heroTxns.filter((t) => t.amount > 0);

  const getGroupField = (t: (typeof filtered)[number]): string => {
    if (groupBy === 'account') return t.account;
    if (groupBy === 'currency') return t.currency;
    if (groupBy === 'vendor') return t.vendor;
    if (groupBy === 'payment') return t.payment;
    return t.category;
  };

  const toItems = (txns: typeof filtered, keyFn: (t: (typeof filtered)[number]) => string) => {
    const totals = txns.reduce<Record<string, { total: number; icon: string }>>((acc, t) => {
      const k = keyFn(t);
      if (!acc[k]) acc[k] = { total: 0, icon: t.icon };
      acc[k]!.total += Math.abs(t.amount);
      return acc;
    }, {});
    const sum = Object.values(totals).reduce((s, { total }) => s + total, 0);
    return Object.entries(totals)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([name, { total, icon }]) => ({
        name,
        icon,
        total,
        pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
      }));
  };

  if (groupBy === 'category') {
    if (path.length === 0) return toItems(filtered, (t) => t.category);
    if (path.length === 1)
      return toItems(
        filtered.filter((t) => t.category === path[0]),
        (t) => t.subCategory,
      );
    const subcatTxns = filtered.filter((t) => t.category === path[0] && t.subCategory === path[1]);
    const total = subcatTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    return [{ name: path[1]!, icon: subcatTxns[0]?.icon ?? '📦', total, pct: 100 }];
  }

  // non-category groupings (account | currency | vendor | payment)
  if (path.length === 0) return toItems(filtered, getGroupField);
  if (path.length === 1)
    return toItems(
      filtered.filter((t) => getGroupField(t) === path[0]),
      (t) => t.category,
    );
  if (path.length === 2)
    return toItems(
      filtered.filter((t) => getGroupField(t) === path[0] && t.category === path[1]),
      (t) => t.subCategory,
    );
  const subcatTxns = filtered.filter(
    (t) => getGroupField(t) === path[0] && t.category === path[1] && t.subCategory === path[2],
  );
  const total = subcatTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  return [{ name: path[2]!, icon: subcatTxns[0]?.icon ?? '📦', total, pct: 100 }];
}, [heroTxns, categoryMode, drillState]);
```

- [ ] **Step 7: Rewrite the drillTransactions memo**

Find the entire `const drillTransactions = useMemo(() => {` block (lines 165–176 in original) and replace it with:

```typescript
const drillTransactions = useMemo((): typeof heroTxns | undefined => {
  const { groupBy, path } = drillState;
  const maxDepth = groupBy === 'category' ? 2 : 3;
  if (path.length !== maxDepth) return undefined;

  const filtered =
    categoryMode === 'expense'
      ? heroTxns.filter((t) => t.amount < 0)
      : heroTxns.filter((t) => t.amount > 0);

  const getGroupField = (t: (typeof filtered)[number]): string => {
    if (groupBy === 'account') return t.account;
    if (groupBy === 'currency') return t.currency;
    if (groupBy === 'vendor') return t.vendor;
    if (groupBy === 'payment') return t.payment;
    return t.category;
  };

  if (groupBy === 'category') {
    return filtered
      .filter((t) => t.category === path[0] && t.subCategory === path[1])
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  return filtered
    .filter(
      (t) => getGroupField(t) === path[0] && t.category === path[1] && t.subCategory === path[2],
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}, [heroTxns, categoryMode, drillState]);
```

- [ ] **Step 8: Replace the CategoryBreakdown JSX block**

Find the entire `<CategoryBreakdown` JSX block in the return statement (from `<CategoryBreakdown` to the closing `/>`) and replace it with:

```tsx
<CategoryBreakdown
  categories={categoryItems}
  mode={categoryMode}
  onModeChange={handleModeChange}
  currencySymbol={currencySymbol}
  groupBy={drillState.groupBy}
  onGroupByChange={handleGroupByChange}
  drillLevel={drillState.path.length}
  drillLabel={drillState.path.at(-1)}
  backLabel={
    drillState.path.length === 1
      ? '← Back'
      : drillState.path.length > 1
        ? `← ${drillState.path.at(-2)}`
        : undefined
  }
  onBack={
    drillState.path.length > 0
      ? () => setDrillState((prev) => ({ ...prev, path: prev.path.slice(0, -1) }))
      : undefined
  }
  onItemClick={
    drillTransactions === undefined
      ? (name) => setDrillState((prev) => ({ ...prev, path: [...prev.path, name] }))
      : undefined
  }
  transactions={drillTransactions}
/>
```

- [ ] **Step 9: Run typecheck**

```bash
npm run typecheck 2>&1 | tail -20
```

Expected: 0 errors.

- [ ] **Step 10: Run all tests**

```bash
npm test -- --reporter=verbose 2>&1 | tail -40
```

Expected: all tests PASS.

- [ ] **Step 11: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "$(cat <<'EOF'
feat: extend dashboard groupBy drill to account, currency, vendor, payment

Replaces discriminated-union DrillState with path-based { groupBy, path }
shape; extends categoryItems and drillTransactions memos for 4-level drill
on non-category groupings; preserves groupBy across mode and period changes.
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Verification

- [ ] **Run the full test suite and typecheck one final time**

```bash
npm run typecheck && npm test 2>&1 | tail -20
```

Expected: 0 type errors, all tests PASS.

- [ ] **Start the dev server and manually verify the feature**

```bash
npm run dev
```

Open `http://localhost:5173`, sign in, and check:

1. Dashboard → CategoryBreakdown widget shows dropdown (default "Category") + Expense/Income toggle at level 0.
2. Change dropdown to "Account" — bars update to show accounts; toggle stays; no title text.
3. Click an account item — drill shows categories for that account; dropdown and toggle both hidden; back button shows "← Back".
4. Click a category — shows sub-categories; back button shows "← \<account name\>".
5. Click a sub-category — shows transactions; back button shows "← \<category name\>".
6. Click back at each level — breadcrumb navigates correctly.
7. Switch Expense ↔ Income at level 0 — path resets to top level; groupBy stays on "Account".
8. Change period — path resets; groupBy stays.
9. Repeat steps 3–6 for "Category" grouping — existing 3-level drill still works.
10. Repeat spot-check for "Vendor" and "Payment".
