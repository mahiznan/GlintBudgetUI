# Onboarding Carousel — Mobile Screenshots + App Store Slide

**Date:** 2026-06-12
**Status:** Approved

## Overview

Enhance the existing 6-slide onboarding carousel on the `LoginScreen` with real iOS app screenshots and a new dedicated App Store slide. Screenshots are sourced from `/public/onboarding/` (copied from the iOS app). The goal is to ground the web onboarding in the real product rather than abstract illustrations.

## What Changes

### Slides 1–4: Add tilted phone mockup

Each of the first four content slides gains a tilted phone screenshot on the right side. The existing text content (headline, lead, illustration/chips/charts) is preserved; the phone sits flush at the right edge, partially clipped by the slide's overflow boundary for depth.

Tilt alternates per slide to create visual rhythm:
- Odd slides (1, 3): `rotate(8deg) translateY(6px)` — leans right
- Even slides (2, 4): `rotate(-8deg) translateY(6px)` — leans left

**Screenshot mapping:**

| Slide | Topic | Screenshot |
|-------|-------|------------|
| 1 — Hook | "See your money in a new light" | `dashboard-light.png` |
| 2 — Intelligence | "Smart by default" | `search-light.png` |
| 3 — Analytics | "Your spending, beautifully clear" | `report-light.png` |
| 4 — Budget Planner | "Stay on budget" | `add-light.png` |

Always uses the light-theme screenshot regardless of the web app's current theme. Dark screenshots are reserved for the App Store slide only.

### Slide 5: Superpowers — unchanged

The 2×2 benefits grid is full-width and does not receive a screenshot. No change to this slide.

### Slide 6: New "App Store" slide

A new slide inserted between the Superpowers slide and the Launch slide.

**Content:**
- Headline: "GlintBudget for iPhone"
- Sub-label: "Also available free on the App Store"
- Three-phone layout (Option 2 — center raised):
  - Left phone: `dashboard-light.png`, `rotate(-8deg) translateY(10px)`, width 68 px, slightly faded border
  - Center phone: `report-light.png`, upright, width 80 px, raised (no Y translate), z-index above siblings
  - Right phone: `dashboard-dark.png`, `rotate(8deg) translateY(10px)`, width 68 px
- Official App Store badge below the phones (SVG Apple logo + "Download on the App Store" text), linking to the iOS app's App Store URL (placeholder until URL is confirmed)

### Slide 7: Launch — unchanged

The final sign-in CTA slide is unchanged.

## Assets

All screenshots are stored in `public/onboarding/` (committed to the repo, served as static assets):

```
public/onboarding/
  dashboard-light.png
  dashboard-dark.png
  search-light.png
  report-light.png
  add-light.png
```

Original source files are at `/Users/rajeshkumar/Downloads/glint-budget/`. Copy them to `public/onboarding/` as lowercase `.png` during implementation.

## Phone Frame Component

A new `PhoneFrame` component wraps each screenshot:

```
src/components/login/PhoneFrame.tsx
```

Props:
- `src: string` — image path
- `alt: string`
- `width?: number` — defaults to 90 px
- `tilt?: number` — rotation degrees, positive = right, negative = left; defaults to 0
- `yOffset?: number` — translateY in px, defaults to 0
- `className?: string`

Renders a `<div>` with border-radius, dark border, overflow hidden, and drop shadow. The `<img>` fills the frame. The tilt and yOffset are applied via inline `transform` style.

## Layout Change on Content Slides

The `Slide` interface in `slides.tsx` gains an optional `screenshot` field:

```ts
export interface Slide {
  id: string;
  eyebrow?: string;
  screenshot?: { src: string; tilt: number; alt: string };
  render: () => ReactNode;
}
```

`OnboardingCarousel` renders the `PhoneFrame` at the carousel level — slides 1–4 set `screenshot`, and the carousel wraps `slide.render()` + `PhoneFrame` in a flex row. Slide render functions stay pure content (no PhoneFrame import in slides.tsx).

Layout when `screenshot` is present:
- `login-slide-inner` switches to flex row
- Left: existing slide content, `flex: 1`
- Right: `PhoneFrame`, flush at the trailing edge, clipped by `overflow: hidden` on the slide boundary — the bottom portion extends below for a floating effect

On narrow viewports (< 640 px) the `PhoneFrame` is hidden so text occupies full width.

## App Store Slide Component

A new slide component:

```
src/components/login/AppStoreSlide.tsx
```

Renders the three-phone layout and the App Store badge. The badge is an `<a>` tag linking to the App Store URL. The Apple logo SVG is inlined (no external dependency). Uses the same `login-glass` / `login-eyebrow` CSS tokens as other slides.

## Slide Registration

`src/components/login/slides.tsx` — add the `app-store` slide entry (id: `'app-store'`) between `superpowers` and `launch`, calling `() => <AppStoreSlide />`.

## Responsive Behaviour

- **≥ 640 px (sm):** Phone visible on slides 1–4, full three-phone layout on App Store slide.
- **< 640 px:** Phone hidden on slides 1–4 (text occupies full width). App Store slide collapses to a single center phone + badge.

## Tests

- `PhoneFrame.test.tsx`: renders image with correct src/alt; applies tilt transform.
- `AppStoreSlide.test.tsx`: renders three images; renders App Store link with correct href.
- `OnboardingCarousel.test.tsx`: existing tests remain green; add a test that slide 6 contains "App Store".

## Out of Scope

- Fetching/displaying the App Store rating or download count.
- Animating the phone screenshots independently of the carousel advance.
- Showing dark-theme screenshots on content slides based on web app theme.
