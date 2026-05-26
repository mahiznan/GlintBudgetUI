# Landing Page Revamp — Design Spec

**Date:** 2026-05-27  
**Status:** Approved

## Goals

1. Reposition GlintBudget as a standalone web product — remove all iOS / "companion app" references.
2. Surface richer product copy that communicates value clearly.
3. Inline sign-in on the landing page — eliminate the separate `/signin` route.
4. Replace the custom amber "Continue with Google" button with the standard Google-branded button design.
5. Simplify the header — logo + wordmark only, no nav links, no sign-in button.

---

## Header

- **Left:** `glint.jpg` logo image (36×36 px, `rounded-lg`) + "GlintBudget" wordmark (bold, slate-900).
- **Right:** nothing — nav links ("Features", "About") and the "Sign in" CTA are removed entirely.
- When the user is authenticated, the header still shows the existing `UserMenu` (already in `AppShell`, not on the landing page — no change needed there).

---

## Hero Section — Two-Column Layout

On ≥ md screens: left column (copy) + right column (sign-in card), side by side.  
On < md screens: stacked — copy on top, sign-in card below.

### Left column — copy

**Headline:**
> Personal finance  
> **made effortless.**

"made effortless." is rendered in `text-brand` (lime green).

**Subtitle:**
> Add transactions in seconds. Watch your spending patterns emerge in real time. GlintBudget keeps it simple — no spreadsheets, no complexity, just clarity.

**Bullet list (4 items, brand-coloured ✓ checkmarks):**
- Add a transaction in under 5 seconds
- Spending patterns revealed automatically
- Works on desktop, tablet, and mobile
- Multi-currency support built in

### Right column — sign-in card

White card, border `border-slate-200`, `rounded-2xl`, `shadow-md`.

Contents (top to bottom):
1. `glint.jpg` logo — 52×52 px, `rounded-xl`, centred.
2. Heading: "Welcome to GlintBudget" (bold, slate-900).
3. Subtext: "Sign in to start tracking your finances" (sm, slate-600).
4. **Google sign-in button** (see below).
5. Fine print: "Free · No credit card required" (xs, slate-400).

**Standard Google button spec:**
- White background, `border border-[#dadce0]`, `rounded-md`, `shadow-sm`
- Left: Google "G" SVG logo (official 4-colour)
- Text: "Sign in with Google" — `text-[#3c4043]`, `font-medium`, Roboto/system-ui
- Hover: `bg-[#f8f9fa]` (very light grey)
- Disabled (busy): opacity-60, text "Signing in…"
- Full-width inside the card

Error state: red text below the button (unchanged from current `SignIn.tsx` logic).

---

## Feature Strip

Three cards, unchanged grid layout. Replace the "iOS, soon web" card:

| # | Emoji | Title | Description |
|---|-------|-------|-------------|
| 1 | 💱 | Multi-currency | Default currency with per-transaction overrides. Perfect for travel or international spending. |
| 2 | 📊 | Smart reports | Pie and bar charts filtered by category, vendor, and account. See where your money really goes. |
| 3 | 📱 | Mobile-friendly | Fully responsive — looks great and works perfectly on your phone, tablet, or desktop. |

Section label above the grid: "Everything you need to manage your money" (uppercase, slate-400, tracking-wide).

---

## Footer

Remove the "iOS App Store" link. Keep:
- © year GlintBudget
- Privacy Policy link
- Build info line (commit + timestamp)

---

## Routing & Auth Logic Changes

- The `/signin` route in `App.tsx` is **kept** (direct URL access should still work gracefully — redirect to `/` or show the inline form). Simplest approach: keep the route but have `SignIn.tsx` render a redirect to `/` since sign-in now lives there.
- `Header.tsx`: remove `AuthCta` component (the "Sign in" / "Open dashboard" link). The header becomes a pure branding bar on the landing page.
- The sign-in logic (Google OAuth, error handling, busy state) moves into the hero's right column. Extract it into a `SignInCard` component (`src/components/SignInCard.tsx`) so it can be tested in isolation.
- When the user is already authenticated, the sign-in card is replaced with an "Open dashboard →" link card (same card shell, different content).

---

## Component Changes Summary

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Remove `AuthCta` and the `<nav>` entirely; left-align logo + wordmark only |
| `src/components/Hero.tsx` | Full rewrite — two-column layout, new copy, embeds `<SignInCard />` |
| `src/components/SignInCard.tsx` | **New** — extracted sign-in logic from `SignIn.tsx`; standard Google button |
| `src/components/FeatureStrip.tsx` | Replace third feature card copy; add section label |
| `src/components/Footer.tsx` | Remove "iOS App Store" link |
| `src/routes/SignIn.tsx` | Redirect to `/` (sign-in now inline on landing) |
| `public/glint.jpg` | Already present — used as logo image in header and sign-in card |

---

## Tests

- `Header.test.tsx` — assert no nav links, no sign-in button rendered.
- `Hero.test.tsx` — assert headline text, bullet list items, `SignInCard` is rendered.
- `SignInCard.test.tsx` — assert Google button present; simulates click → calls `signInWithGoogle`; shows error on failure; shows "Open dashboard" link when authenticated.
- `FeatureStrip.test.tsx` — assert "Mobile-friendly" card present, no "iOS" text.

---

## Out of Scope

- Theme switcher, preferences, currency settings — Stage 4.
- Adding `<SignInCard />` to any page other than `Landing`.
- Changing Firestore rules or data models.
