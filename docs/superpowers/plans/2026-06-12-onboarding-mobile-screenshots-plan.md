# Onboarding Mobile Screenshots + App Store Slide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real iOS app screenshots (tilted phone frames) to the first four onboarding carousel slides, and insert a new dedicated App Store slide showing light + dark theme phones with a download badge.

**Architecture:** A reusable `PhoneFrame` component handles the phone frame visual. The `Slide` interface gains an optional `screenshot` field; `OnboardingCarousel` reads it and renders `PhoneFrame` at the carousel level (slides stay pure content). A new `AppStoreSlide` component renders the three-phone App Store promotion.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS v4, Vitest + React Testing Library

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `public/onboarding/dashboard-light.png` | Create | Dashboard screenshot, light theme |
| `public/onboarding/dashboard-dark.png` | Create | Dashboard screenshot, dark theme |
| `public/onboarding/search-light.png` | Create | Search/transactions screenshot, light |
| `public/onboarding/report-light.png` | Create | Category report screenshot, light |
| `public/onboarding/add-light.png` | Create | Add-transaction screenshot, light |
| `src/components/login/PhoneFrame.tsx` | Create | Phone bezel + screenshot wrapper |
| `src/components/login/PhoneFrame.test.tsx` | Create | Smoke tests for PhoneFrame |
| `src/components/login/AppStoreSlide.tsx` | Create | Three-phone layout + App Store badge |
| `src/components/login/AppStoreSlide.test.tsx` | Create | Smoke tests for AppStoreSlide |
| `src/components/login/slides.tsx` | Modify | Add `screenshot` field to `Slide`; populate slides 1–4; add `app-store` entry |
| `src/components/login/OnboardingCarousel.tsx` | Modify | Render `PhoneFrame` when `slide.screenshot` present; apply flex-row inner layout |
| `src/components/login/OnboardingCarousel.test.tsx` | Modify | Add app-store slide test; keep existing tests green |
| `src/styles/index.css` | Modify | Add `.login-slide-inner--with-phone` flex-row layout + responsive hide rule |

---

## Task 1: Copy screenshots to public/onboarding/

**Files:**
- Create: `public/onboarding/` (5 PNG files)

- [ ] **Step 1: Copy the source files**

```bash
mkdir -p public/onboarding
cp /Users/rajeshkumar/Downloads/glint-budget/dashboard-light.PNG public/onboarding/dashboard-light.png
cp /Users/rajeshkumar/Downloads/glint-budget/dashboard-dark.PNG  public/onboarding/dashboard-dark.png
cp /Users/rajeshkumar/Downloads/glint-budget/search-light.PNG    public/onboarding/search-light.png
cp /Users/rajeshkumar/Downloads/glint-budget/report-light.PNG    public/onboarding/report-light.png
cp /Users/rajeshkumar/Downloads/glint-budget/add-light.PNG       public/onboarding/add-light.png
```

- [ ] **Step 2: Verify files exist**

```bash
ls -lh public/onboarding/
```

Expected: 5 `.png` files, each several hundred KB.

- [ ] **Step 3: Commit**

```bash
git add public/onboarding/
git commit -m "chore: add iOS app screenshots for onboarding carousel"
```

---

## Task 2: PhoneFrame component (TDD)

**Files:**
- Create: `src/components/login/PhoneFrame.tsx`
- Create: `src/components/login/PhoneFrame.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/login/PhoneFrame.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PhoneFrame from './PhoneFrame';

describe('PhoneFrame', () => {
  it('renders image with correct src and alt', () => {
    const { getByAltText } = render(
      <PhoneFrame src="/onboarding/dashboard-light.png" alt="Dashboard" />,
    );
    const img = getByAltText('Dashboard') as HTMLImageElement;
    expect(img.src).toContain('/onboarding/dashboard-light.png');
  });

  it('applies tilt and yOffset as inline transform', () => {
    const { container } = render(
      <PhoneFrame
        src="/onboarding/dashboard-light.png"
        alt="Dashboard"
        tilt={8}
        yOffset={6}
      />,
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.style.transform).toBe('rotate(8deg) translateY(6px)');
  });

  it('applies no transform when tilt and yOffset are omitted', () => {
    const { container } = render(
      <PhoneFrame src="/onboarding/dashboard-light.png" alt="Dashboard" />,
    );
    const frame = container.firstChild as HTMLElement;
    expect(frame.style.transform).toBe('');
  });

  it('forwards className to the frame div', () => {
    const { container } = render(
      <PhoneFrame
        src="/onboarding/dashboard-light.png"
        alt="Dashboard"
        className="custom-class"
      />,
    );
    expect((container.firstChild as HTMLElement).classList).toContain('custom-class');
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm test -- PhoneFrame
```

Expected: FAIL — `PhoneFrame` not found.

- [ ] **Step 3: Implement PhoneFrame**

Create `src/components/login/PhoneFrame.tsx`:

```tsx
interface PhoneFrameProps {
  src: string;
  alt: string;
  width?: number;
  tilt?: number;
  yOffset?: number;
  className?: string;
}

export default function PhoneFrame({
  src,
  alt,
  width = 90,
  tilt,
  yOffset,
  className = '',
}: PhoneFrameProps) {
  const hasTilt = tilt !== undefined && tilt !== 0;
  const hasOffset = yOffset !== undefined && yOffset !== 0;
  const transform =
    hasTilt || hasOffset
      ? [hasTilt ? `rotate(${tilt}deg)` : '', hasOffset ? `translateY(${yOffset}px)` : '']
          .filter(Boolean)
          .join(' ')
      : '';

  return (
    <div
      className={`login-phone-frame ${className}`.trim()}
      style={{ width: `${width}px`, transform }}
    >
      <img src={src} alt={alt} className="login-phone-img" />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- PhoneFrame
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/PhoneFrame.tsx src/components/login/PhoneFrame.test.tsx
git commit -m "feat: add PhoneFrame component for onboarding screenshots"
```

---

## Task 3: PhoneFrame CSS

**Files:**
- Modify: `src/styles/index.css`

- [ ] **Step 1: Add phone frame styles after `.login-glass` block**

Open `src/styles/index.css`. Find the line `.login-glass {` (around line 338). Add the following block immediately after the closing `}` of the `.login-glass` ruleset:

```css
/* Phone frame used in onboarding slides */
.login-phone-frame {
  flex-shrink: 0;
  border-radius: 18px;
  border: 3px solid rgba(0, 0, 0, 0.55);
  overflow: hidden;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.25);
}
.login-phone-img {
  width: 100%;
  display: block;
}

/* Slide inner: row layout when a phone frame is present */
.login-slide-inner--with-phone {
  display: flex;
  align-items: center;
  gap: 28px;
  text-align: left;
}
.login-slide-inner--with-phone .login-phone-frame {
  flex-shrink: 0;
}
/* Hide phone on narrow viewports */
@media (max-width: 639px) {
  .login-slide-inner--with-phone .login-phone-frame {
    display: none;
  }
  .login-slide-inner--with-phone {
    text-align: center;
  }
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/index.css
git commit -m "feat: add phone frame and with-phone slide layout CSS"
```

---

## Task 4: AppStoreSlide component (TDD)

**Files:**
- Create: `src/components/login/AppStoreSlide.tsx`
- Create: `src/components/login/AppStoreSlide.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/login/AppStoreSlide.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppStoreSlide from './AppStoreSlide';

describe('AppStoreSlide', () => {
  it('renders all three phone screenshots', () => {
    render(<AppStoreSlide />);
    expect(screen.getByAltText('GlintBudget light theme – dashboard')).toBeInTheDocument();
    expect(screen.getByAltText('GlintBudget – category report')).toBeInTheDocument();
    expect(screen.getByAltText('GlintBudget dark theme – dashboard')).toBeInTheDocument();
  });

  it('renders App Store download link', () => {
    render(<AppStoreSlide />);
    const link = screen.getByRole('link', { name: /download on the app store/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href');
  });

  it('App Store link opens in a new tab', () => {
    render(<AppStoreSlide />);
    const link = screen.getByRole('link', { name: /download on the app store/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm test -- AppStoreSlide
```

Expected: FAIL — `AppStoreSlide` not found.

- [ ] **Step 3: Implement AppStoreSlide**

Create `src/components/login/AppStoreSlide.tsx`:

```tsx
import PhoneFrame from './PhoneFrame';

const APPSTORE_URL = 'https://apps.apple.com/app/glintbudget/id6742884309';

const AppleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

export default function AppStoreSlide() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div>
        <div className="login-eyebrow">Also on iPhone</div>
        <h1 className="login-h1">
          GlintBudget <span className="login-grad-text">for iPhone</span>
        </h1>
        <p className="login-lead mx-auto">Free on the App Store — same data, native experience.</p>
      </div>

      <div className="flex items-end justify-center gap-2 mt-2">
        <PhoneFrame
          src="/onboarding/dashboard-light.png"
          alt="GlintBudget light theme – dashboard"
          width={72}
          tilt={-8}
          yOffset={10}
        />
        <PhoneFrame
          src="/onboarding/report-light.png"
          alt="GlintBudget – category report"
          width={86}
        />
        <PhoneFrame
          src="/onboarding/dashboard-dark.png"
          alt="GlintBudget dark theme – dashboard"
          width={72}
          tilt={8}
          yOffset={10}
        />
      </div>

      <a
        href={APPSTORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800 transition-colors"
        aria-label="Download on the App Store"
      >
        <AppleIcon />
        Download on the App Store
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- AppStoreSlide
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/AppStoreSlide.tsx src/components/login/AppStoreSlide.test.tsx
git commit -m "feat: add AppStoreSlide component with three-phone layout"
```

---

## Task 5: Update Slide interface and slides.tsx

**Files:**
- Modify: `src/components/login/slides.tsx`

- [ ] **Step 1: Add `screenshot` field to the `Slide` interface**

Open `src/components/login/slides.tsx`. Replace the `Slide` interface:

```tsx
export interface Slide {
  id: string;
  eyebrow?: string;
  screenshot?: { src: string; alt: string; tilt?: number; yOffset?: number };
  render: () => ReactNode;
}
```

- [ ] **Step 2: Add the `AppStoreSlide` import**

At the top of `slides.tsx`, add the import alongside the existing ones:

```tsx
import AppStoreSlide from './AppStoreSlide';
```

- [ ] **Step 3: Add `screenshot` metadata to slides 1–4**

Update the four existing slide entries in the `SLIDES` array. Replace just the slide object definitions (keep their `render` functions untouched):

Slide 1 (`id: 'hook'`) — add:
```tsx
screenshot: { src: '/onboarding/dashboard-light.png', alt: 'GlintBudget dashboard', tilt: 8, yOffset: 6 },
```

Slide 2 (`id: 'intelligence'`) — add:
```tsx
screenshot: { src: '/onboarding/search-light.png', alt: 'GlintBudget search', tilt: -8, yOffset: 6 },
```

Slide 3 (`id: 'analytics'`) — add:
```tsx
screenshot: { src: '/onboarding/report-light.png', alt: 'GlintBudget category report', tilt: 8, yOffset: 6 },
```

Slide 4 (`id: 'budget-planner'`) — add:
```tsx
screenshot: { src: '/onboarding/add-light.png', alt: 'GlintBudget add transaction', tilt: -8, yOffset: 6 },
```

- [ ] **Step 4: Insert the app-store slide (before the launch slide)**

In the `SLIDES` array, insert this entry between the `superpowers` entry and the `launch` entry:

```tsx
{
  id: 'app-store',
  render: () => <AppStoreSlide />,
},
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/login/slides.tsx
git commit -m "feat: add screenshot metadata to onboarding slides and insert app-store slide"
```

---

## Task 6: Update OnboardingCarousel to render PhoneFrame

**Files:**
- Modify: `src/components/login/OnboardingCarousel.tsx`

- [ ] **Step 1: Add PhoneFrame import**

Open `src/components/login/OnboardingCarousel.tsx`. Add the import:

```tsx
import PhoneFrame from './PhoneFrame';
```

- [ ] **Step 2: Replace the slide inner render**

In `OnboardingCarousel.tsx`, find the `login-slide-inner` div inside the `SLIDES.map(...)`. Replace this:

```tsx
<div className="login-slide-inner">
  {slide.eyebrow && <div className="login-eyebrow">{slide.eyebrow}</div>}
  {slide.render()}
</div>
```

with:

```tsx
<div
  className={`login-slide-inner${slide.screenshot ? ' login-slide-inner--with-phone' : ''}`}
>
  <div className="min-w-0 flex-1">
    {slide.eyebrow && <div className="login-eyebrow">{slide.eyebrow}</div>}
    {slide.render()}
  </div>
  {slide.screenshot && (
    <PhoneFrame
      src={slide.screenshot.src}
      alt={slide.screenshot.alt}
      width={110}
      tilt={slide.screenshot.tilt}
      yOffset={slide.screenshot.yOffset}
    />
  )}
</div>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: all existing tests pass. The new component tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/OnboardingCarousel.tsx
git commit -m "feat: render PhoneFrame on slides that have screenshot metadata"
```

---

## Task 7: Update carousel tests

**Files:**
- Modify: `src/components/login/OnboardingCarousel.test.tsx`

- [ ] **Step 1: Add a test for the app-store slide**

Open `src/components/login/OnboardingCarousel.test.tsx`. Add this test inside the `describe` block:

```tsx
it('navigates to the app-store slide via its dot', () => {
  render(<OnboardingCarousel />);
  // app-store is slide 6 (index 5) — 7 slides total after insertion
  fireEvent.click(screen.getByRole('button', { name: /go to slide 6/i }));
  expect(activeSlide().textContent).toContain('App Store');
});
```

- [ ] **Step 2: Run only the carousel tests**

```bash
npm test -- OnboardingCarousel
```

Expected: all 5 tests pass (4 original + 1 new).

- [ ] **Step 3: Commit**

```bash
git add src/components/login/OnboardingCarousel.test.tsx
git commit -m "test: add app-store slide navigation test to OnboardingCarousel"
```

---

## Task 8: Visual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open http://localhost:5173 in a browser (you will see the login screen directly since you are not authenticated).

- [ ] **Step 2: Verify each slide**

Check the following:

| Slide | Expected |
|-------|----------|
| 1 — Hook | Tilted dashboard phone visible on right, leans right (+8°) |
| 2 — Intelligence | Tilted search phone on right, leans left (−8°) |
| 3 — Analytics | Tilted report phone on right, leans right (+8°) |
| 4 — Budget Planner | Tilted add-transaction phone on right, leans left (−8°) |
| 5 — Superpowers | Unchanged 2×2 grid, no phone |
| 6 — App Store | Three phones (light-center-dark), App Store badge link |
| 7 — Launch | Unchanged sign-in CTA |

- [ ] **Step 3: Verify responsive hide**

Resize browser below 640 px width. Phones on slides 1–4 should disappear; text fills full width. App Store slide should show single center phone only.

- [ ] **Step 4: Verify App Store link**

Click the App Store badge on slide 6. Confirm it opens the App Store URL in a new tab.

- [ ] **Step 5: Run full suite one final time**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all pass.

- [ ] **Step 6: Final commit if any tweaks were made during visual check**

```bash
git add -p
git commit -m "fix: visual adjustments after onboarding screenshot review"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|-----------------|-----------|
| Screenshots in `public/onboarding/` | Task 1 |
| `PhoneFrame` component with props | Task 2 |
| Phone frame CSS + with-phone layout + responsive hide | Task 3 |
| `AppStoreSlide` with three phones (option 2) | Task 4 |
| `Slide.screenshot` field on interface | Task 5 |
| Slides 1–4 screenshot mapping + tilt | Task 5 |
| `app-store` slide inserted before `launch` | Task 5 |
| Carousel renders `PhoneFrame` from metadata | Task 6 |
| `OnboardingCarousel.test.tsx` app-store test | Task 7 |
| `PhoneFrame.test.tsx` + `AppStoreSlide.test.tsx` | Tasks 2, 4 |
| Responsive: phone hidden < 640 px | Task 3 |
| App Store badge links out correctly | Tasks 4, 8 |
