# Budget Planner Onboarding Screen — Design Spec

**Date:** 2026-06-12
**Status:** Approved — ready for implementation plan
**Platforms:** iOS (SwiftUI) + Web (React/TypeScript)
**Topic:** Add a "Budget Planner" screen to the onboarding flow on both platforms.

---

## 1. Goal

Add a sixth onboarding screen that showcases the budget planning feature — a key differentiator
alongside the existing Analytics screen. The screen shows per-category budget progress bars with
descriptive headline copy, giving new users a concrete preview of how spending limits work.

---

## 2. Placement in the flow

**Before:** Hook → Intelligence → Analytics → Superpowers → Launch (5 screens)
**After:**  Hook → Intelligence → Analytics → **Budget Planner** → Superpowers → Launch (6 screens)

Rationale: the Analytics screen shows where money went; Budget Planner immediately answers "what
can I do about it?" — a natural cause-and-effect narrative before the Superpowers benefits screen.

---

## 3. Content

### Headline
```
Plan your spend.
Own every dollar.
```

The first line is plain (`textPrimary` / `--login-fg`). The second line uses the brand gradient
text style (`accentGradient` on iOS; `.login-grad-text` class on web).

### Tagline (body copy)
```
Set category budgets and watch GlintBudget keep you on track — automatically.
```

Rendered in `textSecondary` / `--login-muted`.

### Eyebrow label
```
Budget Planner
```

iOS: uppercase caption in `AppTheme.Colors.textSecondary`.
Web: `.login-eyebrow` class (lime, uppercase, tracked).

---

## 4. Chart — Budget Progress Bars

A `GlassCard` (iOS) / `.login-glass` div (web) containing four horizontal progress bars.
Each bar has:

- **Label row**: emoji + category name (left), spent amount / budget limit (right)
- **Track**: background bar — `rgba(255,255,255,0.08)` on the dark onboarding surface
- **Fill**: coloured fill representing percentage spent, colour-coded by status (see §5)

### Demo data (static, onboarding only)

| Category   | Emoji | Spent | Budget | Status      |
|------------|-------|-------|--------|-------------|
| Groceries  | 🛒    | $350  | $500   | On track    |
| Bills      | 💡    | $180  | $250   | On track    |
| Dining     | 🍽    | $260  | $300   | Nearing     |
| Shopping   | 🛍    | $155  | $150   | Over budget |

Footer row: `Total: $945 / $1,200` (left) · `$255 remaining` in accent color (right).

The data is authored inline in each platform's file — not shared with real Firestore data.

---

## 5. Bar colour semantics

| Status | Threshold | iOS token | Web hex |
|--------|-----------|-----------|---------|
| On track | < 80% spent | `AppTheme.Colors.accentGradient` (Primary → Secondary) | `linear-gradient(90deg, #4caf50, #8bc34a)` (`--login-green` → `--login-lime`) |
| Nearing limit | 80–99% spent | `AppTheme.Colors.warning` (`.orange`) | `linear-gradient(90deg, #f97316, #fb923c)` |
| Over budget | ≥ 100% spent | `AppTheme.Colors.expense` (`.red`) | `--expense-gradient` (`#f87171 → #dc2626`) |

A colour legend with three swatches sits below the card on both platforms.

---

## 6. iOS implementation

### 6a. `OnboardingPage` enum — add new case

File: `GlintBudget/Core/Onboarding/Model/OnboardingPage.swift`

Add `.budgetPlanner` at index 3 (between `.analytics` and `.superpowers`). All existing
`rawValue` indices shift by one; `.launch` becomes index 5. The `ctaTitle` for `.budgetPlanner`
returns `"Continue"` (same as other middle screens).

### 6b. New view — `OnboardingBudgetPlannerView`

File: `GlintBudget/Core/Onboarding/View/Screens/OnboardingBudgetPlannerView.swift`

Matches the structure of `OnboardingAnalyticsView`:
- `isActive: Bool` + `parallax: CGFloat` parameters
- `@State private var appeared = false` for entrance animation
- Spring animation on `onChange(of: isActive)`
- `accessibilityElement(children: .combine)` with descriptive label
- `OnboardingLayout.bottomReserve` bottom padding

The bar rows animate their fill width from 0 to final value when `isActive` becomes true,
staggered by index (matches `OnboardingBarRow` animation pattern).

**No new shared component needed** — the bars are self-contained in this view using a private
`BarRow` sub-view, since the colour-coded status logic is specific to Budget Planner.

### 6c. `OnboardingFlowView` — wire up the new case

File: `GlintBudget/Core/Onboarding/View/OnboardingFlowView.swift`

Add a `case .budgetPlanner:` branch in `screen(for:)` that returns
`OnboardingBudgetPlannerView(isActive: isActive, parallax: parallax)`.

### 6d. Page indicator

`OnboardingPageIndicator` reads `pageCount` from `vm.pageCount`, which is derived from
`OnboardingPage.allCases.count`. Adding the new case automatically updates the indicator
to show 6 dots — no manual change needed.

---

## 7. Web implementation

### 7a. New slide entry in `slides.tsx`

File: `src/components/login/slides.tsx`

Insert a new `Slide` object at index 3 (after `analytics`, before `superpowers`):

```ts
{
  id: 'budget-planner',
  eyebrow: 'Budget Planner',
  render: () => <BudgetPlannerSlide />,
}
```

### 7b. New component — `BudgetPlannerSlide`

File: `src/components/login/BudgetPlannerSlide.tsx`

A self-contained component (no props) that renders:
- Headline using `login-h1` + `login-grad-text` classes
- Tagline using `login-lead` class
- A `login-glass` card containing the bar rows
- A colour legend below the card

Each bar row is a small layout: label row on top, track+fill below. Fill width is set via
inline `style={{ width: '<pct>%' }}`. No animation required on web (the existing slide
transition is sufficient).

Bar fill colours use inline hex values matching the theme tokens defined in `index.css`:
- On track: `linear-gradient(90deg, #4caf50, #8bc34a)` (login-green → login-lime)
- Nearing: `linear-gradient(90deg, #f97316, #fb923c)` (orange)
- Over: `linear-gradient(90deg, #f87171, #dc2626)` (expense-gradient)

Track background: `rgba(255,255,255,0.08)` (matches `--login-track` in dark mode).

### 7c. Page indicator dots

`OnboardingCarousel` renders a dot per slide from `SLIDES.length`. Adding the new slide
automatically adds a sixth dot — no manual change needed.

### 7d. Test — `BudgetPlannerSlide.test.tsx`

Co-located smoke test verifying:
- Headline text renders
- Tagline text renders
- All four category names appear
- The "remaining" footer text appears

---

## 8. What does NOT change

- Firestore schema, data models, or rules — this is purely static demo data.
- The authenticated `/app` shell — unchanged.
- iOS app behaviour beyond the onboarding flow.
- The existing five screen views — no content modifications.
- `OnboardingDemoData` — the new screen defines its own inline budget demo data, keeping
  concerns separate.

---

## 9. Out of scope

- Actual budget-setting functionality (that is a separate Stage 4+ feature).
- Animations beyond entrance fade/translate on iOS and the existing slide transition on web.
- Reducing the onboarding from 6 to 5 screens by removing an existing screen.
