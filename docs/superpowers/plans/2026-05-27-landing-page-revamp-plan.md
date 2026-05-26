# Landing Page Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revamp the GlintBudget landing page to be a standalone web product with inline sign-in, a standard Google button, logo image, richer copy, and the build info moved to the dashboard.

**Architecture:** Extract sign-in logic into a new `SignInCard` component; the `Hero` component becomes a two-column layout (copy left, `SignInCard` right). `Header` becomes logo-only (no nav, no sign-in CTA). Build info moves from `Footer` to the bottom of `Dashboard`.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS v4, Vitest + React Testing Library, React Router v7, Firebase Auth.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/SignInCard.tsx` | Google sign-in card with standard button; shows "Open dashboard" when authenticated |
| Create | `src/components/SignInCard.test.tsx` | Full behaviour tests for SignInCard |
| Modify | `src/components/Header.tsx` | Logo image + wordmark only; remove nav and AuthCta |
| Modify | `src/components/Header.test.tsx` | Remove auth-state tests; add logo image test |
| Modify | `src/components/Hero.tsx` | Two-column layout with new copy; embed SignInCard |
| Modify | `src/components/Hero.test.tsx` | Update for new headline/copy; add firebase mocks |
| Modify | `src/components/FeatureStrip.tsx` | Replace third card; add section label |
| Modify | `src/components/FeatureStrip.test.tsx` | Update for new card content |
| Modify | `src/components/Footer.tsx` | Remove iOS App Store link and build info div |
| Modify | `src/components/Footer.test.tsx` | Remove build-info test; add no-iOS assertion |
| Modify | `src/routes/Dashboard.tsx` | Add formatBuildTime helper + build info line at bottom |
| Modify | `src/routes/SignIn.tsx` | Redirect to `/` (sign-in now lives on landing page) |
| Modify | `src/routes/SignIn.test.tsx` | Replace all tests with a single redirect test |
| Modify | `src/routes/Landing.test.tsx` | Add firebase mock; update assertions for new content |

---

## Task 1: Create `SignInCard` component

**Files:**
- Create: `src/components/SignInCard.tsx`
- Create: `src/components/SignInCard.test.tsx`

- [ ] **Step 1.1: Write the failing tests**

Create `src/components/SignInCard.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import type { AuthState } from '../auth/types';

const signInWithGoogle = vi.hoisted(() => vi.fn());

vi.mock('../firebase/client', () => ({
  auth: { kind: 'mock-auth' },
}));

vi.mock('../firebase/auth', () => ({
  signInWithGoogle,
  signOutCurrentUser: vi.fn(),
}));

import SignInCard from './SignInCard';

function renderWith(state: AuthState) {
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter>
        <SignInCard />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('SignInCard', () => {
  beforeEach(() => {
    signInWithGoogle.mockReset();
  });

  it('renders a "Sign in with Google" button when anonymous', () => {
    renderWith({ status: 'anonymous', user: null });
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls signInWithGoogle on click', async () => {
    signInWithGoogle.mockResolvedValue(undefined);
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows "Open dashboard" link when authenticated', () => {
    renderWith({
      status: 'authenticated',
      user: { uid: 'u', name: 'R', email: null, photoUrl: null },
    });
    const link = screen.getByRole('link', { name: /open dashboard/i });
    expect(link).toHaveAttribute('href', '/app');
  });

  it('shows the popup-blocked message when signInWithGoogle throws auth/popup-blocked', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-blocked' });
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByText(/popup blocked/i)).toBeInTheDocument());
  });

  it('stays silent when the user closes the popup themselves', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a generic failure message on any other error', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'auth/network-request-failed' });
    renderWith({ status: 'anonymous', user: null });
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose src/components/SignInCard.test.tsx
```

Expected: FAIL — `Cannot find module './SignInCard'`

- [ ] **Step 1.3: Implement `SignInCard`**

Create `src/components/SignInCard.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { signInWithGoogle } from '../firebase/auth';

function messageForError(code: unknown): string | null {
  if (typeof code !== 'string') return 'Sign-in failed. Please try again.';
  if (code === 'auth/popup-closed-by-user') return null;
  if (code === 'auth/popup-blocked')
    return 'Popup blocked. Please allow popups for this site and try again.';
  return 'Sign-in failed. Please try again.';
}

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

export default function SignInCard() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (auth.status === 'authenticated') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md text-center">
        <img
          src="/glint.jpg"
          alt=""
          className="mx-auto mb-4 h-[52px] w-[52px] rounded-xl object-cover"
        />
        <p className="text-sm text-slate-600 mb-6">You&apos;re signed in.</p>
        <Link
          to="/app"
          className="inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Open dashboard →
        </Link>
      </div>
    );
  }

  async function handleClick() {
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
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md text-center">
      <img
        src="/glint.jpg"
        alt=""
        className="mx-auto mb-4 h-[52px] w-[52px] rounded-xl object-cover"
      />
      <h2 className="text-lg font-bold text-slate-900">Welcome to GlintBudget</h2>
      <p className="mt-1 text-sm text-slate-600">Sign in to start tracking your finances</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="mt-6 flex w-full items-center gap-3 rounded-md border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4043] shadow-sm hover:bg-[#f8f9fa] disabled:opacity-60"
      >
        <GoogleIcon />
        {busy ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error !== null && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-400">Free · No credit card required</p>
    </div>
  );
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/components/SignInCard.test.tsx
```

Expected: all 6 tests PASS

- [ ] **Step 1.5: Commit**

```bash
git add src/components/SignInCard.tsx src/components/SignInCard.test.tsx
git commit -m "feat: add SignInCard component with standard Google sign-in button"
```

---

## Task 2: Simplify `Header`

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Header.test.tsx`

- [ ] **Step 2.1: Write the updated failing tests**

Replace the contents of `src/components/Header.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Header from './Header';

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('renders the GlintBudget wordmark', () => {
    renderHeader();
    expect(screen.getByText('GlintBudget')).toBeInTheDocument();
  });

  it('is rendered as a banner landmark', () => {
    renderHeader();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the logo image', () => {
    renderHeader();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/glint.jpg');
  });

  it('does not render a sign-in link', () => {
    renderHeader();
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
  });

  it('does not render nav links', () => {
    renderHeader();
    expect(screen.queryByText(/features/i)).toBeNull();
    expect(screen.queryByText(/about/i)).toBeNull();
  });
});
```

- [ ] **Step 2.2: Run tests to confirm failures**

```bash
npm run test -- --reporter=verbose src/components/Header.test.tsx
```

Expected: some tests FAIL (the logo test fails; the "no sign-in link" test fails because the link is still there)

- [ ] **Step 2.3: Rewrite `Header`**

Replace the full contents of `src/components/Header.tsx`:

```tsx
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/glint.jpg" alt="" className="h-9 w-9 rounded-lg object-cover" />
          <span className="text-xl font-bold tracking-tight text-slate-900">GlintBudget</span>
        </Link>
      </div>
    </header>
  );
}

export default Header;
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/components/Header.test.tsx
```

Expected: all 5 tests PASS

- [ ] **Step 2.5: Commit**

```bash
git add src/components/Header.tsx src/components/Header.test.tsx
git commit -m "feat: simplify header to logo + wordmark only"
```

---

## Task 3: Rewrite `Hero` with two-column layout

**Files:**
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/Hero.test.tsx`

- [ ] **Step 3.1: Write the updated failing tests**

Replace the full contents of `src/components/Hero.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import Hero from './Hero';

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

function renderHero() {
  return render(
    <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Hero', () => {
  it('renders the headline', () => {
    renderHero();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/personal finance/i)).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderHero();
    expect(screen.getByText(/Add transactions in seconds/i)).toBeInTheDocument();
  });

  it('renders all four bullet points', () => {
    renderHero();
    expect(screen.getByText(/Add a transaction in under 5 seconds/i)).toBeInTheDocument();
    expect(screen.getByText(/Spending patterns revealed automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/Works on desktop, tablet, and mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/Multi-currency support built in/i)).toBeInTheDocument();
  });

  it('renders the sign-in card inside the hero', () => {
    renderHero();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('contains no iOS references', () => {
    renderHero();
    expect(screen.queryByText(/iphone/i)).toBeNull();
    expect(screen.queryByText(/ios/i)).toBeNull();
  });
});
```

- [ ] **Step 3.2: Run tests to confirm failures**

```bash
npm run test -- --reporter=verbose src/components/Hero.test.tsx
```

Expected: most tests FAIL (old headline text, no sign-in card, etc.)

- [ ] **Step 3.3: Rewrite `Hero`**

Replace the full contents of `src/components/Hero.tsx`:

```tsx
import SignInCard from './SignInCard';

const BULLETS = [
  'Add a transaction in under 5 seconds',
  'Spending patterns revealed automatically',
  'Works on desktop, tablet, and mobile',
  'Multi-currency support built in',
];

function Hero() {
  return (
    <section className="bg-gradient-to-br from-slate-50 to-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-12 md:flex-row md:items-center md:gap-16">
          {/* Left column — copy */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Personal finance
              <br />
              <span className="text-brand">made effortless.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Add transactions in seconds. Watch your spending patterns emerge in real time.
              GlintBudget keeps it simple — no spreadsheets, no complexity, just clarity.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {BULLETS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-600">
                  <span className="font-bold text-brand" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Right column — sign-in card */}
          <div className="w-full md:w-auto md:min-w-[300px] md:max-w-[340px]">
            <SignInCard />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/components/Hero.test.tsx
```

Expected: all 5 tests PASS

- [ ] **Step 3.5: Commit**

```bash
git add src/components/Hero.tsx src/components/Hero.test.tsx
git commit -m "feat: rewrite hero as two-column layout with SignInCard"
```

---

## Task 4: Update `FeatureStrip`

**Files:**
- Modify: `src/components/FeatureStrip.tsx`
- Modify: `src/components/FeatureStrip.test.tsx`

- [ ] **Step 4.1: Write the updated failing tests**

Replace the full contents of `src/components/FeatureStrip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FeatureStrip from './FeatureStrip';

describe('FeatureStrip', () => {
  it('renders the section label', () => {
    render(<FeatureStrip />);
    expect(
      screen.getByText(/Everything you need to manage your money/i),
    ).toBeInTheDocument();
  });

  it('renders all three feature titles', () => {
    render(<FeatureStrip />);
    expect(screen.getByText(/Multi-currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile-friendly/i)).toBeInTheDocument();
  });

  it('does not contain any iOS references', () => {
    render(<FeatureStrip />);
    expect(screen.queryByText(/ios/i)).toBeNull();
    expect(screen.queryByText(/iphone/i)).toBeNull();
  });

  it('has id="features" for in-page anchor links', () => {
    const { container } = render(<FeatureStrip />);
    expect(container.querySelector('#features')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4.2: Run tests to confirm failures**

```bash
npm run test -- --reporter=verbose src/components/FeatureStrip.test.tsx
```

Expected: "Mobile-friendly" test FAIL, "no iOS references" test FAIL, section label test FAIL

- [ ] **Step 4.3: Update `FeatureStrip`**

Replace the full contents of `src/components/FeatureStrip.tsx`:

```tsx
const FEATURES = [
  {
    emoji: '💱',
    title: 'Multi-currency',
    description:
      'Default currency with per-transaction overrides. Perfect for travel or international spending.',
  },
  {
    emoji: '📊',
    title: 'Smart reports',
    description:
      'Pie and bar charts filtered by category, vendor, and account. See where your money really goes.',
  },
  {
    emoji: '📱',
    title: 'Mobile-friendly',
    description:
      'Fully responsive — looks great and works perfectly on your phone, tablet, or desktop.',
  },
] as const;

function FeatureStrip() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
          Everything you need to manage your money
        </p>
        <div className="grid gap-10 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="text-4xl" aria-hidden="true">
                {feature.emoji}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureStrip;
```

- [ ] **Step 4.4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/components/FeatureStrip.test.tsx
```

Expected: all 4 tests PASS

- [ ] **Step 4.5: Commit**

```bash
git add src/components/FeatureStrip.tsx src/components/FeatureStrip.test.tsx
git commit -m "feat: update feature strip — mobile-friendly card, section label, no iOS copy"
```

---

## Task 5: Move build info to `Dashboard`

**Files:**
- Modify: `src/routes/Dashboard.tsx`

- [ ] **Step 5.1: Add `formatBuildTime` helper and build info line to `Dashboard`**

Open `src/routes/Dashboard.tsx`. Add the `formatBuildTime` helper directly after the last import line (before `interface DrillState`):

```tsx
function formatBuildTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}
```

Then inside the main `return (...)`, after the closing `</div>` of the `{deletingId && ...}` block and the `<AddTransactionDrawer .../>` — but still inside the outer `<div className="flex flex-col gap-4 p-3 sm:p-6">` — add the build info line:

```tsx
      <div
        data-testid="build-info"
        className="px-1 pb-2 text-xs text-slate-400 font-mono"
      >
        Build <code>{__APP_COMMIT__}</code> · {formatBuildTime(__APP_BUILD_TIME__)}
      </div>
```

The final return block should look like:

```tsx
  return (
    <div className="flex flex-col gap-4 p-3 sm:p-6">
      <HeroStatsRow ... />
      <div className="flex flex-col gap-4 md:flex-row">
        {/* ... existing widgets ... */}
      </div>
      {deletingId && (
        <DeleteConfirmDialog ... />
      )}
      <AddTransactionDrawer ... />
      <div
        data-testid="build-info"
        className="px-1 pb-2 text-xs text-slate-400 font-mono"
      >
        Build <code>{__APP_COMMIT__}</code> · {formatBuildTime(__APP_BUILD_TIME__)}
      </div>
    </div>
  );
```

- [ ] **Step 5.2: Verify the build still compiles**

```bash
npm run typecheck
```

Expected: no type errors

- [ ] **Step 5.3: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat: move build info line to dashboard bottom"
```

---

## Task 6: Clean up `Footer`

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/Footer.test.tsx`

- [ ] **Step 6.1: Write the updated failing tests**

Replace the full contents of `src/components/Footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} GlintBudget`))).toBeInTheDocument();
  });

  it('renders the Privacy Policy link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('is rendered as a contentinfo landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('does not render the iOS App Store link', () => {
    render(<Footer />);
    expect(screen.queryByText(/app store/i)).toBeNull();
    expect(screen.queryByText(/ios/i)).toBeNull();
  });

  it('does not render build info', () => {
    render(<Footer />);
    expect(screen.queryByTestId('build-info')).toBeNull();
  });
});
```

- [ ] **Step 6.2: Run tests to confirm failures**

```bash
npm run test -- --reporter=verbose src/components/Footer.test.tsx
```

Expected: "no iOS App Store" test FAIL, "no build info" test FAIL

- [ ] **Step 6.3: Rewrite `Footer`**

Replace the full contents of `src/components/Footer.tsx`:

```tsx
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-600 sm:flex-row">
        <p>© {year} GlintBudget</p>
        <nav aria-label="Legal" className="flex gap-6">
          <a href="#" className="hover:text-brand" aria-disabled="true">
            Privacy Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
```

- [ ] **Step 6.4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/components/Footer.test.tsx
```

Expected: all 5 tests PASS

- [ ] **Step 6.5: Commit**

```bash
git add src/components/Footer.tsx src/components/Footer.test.tsx
git commit -m "feat: remove iOS App Store link and build info from footer"
```

---

## Task 7: Make `SignIn` route redirect to `/`

**Files:**
- Modify: `src/routes/SignIn.tsx`
- Modify: `src/routes/SignIn.test.tsx`

- [ ] **Step 7.1: Write the updated failing test**

Replace the full contents of `src/routes/SignIn.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SignIn from './SignIn';

describe('SignIn route', () => {
  it('redirects to / immediately', () => {
    render(
      <MemoryRouter initialEntries={['/signin']}>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/" element={<span>home</span>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('home')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run the test to confirm it fails**

```bash
npm run test -- --reporter=verbose src/routes/SignIn.test.tsx
```

Expected: FAIL — the current `SignIn` renders the sign-in UI instead of redirecting

- [ ] **Step 7.3: Replace `SignIn` with a redirect**

Replace the full contents of `src/routes/SignIn.tsx`:

```tsx
import { Navigate } from 'react-router-dom';

export default function SignIn() {
  return <Navigate to="/" replace />;
}
```

- [ ] **Step 7.4: Run the test to verify it passes**

```bash
npm run test -- --reporter=verbose src/routes/SignIn.test.tsx
```

Expected: 1 test PASS

- [ ] **Step 7.5: Commit**

```bash
git add src/routes/SignIn.tsx src/routes/SignIn.test.tsx
git commit -m "feat: redirect /signin to / — sign-in now lives on the landing page"
```

---

## Task 8: Update `Landing` integration test

**Files:**
- Modify: `src/routes/Landing.test.tsx`

- [ ] **Step 8.1: Update `Landing.test.tsx`**

Replace the full contents of `src/routes/Landing.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import Landing from './Landing';

vi.mock('../firebase/client', () => ({ auth: { kind: 'mock-auth' } }));
vi.mock('../firebase/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

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

  it('renders an h1 heading', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the footer landmark', () => {
    renderLanding();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the sign-in card', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('contains no iOS references on the page', () => {
    renderLanding();
    expect(screen.queryByText(/iphone/i)).toBeNull();
    expect(screen.queryByText(/ios app/i)).toBeNull();
  });
});
```

- [ ] **Step 8.2: Run all landing-related tests**

```bash
npm run test -- --reporter=verbose src/routes/Landing.test.tsx
```

Expected: all 5 tests PASS

- [ ] **Step 8.3: Run the full test suite to confirm no regressions**

```bash
npm run test
```

Expected: all tests PASS

- [ ] **Step 8.4: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors

- [ ] **Step 8.5: Commit**

```bash
git add src/routes/Landing.test.tsx
git commit -m "test: update landing integration test for revamped page"
```

---

## Final Verification

- [ ] Run `npm run build` — confirm production build succeeds with no errors
- [ ] Run `npm run preview` and open `http://localhost:4173` — confirm the landing page shows the two-column hero, logo, standard Google button, updated feature strip, and clean footer
- [ ] Resize the browser to mobile width — confirm the hero stacks vertically (copy on top, sign-in card below)
- [ ] Navigate to `/signin` directly — confirm it redirects to `/`
