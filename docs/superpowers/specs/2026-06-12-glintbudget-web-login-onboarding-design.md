# GlintBudget Web — Onboarding-Style Login Screen (Design)

**Date:** 2026-06-12
**Status:** Approved — ready for implementation plan
**Topic:** Bring the iOS onboarding content and look-and-feel into the web login screen.

## 1. Goal

Replace the current marketing landing page (`Header` + `Hero` + `FeatureStrip` + `Footer`)
with a full-viewport login experience that carries the iOS app's onboarding content and
visual identity to the web. The screen is the unauthenticated entry point at `/`; once the
user signs in they are redirected to `/app` exactly as today.

This is the **login screen only**. The authenticated `/app` shell keeps its current light
theme and amber brand. Nothing in `/app` changes.

## 2. What "look and feel" means here

The iOS onboarding lives at `GlintBudget/Core/Onboarding/`. We are porting its *content and
palette*, not its exact mobile layout — the web is free to use a desktop-first design.

- **Palette (app-true, green/teal — NOT the web amber brand):**
  - `--login-green` `#4CAF50` (iOS `Primary`)
  - `--login-lime` `#8BC34A` (iOS `Secondary`)
  - `--login-teal` `#4ECDC4` (iOS income/teal accent)
  - `--login-ink` `#0B0F0D` (deep-ink dark background)
  - text `#f8fafc`, muted `#94a3b8`
  - Accent gradient = green → lime (top-left → bottom-right).
- **Surfaces:** frosted "glass" cards — `rgba(255,255,255,.07)` fill, `rgba(255,255,255,.15)`
  hairline border, `backdrop-filter: blur`, soft shadow. Mirrors the iOS `GlassCard`.
- **Background:** deep-ink base with 3 large blurred drifting "orbs" (green, lime, teal),
  mirroring `OnboardingGradientBackground`. CSS-only, slow drift, paused under reduced motion.
- **Type:** large, rounded, bold headlines (`ui-rounded`/system rounded stack).

### Palette decision (explicit)

The web brand is **already green** — `src/styles/index.css` sets `--color-brand: rgb(150, 191, 13)`
(lime) with accent `#22c55e` (the default "Lime" theme, plus switchable forest/ocean/amber themes).
So the app-true green/lime/teal login accent is on-brand and matches both the iOS app and the web's
default theme.

What *is* login-only is the **dark deep-ink theme** (`#0B0F0D` background, light text). The rest of
the site/`/app` is light. To avoid leaking the dark theme, login colors live in **login-scoped CSS**
(a clearly-commented block in `src/styles/index.css` using `--login-*` variables and `.login-*`
classes) plus Tailwind utilities on the login subtree. **Do not change the global `@theme` tokens or
the existing light `.glass` utility** — add new `.login-glass` rather than overloading `.glass`.

Headlines use the existing app font **Figtree** (`--font-sans`) in heavy weights for the bold,
friendly feel — no new font is added.

## 3. Layout

Full-viewport split, no traditional header/footer:

- **Left 75% — onboarding carousel.** Auto-advancing slideshow, one slide per iOS onboarding
  screen. Brand lockup (glint logo + "GlintBudget") pinned top-left; page-indicator dots
  pinned bottom-left. Auto-advance every **4.2s**; pauses on pointer hover and under reduced
  motion. Dots are clickable to jump; clicking resets the timer.
- **Right 25% — persistent login panel.** Subtly frosted column with a hairline left divider,
  vertically centered: glint logo, "Welcome to GlintBudget", "Sign in to start tracking your
  finances", the **Sign in with Google** button, and "Free · No credit card required". Visible
  on every slide so sign-in is always one click away.

### Slides (content ported from iOS onboarding)

Sample figures are static demo data (mirroring `OnboardingDemoData`); no Firestore reads.

1. **Hook** — eyebrow "Welcome"; "See your money in a new light."; "GlintBudget turns everyday
   spending into clarity you can feel."; floating glass chips: ☕ Coffee −$4.20, 🚇 Metro −$2.75,
   💰 Salary +$3,200.
2. **Intelligence** — "Smart by default."; "Auto-categorized transactions and insights you
   actually understand."; glass cards: 🍴 Dining ↑ 12% this week, "You saved this month $2,300";
   category pills: Groceries, Transport, Bills.
3. **Analytics** — "Your spending, beautifully clear."; "Live reports that make every dollar
   visible."; a **CSS** donut (conic-gradient, not Recharts) with center total **$1,250**, plus
   five category bars (Groceries $420, Dining $260, Bills $240, Transport $180, Shopping $150).
4. **Superpowers** — "Your money superpowers."; four benefit glass cards: 🔍 See where money
   disappears · ✅ Feel in control every day · 📈 Build wealth — no spreadsheets · 📸 Snap a
   receipt, done.
5. **Launch** — ✨; "Ready when you are."; "Your financial universe is one click away — sign in
   to begin." (no duplicate CTA — the right panel owns sign-in).

## 4. Component structure

New components under `src/components/login/`, each with a co-located `.test.tsx`:

- **`LoginScreen.tsx`** — route-level shell. Renders `OrbBackground`, the left `OnboardingCarousel`,
  and the right `LoginPanel` in the 75/25 split. Becomes what `routes/Landing.tsx` renders.
- **`OrbBackground.tsx`** — the three drifting blurred orbs; respects `prefers-reduced-motion`.
- **`OnboardingCarousel.tsx`** — owns slide index + auto-advance timer (hover-pause,
  reduced-motion-pause), renders the active slide and the dot indicator. Slide content is
  data-driven from a `slides.tsx` module so each slide stays small and independently editable.
- **`slides.tsx`** — the five slide definitions (eyebrow, heading, body, and a render fn for the
  slide's visual: chips / cards / donut / benefit grid).
- **Shared primitives** — `GlassCard.tsx`, `TransactionChip.tsx`, `CategoryDonut.tsx` (CSS
  conic-gradient), `CategoryBars.tsx`. Small, single-purpose, testable.
- **`LoginPanel.tsx`** — the right column. **Reuses the existing Google sign-in logic** currently
  in `SignInCard.tsx` (`signInWithGoogle`, popup error mapping, `auth.status === 'authenticated'`
  → `navigate('/app')`). That logic is extracted into a `useGoogleSignIn` hook (or moved into
  `LoginPanel`) so we keep one source of truth and don't fork the auth flow.

**Removed / repurposed:** `Hero.tsx`, `FeatureStrip.tsx`, `Header.tsx`, `Footer.tsx`, and
`SignInCard.tsx` (and their tests) are superseded by the login screen. The reusable Google
sign-in logic is preserved via the extracted hook before deleting `SignInCard`. `routes/SignIn.tsx`
still redirects to `/` (unchanged).

## 5. Responsive behavior

- **≥ 768px:** the 75/25 split as designed. Right panel `min-width: 320px`.
- **< 768px:** stack to a single column — the login panel (logo, welcome, Google button) on top
  and above the fold, the carousel beneath it. The fixed 25% side column is not used at phone
  widths; the carousel keeps its dots and auto-advance but spans full width below the panel.

## 6. Accessibility

- `prefers-reduced-motion: reduce` → no orb drift, no auto-advance (slides still reachable via
  dots), no slide transition motion.
- Carousel region labeled; dots are real `<button>`s with accessible names ("Go to slide N");
  active dot exposes `aria-current`.
- Sign-in button keeps its existing busy/disabled and `role="alert"` error states.
- Decorative emoji/orbs marked `aria-hidden`.

## 7. Performance

This screen is the `/` route and is bound by the **< 50 KB gzipped / Lighthouse ≥ 95** budget
(CLAUDE.md). Protections:

- **No Recharts on this screen** — the donut is a CSS `conic-gradient`, bars are flexbox; charts
  stay in `/app`.
- Visuals are CSS (orbs = blurred radial gradients, glass = `backdrop-filter`); carousel logic is
  a few lines of state + a timer.
- No new dependencies. Build target stays `es2022`.
- Logo reuses the existing `public/glint.svg` (hashed-asset caching unchanged).

## 8. Testing

Per repo convention, every component ships with a co-located smoke test:

- `LoginScreen` renders the brand, the persistent Google button, and the first slide.
- `OnboardingCarousel` advances on a fake timer; pauses under mocked reduced-motion; dots jump and
  reset the timer.
- `LoginPanel` / `useGoogleSignIn` — clicking calls `signInWithGoogle`; popup-closed is silent;
  other errors show the alert; authenticated status redirects to `/app`. (Ports existing
  `SignInCard` test coverage.)
- `CategoryDonut` / `CategoryBars` render from sample data without error.

## 9. Out of scope

- No change to `/app`, Firestore, auth provider config, or the amber brand token.
- No new charting library; no PWA/offline work.
- Copy and demo figures are static; not wired to live data.

## 10. Reference

- iOS source: `GlintBudget/Core/Onboarding/` (`OnboardingFlowView`, `OnboardingHookView`,
  `OnboardingIntelligenceView`, `OnboardingAnalyticsView`, `OnboardingSuperpowersView`,
  `OnboardingLaunchView`, `OnboardingGradientBackground`, `GlassCard`), palette in
  `Assets.xcassets/ThemeColors/{Primary,Secondary}.colorset`.
- Approved mockup: `.superpowers/brainstorm/.../split.html`.
