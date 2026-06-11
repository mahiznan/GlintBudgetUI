# Onboarding-Style Login Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the marketing landing page at `/` with a full-viewport, dark, onboarding-style login screen — a 75% auto-advancing 5-slide carousel (ported from the iOS onboarding) beside a 25% persistent Google sign-in panel.

**Architecture:** A `LoginScreen` shell composes an `OrbBackground`, an `OnboardingCarousel` (data-driven from a `slides` module + small glass primitives), and a `LoginPanel` that reuses the existing Google auth flow via a new `useGoogleSignIn` hook. All login visuals live in a login-scoped CSS block in `src/styles/index.css` (dark theme never leaks into `/app`). No charting library on `/` — the donut is a CSS `conic-gradient`.

**Tech Stack:** React + TypeScript (strict), Vite, Tailwind CSS v4, Vitest + React Testing Library, Firebase Auth (existing).

**Spec:** `docs/superpowers/specs/2026-06-12-glintbudget-web-login-onboarding-design.md`

---

## File Structure

**Create:**
- `src/hooks/useReducedMotion.ts` (+ `.test.ts`) — `prefers-reduced-motion` matcher.
- `src/hooks/useGoogleSignIn.ts` (+ `.test.tsx`) — Google sign-in flow (extracted from `SignInCard`).
- `src/components/login/demoData.ts` — static category sample data.
- `src/components/login/TransactionChip.tsx` (+ `.test.tsx`) — labelled amount chip.
- `src/components/login/CategoryDonut.tsx` (+ `.test.tsx`) — CSS conic-gradient donut.
- `src/components/login/CategoryBars.tsx` (+ `.test.tsx`) — horizontal category bars.
- `src/components/login/OrbBackground.tsx` (+ `.test.tsx`) — drifting blurred orbs.
- `src/components/login/slides.tsx` — the five slide definitions.
- `src/components/login/OnboardingCarousel.tsx` (+ `.test.tsx`) — slide state, auto-advance, dots.
- `src/components/login/LoginPanel.tsx` (+ `.test.tsx`) — persistent sign-in column.
- `src/components/login/LoginScreen.tsx` (+ `.test.tsx`) — 75/25 split shell.

**Modify:**
- `src/styles/index.css` — append login-scoped CSS block.
- `src/routes/Landing.tsx` — render `<LoginScreen />`.
- `src/routes/Landing.test.tsx` — rewrite for the new screen.

**Delete (after rewire):**
- `src/components/{Header,Hero,FeatureStrip,Footer,SignInCard}.tsx` and their `.test.tsx`.

---

## Task 1: Login-scoped CSS

**Files:**
- Modify: `src/styles/index.css` (append at end)

- [ ] **Step 1: Append the login CSS block**

Append exactly this to the end of `src/styles/index.css`:

```css
/* ════════════════════════════════════════════════════════════════════
   Login screen (unauthenticated /). Dark, app-true green/teal onboarding.
   Scoped under .login-root so it never leaks into the light /app shell.
   ════════════════════════════════════════════════════════════════════ */
.login-root {
  --login-green: #4caf50;
  --login-lime: #8bc34a;
  --login-teal: #4ecdc4;
  --login-ink: #0b0f0d;
  --login-muted: #94a3b8;
  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  background: var(--login-ink);
  color: #f8fafc;
}

/* Background orbs */
.login-orb {
  position: absolute;
  display: block;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.45;
  z-index: 0;
  pointer-events: none;
}
.login-orb--drift {
  animation: login-drift 18s ease-in-out infinite;
}
@keyframes login-drift {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(40px, -30px); }
  66% { transform: translate(-30px, 35px); }
}

/* Left 75% carousel column */
.login-left {
  position: relative;
  z-index: 1;
  width: 75%;
  min-height: 100vh;
  overflow: hidden;
}
.login-brand {
  position: absolute;
  top: 26px;
  left: 48px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 11px;
  font-weight: 700;
  font-size: 18px;
}
.login-brand img { width: 32px; height: 32px; border-radius: 9px; }

/* Slides */
.login-stage { position: relative; min-height: 100vh; }
.login-slide {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  padding: 0 48px;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s, transform 0.7s;
  pointer-events: none;
}
.login-slide--on { opacity: 1; transform: none; pointer-events: auto; }
.login-slide-inner { width: 100%; max-width: 880px; }

.login-eyebrow {
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--login-lime);
  font-weight: 700;
  margin-bottom: 16px;
}
.login-h1 {
  font-size: clamp(30px, 4.4vw, 58px);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.login-lead {
  font-size: clamp(15px, 1.5vw, 20px);
  color: var(--login-muted);
  margin-top: 16px;
  max-width: 560px;
}
.login-grad-text {
  background: linear-gradient(120deg, var(--login-green), var(--login-lime));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Glass surfaces */
.login-glass {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
}
.login-chip {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 13px;
  padding: 11px 15px;
  font-weight: 600;
  font-size: 15px;
  backdrop-filter: blur(8px);
}
.login-pill {
  font-size: 14px;
  font-weight: 600;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(76, 175, 80, 0.18);
  border: 1px solid rgba(139, 195, 74, 0.3);
}
.login-benefit-ic {
  width: 44px;
  height: 44px;
  flex: none;
  display: grid;
  place-items: center;
  font-size: 21px;
  border-radius: 13px;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(139, 195, 74, 0.25));
}

/* Donut + bars */
.login-donut {
  position: relative;
  width: 200px;
  height: 200px;
  flex: none;
  border-radius: 50%;
  -webkit-mask: radial-gradient(circle 62px at center, transparent 98%, #000 100%);
  mask: radial-gradient(circle 62px at center, transparent 98%, #000 100%);
}
.login-donut-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
}
.login-bar-track {
  flex: 1;
  height: 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.login-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--login-green), var(--login-lime));
}

/* Page-indicator dots */
.login-dots {
  position: absolute;
  bottom: 30px;
  left: 48px;
  z-index: 6;
  display: flex;
  gap: 10px;
}
.login-dot {
  width: 9px;
  height: 9px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: all 0.3s;
}
.login-dot--on {
  width: 30px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--login-green), var(--login-lime));
}

/* Right 25% login panel */
.login-panel {
  z-index: 2;
  width: 25%;
  min-width: 320px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 40px 36px;
  background: rgba(255, 255, 255, 0.04);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
}
.login-panel-mark {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  box-shadow: 0 14px 40px rgba(76, 175, 80, 0.4);
  margin-bottom: 22px;
}

/* Reduced motion: kill drift + slide transitions */
@media (prefers-reduced-motion: reduce) {
  .login-orb--drift { animation: none; }
  .login-slide { transition: none; }
}

/* Mobile: stack, login panel on top */
@media (max-width: 767px) {
  .login-root { flex-direction: column; }
  .login-left { width: 100%; min-height: 70vh; }
  .login-stage { min-height: 70vh; }
  .login-panel {
    width: 100%;
    min-height: auto;
    order: -1;
    border-left: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .login-brand { left: 24px; }
  .login-slide { padding: 0 24px; }
  .login-dots { left: 24px; }
}
```

- [ ] **Step 2: Verify the build still compiles the stylesheet**

Run: `npm run build`
Expected: build succeeds, no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/index.css
git commit -m "feat: add login-scoped onboarding styles"
```

---

## Task 2: `useReducedMotion` hook

**Files:**
- Create: `src/hooks/useReducedMotion.ts`
- Test: `src/hooks/useReducedMotion.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useReducedMotion.test.ts
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from './useReducedMotion';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

describe('useReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns true when the user prefers reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('returns false when the user has no motion preference', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/hooks/useReducedMotion.test.ts`
Expected: FAIL — cannot find module `./useReducedMotion`.

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useReducedMotion.ts
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Tracks the user's `prefers-reduced-motion` setting, updating if it changes. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setReduced(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/hooks/useReducedMotion.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useReducedMotion.ts src/hooks/useReducedMotion.test.ts
git commit -m "feat: add useReducedMotion hook"
```

---

## Task 3: `useGoogleSignIn` hook

Extracts the Google auth flow currently inside `SignInCard.tsx` so `LoginPanel` reuses one source of truth.

**Files:**
- Create: `src/hooks/useGoogleSignIn.ts`
- Test: `src/hooks/useGoogleSignIn.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/hooks/useGoogleSignIn.test.tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import type { AuthState } from '../auth/types';

const signInWithGoogle = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../firebase/auth', () => ({ signInWithGoogle, signOutCurrentUser: vi.fn() }));
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

import { useGoogleSignIn } from './useGoogleSignIn';

function wrapper(state: AuthState) {
  return ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={state}>
      <MemoryRouter>{children}</MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('useGoogleSignIn', () => {
  beforeEach(() => {
    signInWithGoogle.mockReset();
    navigate.mockReset();
  });

  it('calls signInWithGoogle when signIn runs', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGoogleSignIn(), {
      wrapper: wrapper({ status: 'anonymous', user: null }),
    });
    await act(() => result.current.signIn());
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('maps popup-blocked to a helpful message', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-blocked' });
    const { result } = renderHook(() => useGoogleSignIn(), {
      wrapper: wrapper({ status: 'anonymous', user: null }),
    });
    await act(() => result.current.signIn());
    await waitFor(() => expect(result.current.error).toMatch(/popup blocked/i));
  });

  it('stays silent when the user closes the popup', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    const { result } = renderHook(() => useGoogleSignIn(), {
      wrapper: wrapper({ status: 'anonymous', user: null }),
    });
    await act(() => result.current.signIn());
    expect(result.current.error).toBeNull();
  });

  it('redirects to /app when already authenticated', () => {
    renderHook(() => useGoogleSignIn(), {
      wrapper: wrapper({
        status: 'authenticated',
        user: { uid: 'u', name: 'R', email: null, photoUrl: null },
      }),
    });
    expect(navigate).toHaveBeenCalledWith('/app', { replace: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/hooks/useGoogleSignIn.test.tsx`
Expected: FAIL — cannot find module `./useGoogleSignIn`.

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useGoogleSignIn.ts
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { signInWithGoogle } from '../firebase/auth';

function messageForError(code: unknown): string | null {
  if (typeof code !== 'string') return 'Sign-in failed. Please try again.';
  if (code === 'auth/popup-closed-by-user') return null;
  if (code === 'auth/popup-blocked')
    return 'Popup blocked. Please allow popups for this site and try again.';
  return 'Sign-in failed. Please try again.';
}

export interface GoogleSignIn {
  signIn: () => Promise<void>;
  busy: boolean;
  error: string | null;
}

/** Google sign-in flow: triggers the popup, maps errors, redirects on auth. */
export function useGoogleSignIn(): GoogleSignIn {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status === 'authenticated') {
      navigate('/app', { replace: true });
    }
  }, [auth.status, navigate]);

  const signIn = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const code = (e as { code?: unknown } | null)?.code;
      const message = messageForError(code);
      if (message !== null) setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  return { signIn, busy, error };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/hooks/useGoogleSignIn.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGoogleSignIn.ts src/hooks/useGoogleSignIn.test.tsx
git commit -m "feat: add useGoogleSignIn hook"
```

---

## Task 4: Demo data

**Files:**
- Create: `src/components/login/demoData.ts`

- [ ] **Step 1: Write the module**

```ts
// src/components/login/demoData.ts
export interface CategoryDatum {
  name: string;
  emoji: string;
  amount: number;
}

/** Static showcase data for the analytics slide (mirrors iOS OnboardingDemoData). */
export const LOGIN_CATEGORIES: CategoryDatum[] = [
  { name: 'Groceries', emoji: '🛒', amount: 420 },
  { name: 'Dining', emoji: '🍽', amount: 260 },
  { name: 'Bills', emoji: '💡', amount: 240 },
  { name: 'Transport', emoji: '🚆', amount: 180 },
  { name: 'Shopping', emoji: '🛍', amount: 150 },
];

export const LOGIN_TOTAL = LOGIN_CATEGORIES.reduce((sum, c) => sum + c.amount, 0); // 1250
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/login/demoData.ts
git commit -m "feat: add login demo data"
```

---

## Task 5: `TransactionChip`

**Files:**
- Create: `src/components/login/TransactionChip.tsx`
- Test: `src/components/login/TransactionChip.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/login/TransactionChip.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TransactionChip from './TransactionChip';

describe('TransactionChip', () => {
  it('renders the label and amount', () => {
    render(<TransactionChip emoji="☕" label="Coffee" amount="-$4.20" />);
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('-$4.20')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/login/TransactionChip.test.tsx`
Expected: FAIL — cannot find module `./TransactionChip`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/login/TransactionChip.tsx
interface Props {
  emoji: string;
  label: string;
  amount: string;
  positive?: boolean;
}

/** A frosted transaction chip used on the hook slide (e.g. "☕ Coffee -$4.20"). */
export default function TransactionChip({ emoji, label, amount, positive = false }: Props) {
  return (
    <span className="login-chip">
      <span aria-hidden="true">{emoji}</span>
      <span>{label}</span>
      <b className={positive ? 'text-[#8bc34a]' : 'text-slate-400'}>{amount}</b>
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/login/TransactionChip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/TransactionChip.tsx src/components/login/TransactionChip.test.tsx
git commit -m "feat: add TransactionChip"
```

---

## Task 6: `CategoryDonut`

**Files:**
- Create: `src/components/login/CategoryDonut.tsx`
- Test: `src/components/login/CategoryDonut.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/login/CategoryDonut.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryDonut from './CategoryDonut';
import { LOGIN_CATEGORIES, LOGIN_TOTAL } from './demoData';

describe('CategoryDonut', () => {
  it('renders the total and a conic-gradient image', () => {
    render(<CategoryDonut data={LOGIN_CATEGORIES} total={LOGIN_TOTAL} />);
    expect(screen.getByText('$1,250')).toBeInTheDocument();
    const img = screen.getByRole('img', { name: /spending breakdown/i });
    expect(img.style.background).toContain('conic-gradient');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/login/CategoryDonut.test.tsx`
Expected: FAIL — cannot find module `./CategoryDonut`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/login/CategoryDonut.tsx
import type { CategoryDatum } from './demoData';

const SEGMENT_COLORS = ['#4caf50', '#8bc34a', '#4ecdc4', '#7fb069', '#a8d08d'];

interface Props {
  data: CategoryDatum[];
  total: number;
}

/** Donut chart drawn with a CSS conic-gradient — no charting library. */
export default function CategoryDonut({ data, total }: Props) {
  const sum = data.reduce((acc, d) => acc + d.amount, 0) || 1;
  let cursor = 0;
  const stops = data
    .map((d, i) => {
      const start = (cursor / sum) * 100;
      cursor += d.amount;
      const end = (cursor / sum) * 100;
      return `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div
      className="login-donut"
      style={{ background: `conic-gradient(${stops})` }}
      role="img"
      aria-label={`Spending breakdown, total $${total.toLocaleString()}`}
    >
      <div className="login-donut-center">
        <div>
          <div className="text-xs text-slate-400">Total</div>
          <div className="text-2xl font-extrabold">${total.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/login/CategoryDonut.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/CategoryDonut.tsx src/components/login/CategoryDonut.test.tsx
git commit -m "feat: add CSS CategoryDonut"
```

---

## Task 7: `CategoryBars`

**Files:**
- Create: `src/components/login/CategoryBars.tsx`
- Test: `src/components/login/CategoryBars.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/login/CategoryBars.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryBars from './CategoryBars';
import { LOGIN_CATEGORIES } from './demoData';

describe('CategoryBars', () => {
  it('renders a row per category with its amount', () => {
    render(<CategoryBars data={LOGIN_CATEGORIES} />);
    expect(screen.getByText(/Groceries/)).toBeInTheDocument();
    expect(screen.getByText('$420')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(LOGIN_CATEGORIES.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/login/CategoryBars.test.tsx`
Expected: FAIL — cannot find module `./CategoryBars`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/login/CategoryBars.tsx
import type { CategoryDatum } from './demoData';

interface Props {
  data: CategoryDatum[];
}

/** Horizontal category spend bars, widths relative to the largest category. */
export default function CategoryBars({ data }: Props) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <ul className="flex min-w-[240px] flex-1 flex-col gap-3">
      {data.map((d) => (
        <li key={d.name} className="flex items-center gap-3 text-sm">
          <span className="w-24 text-slate-400">
            {d.emoji} {d.name}
          </span>
          <span className="login-bar-track">
            <span className="login-bar-fill" style={{ width: `${(d.amount / max) * 100}%` }} />
          </span>
          <b>${d.amount}</b>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/login/CategoryBars.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/CategoryBars.tsx src/components/login/CategoryBars.test.tsx
git commit -m "feat: add CategoryBars"
```

---

## Task 8: `OrbBackground`

**Files:**
- Create: `src/components/login/OrbBackground.tsx`
- Test: `src/components/login/OrbBackground.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/login/OrbBackground.test.tsx
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OrbBackground from './OrbBackground';

const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotion.value,
}));

describe('OrbBackground', () => {
  afterEach(() => {
    reducedMotion.value = false;
  });

  it('renders three drifting orbs by default', () => {
    const { container } = render(<OrbBackground />);
    expect(container.querySelectorAll('.login-orb--drift')).toHaveLength(3);
  });

  it('omits the drift animation class under reduced motion', () => {
    reducedMotion.value = true;
    const { container } = render(<OrbBackground />);
    expect(container.querySelectorAll('.login-orb')).toHaveLength(3);
    expect(container.querySelectorAll('.login-orb--drift')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/login/OrbBackground.test.tsx`
Expected: FAIL — cannot find module `./OrbBackground`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/login/OrbBackground.tsx
import type { CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ORBS: CSSProperties[] = [
  { width: 480, height: 480, background: '#4caf50', top: -160, left: -120 },
  { width: 380, height: 380, background: '#8bc34a', bottom: -160, left: '30%', animationDelay: '-6s' },
  { width: 320, height: 320, background: '#4ecdc4', top: '30%', left: '40%', opacity: 0.28, animationDelay: '-12s' },
];

/** Three large blurred orbs drifting behind the carousel. Static under reduced motion. */
export default function OrbBackground() {
  const reduced = useReducedMotion();
  const className = reduced ? 'login-orb' : 'login-orb login-orb--drift';
  return (
    <div aria-hidden="true">
      {ORBS.map((style, i) => (
        <span key={i} className={className} style={style} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/login/OrbBackground.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/login/OrbBackground.tsx src/components/login/OrbBackground.test.tsx
git commit -m "feat: add OrbBackground"
```

---

## Task 9: Slide definitions

**Files:**
- Create: `src/components/login/slides.tsx`

- [ ] **Step 1: Write the module**

```tsx
// src/components/login/slides.tsx
import type { ReactNode } from 'react';
import CategoryBars from './CategoryBars';
import CategoryDonut from './CategoryDonut';
import TransactionChip from './TransactionChip';
import { LOGIN_CATEGORIES, LOGIN_TOTAL } from './demoData';

export interface Slide {
  id: string;
  eyebrow?: string;
  render: () => ReactNode;
}

const BENEFITS = [
  { icon: '🔍', title: 'See where money disappears' },
  { icon: '✅', title: 'Feel in control every day' },
  { icon: '📈', title: 'Build wealth — no spreadsheets' },
  { icon: '📸', title: 'Snap a receipt, done' },
];

/** The five onboarding slides, ported from the iOS app. */
export const SLIDES: Slide[] = [
  {
    id: 'hook',
    eyebrow: 'Welcome',
    render: () => (
      <>
        <h1 className="login-h1">
          See your money
          <br />
          <span className="login-grad-text">in a new light.</span>
        </h1>
        <p className="login-lead">
          GlintBudget turns everyday spending into clarity you can feel.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <TransactionChip emoji="☕" label="Coffee" amount="-$4.20" />
          <TransactionChip emoji="🚇" label="Metro" amount="-$2.75" />
          <TransactionChip emoji="💰" label="Salary" amount="+$3,200" positive />
        </div>
      </>
    ),
  },
  {
    id: 'intelligence',
    eyebrow: 'Intelligence',
    render: () => (
      <>
        <h1 className="login-h1">Smart by default.</h1>
        <p className="login-lead">
          Auto-categorized transactions and insights you actually understand.
        </p>
        <div className="mt-7 flex max-w-md flex-col gap-3">
          <div className="login-glass flex items-center justify-between px-5 py-4">
            <span>🍴 Dining</span>
            <b className="text-[#4ecdc4]">↑ 12% this week</b>
          </div>
          <div className="login-glass flex items-center justify-between px-5 py-4">
            <span>You saved this month</span>
            <span className="text-2xl font-extrabold text-[#8bc34a]">$2,300</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <span className="login-pill">🛒 Groceries</span>
            <span className="login-pill">🚆 Transport</span>
            <span className="login-pill">💡 Bills</span>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'analytics',
    eyebrow: 'Analytics',
    render: () => (
      <>
        <h1 className="login-h1">
          Your spending,
          <br />
          <span className="login-grad-text">beautifully clear.</span>
        </h1>
        <p className="login-lead">Live reports that make every dollar visible.</p>
        <div className="login-glass mt-7 p-7">
          <div className="flex flex-wrap items-center gap-10">
            <CategoryDonut data={LOGIN_CATEGORIES} total={LOGIN_TOTAL} />
            <CategoryBars data={LOGIN_CATEGORIES} />
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'superpowers',
    eyebrow: 'Why GlintBudget',
    render: () => (
      <>
        <h1 className="login-h1">
          Your money <span className="login-grad-text">superpowers.</span>
        </h1>
        <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3.5 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="login-glass flex items-center gap-4 p-5">
              <span className="login-benefit-ic" aria-hidden="true">
                {b.icon}
              </span>
              <span className="font-bold">{b.title}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'launch',
    render: () => (
      <div className="text-center">
        <div className="text-5xl" aria-hidden="true">
          ✨
        </div>
        <h1 className="login-h1 mt-3">
          Ready when <span className="login-grad-text">you are.</span>
        </h1>
        <p className="login-lead mx-auto">
          Your financial universe is one click away — sign in to begin.
        </p>
      </div>
    ),
  },
];
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/login/slides.tsx
git commit -m "feat: add onboarding slide definitions"
```

---

## Task 10: `OnboardingCarousel`

**Files:**
- Create: `src/components/login/OnboardingCarousel.tsx`
- Test: `src/components/login/OnboardingCarousel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/login/OnboardingCarousel.test.tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotion.value,
}));

import OnboardingCarousel from './OnboardingCarousel';

function activeSlide(): HTMLElement {
  const el = document.querySelector('.login-slide--on');
  if (!(el instanceof HTMLElement)) throw new Error('no active slide');
  return el;
}

describe('OnboardingCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotion.value = false;
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('starts on the first slide', () => {
    render(<OnboardingCarousel />);
    expect(activeSlide().textContent).toContain('See your money');
  });

  it('auto-advances to the next slide after the interval', () => {
    render(<OnboardingCarousel />);
    act(() => {
      vi.advanceTimersByTime(4200);
    });
    expect(activeSlide().textContent).toContain('Smart by default.');
  });

  it('jumps to a slide when its dot is clicked', () => {
    render(<OnboardingCarousel />);
    fireEvent.click(screen.getByRole('button', { name: /go to slide 4/i }));
    expect(activeSlide().textContent).toContain('superpowers');
  });

  it('does not auto-advance under reduced motion', () => {
    reducedMotion.value = true;
    render(<OnboardingCarousel />);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(activeSlide().textContent).toContain('See your money');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/login/OnboardingCarousel.test.tsx`
Expected: FAIL — cannot find module `./OnboardingCarousel`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/login/OnboardingCarousel.tsx
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { SLIDES } from './slides';

const INTERVAL_MS = 4200;

/** Auto-advancing onboarding pager with clickable page-indicator dots. */
export default function OnboardingCarousel() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced, paused, index]);

  return (
    <>
      <div
        className="login-stage"
        aria-roledescription="carousel"
        aria-label="GlintBudget highlights"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((slide, i) => (
          <section
            key={slide.id}
            className={`login-slide${i === index ? ' login-slide--on' : ''}`}
            aria-hidden={i !== index}
          >
            <div className="login-slide-inner">
              {slide.eyebrow && <div className="login-eyebrow">{slide.eyebrow}</div>}
              {slide.render()}
            </div>
          </section>
        ))}
      </div>

      <div className="login-dots" role="tablist" aria-label="Choose slide">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className={`login-dot${i === index ? ' login-dot--on' : ''}`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/login/OnboardingCarousel.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/login/OnboardingCarousel.tsx src/components/login/OnboardingCarousel.test.tsx
git commit -m "feat: add OnboardingCarousel"
```

---

## Task 11: `LoginPanel`

**Files:**
- Create: `src/components/login/LoginPanel.tsx`
- Test: `src/components/login/LoginPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/login/LoginPanel.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../auth/AuthContext';
import type { AuthState } from '../../auth/types';

const signInWithGoogle = vi.hoisted(() => vi.fn());
vi.mock('../../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../../firebase/auth', () => ({ signInWithGoogle, signOutCurrentUser: vi.fn() }));

import LoginPanel from './LoginPanel';

function renderPanel(state: AuthState = { status: 'anonymous', user: null }) {
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter>
        <LoginPanel />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('LoginPanel', () => {
  beforeEach(() => signInWithGoogle.mockReset());

  it('renders the welcome heading and Google button', () => {
    renderPanel();
    expect(screen.getByText(/welcome to glintbudget/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls signInWithGoogle on click', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('surfaces the popup-blocked error', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-blocked' });
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/popup blocked/i));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/login/LoginPanel.test.tsx`
Expected: FAIL — cannot find module `./LoginPanel`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/login/LoginPanel.tsx
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/** Persistent sign-in column shown beside the carousel on every slide. */
export default function LoginPanel() {
  const { signIn, busy, error } = useGoogleSignIn();

  return (
    <aside className="login-panel">
      <img className="login-panel-mark" src="/glint.svg" alt="GlintBudget" />
      <h2 className="text-xl font-extrabold">Welcome to GlintBudget</h2>
      <p className="mt-2 max-w-[240px] text-sm text-slate-400">
        Sign in to start tracking your finances
      </p>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="mt-7 flex w-full max-w-[280px] items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-3 text-[15px] font-semibold text-[#3c4043] shadow-md hover:bg-[#f8f9fa] disabled:opacity-60"
      >
        <GoogleIcon />
        {busy ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error !== null && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">Free · No credit card required</p>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/login/LoginPanel.test.tsx`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/login/LoginPanel.tsx src/components/login/LoginPanel.test.tsx
git commit -m "feat: add LoginPanel"
```

---

## Task 12: `LoginScreen`

**Files:**
- Create: `src/components/login/LoginScreen.tsx`
- Test: `src/components/login/LoginScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/login/LoginScreen.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../auth/AuthContext';

// Reduced motion ON disables the carousel timer for a deterministic test.
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('../../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../../firebase/auth', () => ({ signInWithGoogle: vi.fn(), signOutCurrentUser: vi.fn() }));

import LoginScreen from './LoginScreen';

function renderScreen() {
  return render(
    <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('LoginScreen', () => {
  it('renders the brand wordmark', () => {
    renderScreen();
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('renders the persistent Google sign-in button', () => {
    renderScreen();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('renders the first slide heading', () => {
    renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: /see your money/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/login/LoginScreen.test.tsx`
Expected: FAIL — cannot find module `./LoginScreen`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/login/LoginScreen.tsx
import LoginPanel from './LoginPanel';
import OnboardingCarousel from './OnboardingCarousel';
import OrbBackground from './OrbBackground';

/** Unauthenticated entry point: 75% onboarding carousel + 25% sign-in panel. */
export default function LoginScreen() {
  return (
    <div className="login-root">
      <OrbBackground />
      <div className="login-left">
        <div className="login-brand">
          <img src="/glint.svg" alt="GlintBudget logo" />
          <b>GlintBudget</b>
        </div>
        <OnboardingCarousel />
      </div>
      <LoginPanel />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/login/LoginScreen.test.tsx`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/login/LoginScreen.tsx src/components/login/LoginScreen.test.tsx
git commit -m "feat: add LoginScreen shell"
```

---

## Task 13: Wire the `/` route to `LoginScreen`

**Files:**
- Modify: `src/routes/Landing.tsx` (full rewrite)
- Modify: `src/routes/Landing.test.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the Landing route test**

Replace the entire contents of `src/routes/Landing.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import Landing from './Landing';

vi.mock('../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../firebase/auth', () => ({ signInWithGoogle: vi.fn(), signOutCurrentUser: vi.fn() }));

function renderLanding() {
  return render(
    <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Landing route', () => {
  it('renders the GlintBudget wordmark', () => {
    renderLanding();
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('renders the hero heading', () => {
    renderLanding();
    // The carousel keeps all slides mounted, so several h1s exist; assert the first slide's.
    expect(
      screen.getByRole('heading', { level: 1, name: /see your money/i }),
    ).toBeInTheDocument();
  });

  it('renders the Google sign-in button', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/routes/Landing.test.tsx`
Expected: FAIL — `Landing` still renders the old footer/hero; the wordmark assertion may pass but the sign-in button query fails (old layout differs), and the old imports remain.

- [ ] **Step 3: Rewrite `Landing.tsx`**

Replace the entire contents of `src/routes/Landing.tsx` with:

```tsx
import LoginScreen from '../components/login/LoginScreen';

export default function Landing() {
  return <LoginScreen />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/routes/Landing.test.tsx`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add src/routes/Landing.tsx src/routes/Landing.test.tsx
git commit -m "feat: render onboarding login screen at /"
```

---

## Task 14: Remove the retired marketing components

Confirmed during planning that the only importers of these were `Landing.tsx` (now rewired) and `Hero.tsx` (itself being removed). No `/app` code references them.

**Files:**
- Delete: `src/components/Header.tsx`, `src/components/Header.test.tsx`
- Delete: `src/components/Hero.tsx`, `src/components/Hero.test.tsx`
- Delete: `src/components/FeatureStrip.tsx`, `src/components/FeatureStrip.test.tsx`
- Delete: `src/components/Footer.tsx`, `src/components/Footer.test.tsx`
- Delete: `src/components/SignInCard.tsx`, `src/components/SignInCard.test.tsx`

- [ ] **Step 1: Re-confirm no remaining importers**

Run:
```bash
grep -rEn "from '\.\./components/(Header|Hero|FeatureStrip|Footer|SignInCard)'|from '\./(Header|Hero|FeatureStrip|Footer|SignInCard)'" src
```
Expected: no output (empty). If anything prints, stop and resolve that import before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/Header.tsx src/components/Header.test.tsx \
       src/components/Hero.tsx src/components/Hero.test.tsx \
       src/components/FeatureStrip.tsx src/components/FeatureStrip.test.tsx \
       src/components/Footer.tsx src/components/Footer.test.tsx \
       src/components/SignInCard.tsx src/components/SignInCard.test.tsx
```

- [ ] **Step 3: Verify typecheck and tests still pass**

Run: `npm run typecheck && npm run test`
Expected: typecheck clean; full suite green (no dangling imports, no orphaned tests).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove marketing landing components superseded by login screen"
```

---

## Task 15: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors. (If lint flags `key={i}` in `OrbBackground`, it is acceptable here — the orb list is static and never reordered; otherwise satisfy the rule with a stable key.)

- [ ] **Step 3: Format**

Run: `npm run format`
Expected: files formatted; commit any changes.

- [ ] **Step 4: Full test run**

Run: `npm run test`
Expected: all suites pass.

- [ ] **Step 5: Production build + manual smoke**

Run: `npm run build && npm run preview`
Then open the preview URL and confirm:
- `/` shows the dark split screen: carousel left, sign-in panel right.
- Slides auto-advance (~4.2s); hovering the left side pauses; dots jump between slides.
- The Google button and brand logo render with the real `glint.svg`.
- Narrow the window below 768px: panel stacks on top, carousel below.

- [ ] **Step 6: Commit any formatting changes**

```bash
git add -A
git commit -m "chore: format login screen" || echo "nothing to format"
```

---

## Self-Review Notes

- **Spec coverage:** §3 layout → Tasks 1, 10, 12; §3 slides (all 5) → Task 9 (+ 5,6,7); palette/dark-scoping → Task 1; component structure §4 → Tasks 2–12; sign-in reuse → Task 3/11; responsive §5 → Task 1 media query + Task 15 smoke; accessibility §6 → reduced-motion (Tasks 2,8,10), dot buttons + aria (Task 10), alert (Task 11); performance §7 → CSS donut (Task 6), no new deps; testing §8 → co-located tests each task; retire old components → Task 14.
- **Type consistency:** `CategoryDatum` defined in Task 4 and consumed unchanged in Tasks 6/7/9; `Slide` in Task 9 consumed in Task 10; `useGoogleSignIn` returns `{ signIn, busy, error }` in Task 3 and used as such in Task 11.
- **No placeholders:** every code step contains complete source.
