# Layout Width Preference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users toggle between `fixed` (max-w-5xl, centred) and `full` (edge-to-edge) content layout, persisted in Firestore and surfaced in Settings → Appearance.

**Architecture:** A new `LayoutContext` + `LayoutProvider` pair (mirrors `ThemeContext`/`ThemeProvider` exactly) wraps the app in `App.tsx`. `AppShell.tsx` reads `layoutWidth` from the context to conditionally apply `max-w-5xl mx-auto`. `AppearanceTab.tsx` gains a "Layout Width" section below the existing "App Theme" section with two option cards.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Firestore via `useUpdatePreference` hook, Vitest + React Testing Library.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/firestore/types.ts` |
| Modify | `src/hooks/useUpdatePreference.ts` |
| Create | `src/context/LayoutContext.tsx` |
| Create | `src/context/LayoutProvider.tsx` |
| Create | `src/context/LayoutProvider.test.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/routes/AppShell.tsx` |
| Modify | `src/routes/AppShell.test.tsx` |
| Modify | `src/components/settings/AppearanceTab.tsx` |
| Modify | `src/components/settings/AppearanceTab.test.tsx` |

---

### Task 1: Extend Preference type and Firestore hook

**Files:**
- Modify: `src/firestore/types.ts`
- Modify: `src/hooks/useUpdatePreference.ts`

- [ ] **Step 1: Add `layoutWidth` to the `Preference` interface**

In `src/firestore/types.ts`, add one line after the `spendingChartType` field:

```ts
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
  theme?: string;
  spendingChartType?: 'bar' | 'line';
  layoutWidth?: 'fixed' | 'full';
}
```

- [ ] **Step 2: Add `layoutWidth` to `FirestorePreferencePartial`**

In `src/hooks/useUpdatePreference.ts`, add one line after `spendingChartType`:

```ts
export interface FirestorePreferencePartial {
  accounts?: BudgetData[];
  categories?: BudgetData[];
  subCategories?: BudgetData[];
  vendors?: BudgetData[];
  payments?: BudgetData[];
  default_currency?: Currency;
  frequent_currencies?: string[];
  default_entries?: Record<string, string>;
  theme?: string;
  spendingChartType?: 'bar' | 'line';
  layoutWidth?: 'fixed' | 'full';
}
```

- [ ] **Step 3: Run typecheck to confirm no type errors**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/firestore/types.ts src/hooks/useUpdatePreference.ts
git commit -m "feat: add layoutWidth field to Preference type and Firestore hook"
```

---

### Task 2: Create LayoutContext

**Files:**
- Create: `src/context/LayoutContext.tsx`

- [ ] **Step 1: Create the context file**

Create `src/context/LayoutContext.tsx` with this exact content:

```tsx
import { createContext, useContext } from 'react';

export interface LayoutContextValue {
  layoutWidth: 'fixed' | 'full';
  setLayoutWidth: (w: 'fixed' | 'full') => Promise<void>;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used inside LayoutProvider');
  return ctx;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/context/LayoutContext.tsx
git commit -m "feat: add LayoutContext"
```

---

### Task 3: Create LayoutProvider with tests (TDD)

**Files:**
- Create: `src/context/LayoutProvider.test.tsx`
- Create: `src/context/LayoutProvider.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/context/LayoutProvider.test.tsx`:

```tsx
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./PreferenceContext', () => ({ usePreferenceContext: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUpdatePreference', () => ({ useUpdatePreference: vi.fn() }));

import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { LayoutProvider } from './LayoutProvider';
import { useLayout } from './LayoutContext';

const mockMutate = vi.fn().mockResolvedValue(undefined);

function setupMocks(layoutWidth?: 'fixed' | 'full') {
  vi.mocked(usePreferenceContext).mockReturnValue({
    preference: { layoutWidth } as never,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useAuth).mockReturnValue({ status: 'authenticated', user: { uid: 'u1' } } as never);
  vi.mocked(useUpdatePreference).mockReturnValue({ mutate: mockMutate, loading: false, error: null });
}

function LayoutWidthDisplay() {
  const { layoutWidth } = useLayout();
  return <span data-testid="width">{layoutWidth}</span>;
}

describe('LayoutProvider', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('defaults to fixed when preference has no layoutWidth', () => {
    setupMocks(undefined);
    const { getByTestId } = render(<LayoutProvider><LayoutWidthDisplay /></LayoutProvider>);
    expect(getByTestId('width').textContent).toBe('fixed');
  });

  it('seeds layoutWidth from preference', () => {
    setupMocks('full');
    const { getByTestId } = render(<LayoutProvider><LayoutWidthDisplay /></LayoutProvider>);
    expect(getByTestId('width').textContent).toBe('full');
  });

  it('setLayoutWidth updates state optimistically and calls mutate', async () => {
    setupMocks(undefined);
    let capturedSet!: (w: 'fixed' | 'full') => Promise<void>;

    function Capture() {
      const { setLayoutWidth } = useLayout();
      capturedSet = setLayoutWidth;
      return null;
    }

    const { getByTestId } = render(
      <LayoutProvider>
        <LayoutWidthDisplay />
        <Capture />
      </LayoutProvider>,
    );

    await act(async () => {
      await capturedSet('full');
    });

    expect(getByTestId('width').textContent).toBe('full');
    expect(mockMutate).toHaveBeenCalledWith({ layoutWidth: 'full' });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail (LayoutProvider does not exist yet)**

```bash
npx vitest run src/context/LayoutProvider.test.tsx
```

Expected: FAIL — "Cannot find module './LayoutProvider'"

- [ ] **Step 3: Create LayoutProvider.tsx**

Create `src/context/LayoutProvider.tsx`:

```tsx
import { useEffect, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutContext } from './LayoutContext';
import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';

const DEFAULT_LAYOUT_WIDTH = 'fixed' as const;

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { preference } = usePreferenceContext();
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { mutate } = useUpdatePreference(uid);

  const [layoutWidth, setLayoutWidthState] = useState<'fixed' | 'full'>(DEFAULT_LAYOUT_WIDTH);

  useEffect(() => {
    if (preference?.layoutWidth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayoutWidthState(preference.layoutWidth);
    }
  }, [preference?.layoutWidth]);

  const setLayoutWidth = useCallback(
    async (w: 'fixed' | 'full') => {
      setLayoutWidthState(w);
      await mutate({ layoutWidth: w });
    },
    [mutate],
  );

  return (
    <LayoutContext.Provider value={{ layoutWidth, setLayoutWidth }}>
      {children}
    </LayoutContext.Provider>
  );
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run src/context/LayoutProvider.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context/LayoutProvider.tsx src/context/LayoutProvider.test.tsx
git commit -m "feat: add LayoutProvider with tests"
```

---

### Task 4: Wire LayoutProvider into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add LayoutProvider to the provider tree**

In `src/App.tsx`, add the import and wrap the `RouterProvider`:

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { PreferenceProvider } from './context/PreferenceContext';
import { TransactionProvider } from './context/TransactionContext';
import { ThemeProvider } from './context/ThemeProvider';
import { LayoutProvider } from './context/LayoutProvider';
import Landing from './routes/Landing';

const SignIn = lazy(() => import('./routes/SignIn'));
const AppShell = lazy(() => import('./routes/AppShell'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const TransactionList = lazy(() => import('./routes/TransactionList'));
const TransactionForm = lazy(() => import('./routes/TransactionForm'));
const Settings = lazy(() => import('./routes/Settings'));

const RouteFallback = () => (
  <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center text-slate-500">
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
      {
        path: 'settings',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Settings />
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
        <TransactionProvider>
          <ThemeProvider>
            <LayoutProvider>
              <RouterProvider router={router} />
            </LayoutProvider>
          </ThemeProvider>
        </TransactionProvider>
      </PreferenceProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add LayoutProvider to app provider tree"
```

---

### Task 5: Apply layout width in AppShell (TDD)

**Files:**
- Modify: `src/routes/AppShell.test.tsx`
- Modify: `src/routes/AppShell.tsx`

- [ ] **Step 1: Add LayoutContext mock and layout width tests to AppShell.test.tsx**

Replace the entire content of `src/routes/AppShell.test.tsx` with:

```tsx
vi.mock('../context/TransactionContext', () => ({
  useTransactionContext: () => ({
    transactions: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../components/transactions/AddTransactionDrawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="New Transaction">drawer</div> : null,
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    themeId: 'lime',
    setTheme: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../context/LayoutContext', () => ({
  useLayout: vi.fn(() => ({
    layoutWidth: 'fixed' as const,
    setLayoutWidth: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { useLayout } from '../context/LayoutContext';

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

describe('AppShell nav links', () => {
  it('renders the Transactions nav link', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('link', { name: /transactions/i })).toBeInTheDocument();
  });

  it('renders the Settings nav link', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });
});

describe('AppShell — FAB', () => {
  it('renders an "Add transaction" FAB button', () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('clicking the FAB opens the AddTransactionDrawer', async () => {
    render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));
    expect(screen.getByRole('dialog', { name: /new transaction/i })).toBeInTheDocument();
  });
});

describe('AppShell — layout width', () => {
  beforeEach(() => {
    vi.mocked(useLayout).mockReturnValue({
      layoutWidth: 'fixed',
      setLayoutWidth: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('applies max-w-5xl class in fixed mode', () => {
    const { container } = render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(container.querySelector('.max-w-5xl')).not.toBeNull();
  });

  it('does not apply max-w-5xl class in full mode', () => {
    vi.mocked(useLayout).mockReturnValue({
      layoutWidth: 'full',
      setLayoutWidth: vi.fn().mockResolvedValue(undefined),
    });
    const { container } = render(
      <AuthContext.Provider value={authedCtx}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(container.querySelector('.max-w-5xl')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm new layout tests fail**

```bash
npx vitest run src/routes/AppShell.test.tsx
```

Expected: existing tests pass, the two new layout width tests FAIL because AppShell does not yet apply `max-w-5xl`.

- [ ] **Step 3: Update AppShell.tsx to consume useLayout**

Replace the content of `src/routes/AppShell.tsx` with:

```tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { Period } from '../lib/dateUtils';
import { useAuth } from '../auth/AuthContext';
import { useTransactionContext } from '../context/TransactionContext';
import { useLayout } from '../context/LayoutContext';
import Sidebar from '../components/layout/Sidebar';
import AddTransactionDrawer from '../components/transactions/AddTransactionDrawer';

export interface AppShellOutletContext {
  period: Period;
  setPeriod: (p: Period) => void;
}

export default function AppShell() {
  const auth = useAuth();
  const { refetch } = useTransactionContext();
  const { layoutWidth } = useLayout();
  const [period, setPeriod] = useState<Period>('month');
  const [fabOpen, setFabOpen] = useState(false);

  if (auth.status !== 'authenticated') return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-alt">
        <div className={layoutWidth === 'fixed' ? 'max-w-5xl mx-auto w-full' : 'w-full'}>
          <Outlet context={{ period, setPeriod } satisfies AppShellOutletContext} />
        </div>
      </main>
      <button
        type="button"
        onClick={() => setFabOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center transition-opacity hover:opacity-90"
        style={{ background: 'var(--brand-gradient)', boxShadow: '0 4px 20px var(--brand-glow)' }}
      >
        +
      </button>
      <AddTransactionDrawer
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run all AppShell tests — confirm all pass**

```bash
npx vitest run src/routes/AppShell.test.tsx
```

Expected: all tests PASS including the two new layout width tests.

- [ ] **Step 5: Commit**

```bash
git add src/routes/AppShell.tsx src/routes/AppShell.test.tsx
git commit -m "feat: apply layout width preference in AppShell"
```

---

### Task 6: Add Layout Width section to AppearanceTab (TDD)

**Files:**
- Modify: `src/components/settings/AppearanceTab.test.tsx`
- Modify: `src/components/settings/AppearanceTab.tsx`

- [ ] **Step 1: Update AppearanceTab.test.tsx with LayoutContext mock and new tests**

Replace the entire content of `src/components/settings/AppearanceTab.test.tsx` with:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));
vi.mock('../../context/LayoutContext', () => ({ useLayout: vi.fn() }));

import { useTheme } from '../../context/ThemeContext';
import { useLayout } from '../../context/LayoutContext';
import AppearanceTab from './AppearanceTab';

function setup(themeId = 'lime', layoutWidth: 'fixed' | 'full' = 'fixed') {
  const setTheme = vi.fn().mockResolvedValue(undefined);
  const setLayoutWidth = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useTheme).mockReturnValue({ themeId, setTheme });
  vi.mocked(useLayout).mockReturnValue({ layoutWidth, setLayoutWidth });
  return { setTheme, setLayoutWidth };
}

describe('AppearanceTab — theme', () => {
  it('renders all 4 theme swatches', () => {
    setup();
    render(<AppearanceTab />);
    expect(screen.getByText(/Lime/)).toBeInTheDocument();
    expect(screen.getByText(/Forest/)).toBeInTheDocument();
    expect(screen.getByText(/Ocean/)).toBeInTheDocument();
    expect(screen.getByText(/Amber/)).toBeInTheDocument();
  });

  it('active theme swatch shows ✓ indicator', () => {
    setup('forest');
    render(<AppearanceTab />);
    const forestBtn = screen.getByText(/Forest/).closest('button')!;
    expect(forestBtn).toHaveTextContent('✓');
  });

  it('inactive theme swatches do not show ✓', () => {
    setup('forest');
    render(<AppearanceTab />);
    const limeBtn = screen.getByText(/Lime/).closest('button')!;
    expect(limeBtn).not.toHaveTextContent('✓');
  });

  it('clicking a swatch calls setTheme with its id', () => {
    const { setTheme } = setup('lime');
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText(/Ocean/).closest('button')!);
    expect(setTheme).toHaveBeenCalledWith('ocean');
  });
});

describe('AppearanceTab — layout width', () => {
  it('renders both layout width cards', () => {
    setup();
    render(<AppearanceTab />);
    expect(screen.getByText('Fixed width')).toBeInTheDocument();
    expect(screen.getByText('Full width')).toBeInTheDocument();
  });

  it('active layout card shows ✓ indicator', () => {
    setup('lime', 'full');
    render(<AppearanceTab />);
    const fullBtn = screen.getByText('Full width').closest('button')!;
    expect(fullBtn).toHaveTextContent('✓');
  });

  it('inactive layout card does not show ✓', () => {
    setup('lime', 'full');
    render(<AppearanceTab />);
    const fixedBtn = screen.getByText('Fixed width').closest('button')!;
    expect(fixedBtn).not.toHaveTextContent('✓');
  });

  it('clicking a layout card calls setLayoutWidth with its id', () => {
    const { setLayoutWidth } = setup('lime', 'fixed');
    render(<AppearanceTab />);
    fireEvent.click(screen.getByText('Full width').closest('button')!);
    expect(setLayoutWidth).toHaveBeenCalledWith('full');
  });
});
```

- [ ] **Step 2: Run tests — confirm new layout tests fail**

```bash
npx vitest run src/components/settings/AppearanceTab.test.tsx
```

Expected: theme tests pass (unchanged), layout width tests FAIL because `AppearanceTab` does not yet render layout cards.

- [ ] **Step 3: Update AppearanceTab.tsx with the Layout Width section**

Replace the entire content of `src/components/settings/AppearanceTab.tsx` with:

```tsx
import { THEMES } from '../../lib/themes';
import { useTheme } from '../../context/ThemeContext';
import { useLayout } from '../../context/LayoutContext';

const LAYOUT_OPTIONS: { id: 'fixed' | 'full'; label: string; illustration: React.ReactNode }[] = [
  {
    id: 'fixed',
    label: 'Fixed width',
    illustration: (
      <div className="w-full flex justify-center">
        <div className="h-5 w-3/5 rounded bg-border" />
      </div>
    ),
  },
  {
    id: 'full',
    label: 'Full width',
    illustration: <div className="h-5 w-full rounded bg-border" />,
  },
];

export default function AppearanceTab() {
  const { themeId, setTheme } = useTheme();
  const { layoutWidth, setLayoutWidth } = useLayout();

  return (
    <div className="flex flex-col gap-6 py-2">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-muted">
          App Theme
        </p>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((theme) => {
            const isActive = themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => void setTheme(theme.id)}
                className={[
                  'overflow-hidden rounded-xl text-left transition-all',
                  isActive
                    ? 'border-[2px] border-accent shadow-[0_0_0_2px_rgba(34,197,94,0.2)]'
                    : 'border-[1.5px] border-border hover:border-brand/60',
                ].join(' ')}
              >
                <div className="h-10 w-full" style={{ background: theme.swatchGradient }} />
                <div className="flex items-center justify-between bg-surface px-3 py-2">
                  <span className="text-xs font-bold text-text">
                    {theme.emoji} {theme.name}
                  </span>
                  {isActive ? (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                      style={{ background: 'var(--brand-gradient)' }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border-[1.5px] border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Theme saved to your account — syncs across all devices.
      </p>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-muted">
          Layout Width
        </p>
        <div className="grid grid-cols-2 gap-3">
          {LAYOUT_OPTIONS.map(({ id, label, illustration }) => {
            const isActive = layoutWidth === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => void setLayoutWidth(id)}
                className={[
                  'overflow-hidden rounded-xl text-left transition-all',
                  isActive
                    ? 'border-[2px] border-accent shadow-[0_0_0_2px_rgba(34,197,94,0.2)]'
                    : 'border-[1.5px] border-border hover:border-brand/60',
                ].join(' ')}
              >
                <div className="h-10 w-full bg-surface-alt flex items-center justify-center px-2">
                  {illustration}
                </div>
                <div className="flex items-center justify-between bg-surface px-3 py-2">
                  <span className="text-xs font-bold text-text">{label}</span>
                  {isActive ? (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                      style={{ background: 'var(--brand-gradient)' }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border-[1.5px] border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Layout saved to your account — syncs across all devices.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run all AppearanceTab tests — confirm all pass**

```bash
npx vitest run src/components/settings/AppearanceTab.test.tsx
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/AppearanceTab.tsx src/components/settings/AppearanceTab.test.tsx
git commit -m "feat: add layout width toggle to AppearanceTab"
```

---

## Self-Review

### Spec coverage

| Spec section | Covered by |
|---|---|
| `layoutWidth?: 'fixed' \| 'full'` on `Preference` | Task 1 |
| `layoutWidth?` on `FirestorePreferencePartial` | Task 1 |
| `LayoutContext` with `useLayout` hook | Task 2 |
| `LayoutProvider` — default `'fixed'`, seeds from preference, optimistic update, Firestore write | Task 3 |
| `LayoutProvider` inside `PreferenceProvider` and `AuthProvider` in `App.tsx` | Task 4 |
| `AppShell` applies `max-w-5xl mx-auto w-full` in fixed mode, `w-full` in full mode | Task 5 |
| `AppearanceTab` Layout Width section with two cards, checkmark, subtext | Task 6 |
| `LayoutProvider.test.tsx` — default, seeding, optimistic state, mutate call | Task 3 |
| `AppShell.test.tsx` — fixed/full class assertions | Task 5 |
| `AppearanceTab.test.tsx` — both cards render, active card, click calls setLayoutWidth | Task 6 |
| Firestore rules — no change needed | (confirmed — no task required) |

All spec sections are covered. No gaps.
