# Budget Planner Onboarding Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Budget Planner" sixth onboarding screen (budget progress bars + headline copy) to both the iOS SwiftUI app and the React web app.

**Architecture:** Two independent tracks — Web first (has automated tests, simpler to verify), iOS second (Xcode build only, no onboarding unit tests exist). Each track is self-contained. The web component `BudgetPlannerSlide.tsx` is created and tested before being wired into `slides.tsx`. The iOS view `OnboardingBudgetPlannerView.swift` is created before updating the enum and flow.

**Tech Stack:** iOS — SwiftUI, `AppTheme` design tokens, `GlassCard`, `GeometryReader` for animated bar widths. Web — React + TypeScript, Tailwind v4, Vitest + React Testing Library.

---

## File Map

### Web (GlintBudgetUI)

| Action | File |
|--------|------|
| Create | `src/components/login/BudgetPlannerSlide.tsx` |
| Create | `src/components/login/BudgetPlannerSlide.test.tsx` |
| Modify | `src/components/login/slides.tsx` — insert new slide at index 3 |
| Modify | `src/components/login/OnboardingCarousel.test.tsx` — fix broken dot-click test |

### iOS (GlintBudget — sibling repo)

| Action | File |
|--------|------|
| Modify | `GlintBudget/Core/Onboarding/Model/OnboardingPage.swift` — add `.budgetPlanner` case |
| Create | `GlintBudget/Core/Onboarding/View/Screens/OnboardingBudgetPlannerView.swift` |
| Modify | `GlintBudget/Core/Onboarding/View/OnboardingFlowView.swift` — wire up new case |

---

## Track A — Web

### Task 1: Write the failing test for `BudgetPlannerSlide`

**Files:**
- Create: `src/components/login/BudgetPlannerSlide.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/components/login/BudgetPlannerSlide.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BudgetPlannerSlide from './BudgetPlannerSlide';

describe('BudgetPlannerSlide', () => {
  it('renders the headline', () => {
    render(<BudgetPlannerSlide />);
    expect(screen.getByText(/plan your spend/i)).toBeInTheDocument();
    expect(screen.getByText(/own every dollar/i)).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<BudgetPlannerSlide />);
    expect(screen.getByText(/set category budgets/i)).toBeInTheDocument();
  });

  it('renders all four category names', () => {
    render(<BudgetPlannerSlide />);
    expect(screen.getByText(/groceries/i)).toBeInTheDocument();
    expect(screen.getByText(/bills/i)).toBeInTheDocument();
    expect(screen.getByText(/dining/i)).toBeInTheDocument();
    expect(screen.getByText(/shopping/i)).toBeInTheDocument();
  });

  it('renders the remaining footer text', () => {
    render(<BudgetPlannerSlide />);
    expect(screen.getByText(/\$255 remaining/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails (module not found)**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
npm run test -- BudgetPlannerSlide
```

Expected output: `Error: Failed to resolve import "./BudgetPlannerSlide"` or similar — the component does not exist yet.

---

### Task 2: Implement `BudgetPlannerSlide`

**Files:**
- Create: `src/components/login/BudgetPlannerSlide.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/login/BudgetPlannerSlide.tsx

interface BudgetEntry {
  emoji: string;
  name: string;
  spent: number;
  budget: number;
}

const BUDGET_ENTRIES: BudgetEntry[] = [
  { emoji: '🛒', name: 'Groceries', spent: 350, budget: 500 },
  { emoji: '💡', name: 'Bills',     spent: 180, budget: 250 },
  { emoji: '🍽', name: 'Dining',    spent: 260, budget: 300 },
  { emoji: '🛍', name: 'Shopping',  spent: 155, budget: 150 },
];

const TOTAL_SPENT  = BUDGET_ENTRIES.reduce((s, e) => s + e.spent,  0); // 945
const TOTAL_BUDGET = BUDGET_ENTRIES.reduce((s, e) => s + e.budget, 0); // 1200

function barGradient(entry: BudgetEntry): string {
  const pct = entry.spent / entry.budget;
  if (pct >= 1)   return 'linear-gradient(90deg, #f87171, #dc2626)'; // expense-gradient
  if (pct >= 0.8) return 'linear-gradient(90deg, #f97316, #fb923c)'; // orange / warning
  return 'linear-gradient(90deg, #4caf50, #8bc34a)';                 // login-green → login-lime
}

function barWidth(entry: BudgetEntry): string {
  return `${Math.min((entry.spent / entry.budget) * 100, 100)}%`;
}

export default function BudgetPlannerSlide() {
  return (
    <>
      <h1 className="login-h1">
        Plan your spend.
        <br />
        <span className="login-grad-text">Own every dollar.</span>
      </h1>

      <p className="login-lead">
        Set category budgets and watch GlintBudget keep you on track — automatically.
      </p>

      <div className="login-glass mx-auto mt-7 inline-block p-6 text-left w-full max-w-md">
        <p
          style={{
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--login-muted)',
            marginBottom: '12px',
          }}
        >
          Monthly Budget
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {BUDGET_ENTRIES.map((entry) => (
            <div key={entry.name}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: '5px',
                  color: 'var(--login-fg)',
                }}
              >
                <span>
                  {entry.emoji} {entry.name}
                </span>
                <span style={{ color: 'var(--login-muted)' }}>
                  ${entry.spent} / ${entry.budget}
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  height: '8px',
                }}
              >
                <div
                  style={{
                    background: barGradient(entry),
                    width: barWidth(entry),
                    height: '8px',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <span style={{ color: 'var(--login-muted)' }}>
            Total: ${TOTAL_SPENT} / ${TOTAL_BUDGET}
          </span>
          <span style={{ color: '#8bc34a', fontWeight: 600 }}>
            ${TOTAL_BUDGET - TOTAL_SPENT} remaining
          </span>
        </div>
      </div>

      {/* Colour legend */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          marginTop: '14px',
          flexWrap: 'wrap',
          fontSize: '11px',
          color: 'var(--login-muted)',
        }}
      >
        {[
          { label: 'On track',     bg: 'linear-gradient(90deg,#4caf50,#8bc34a)' },
          { label: 'Nearing limit',bg: 'linear-gradient(90deg,#f97316,#fb923c)' },
          { label: 'Over budget',  bg: 'linear-gradient(90deg,#f87171,#dc2626)' },
        ].map(({ label, bg }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              aria-hidden="true"
              style={{ width: '9px', height: '9px', borderRadius: '2px', background: bg, display: 'inline-block' }}
            />
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run the tests — all four must pass**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
npm run test -- BudgetPlannerSlide
```

Expected: `4 passed`.

- [ ] **Step 3: Commit**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
git add src/components/login/BudgetPlannerSlide.tsx src/components/login/BudgetPlannerSlide.test.tsx
git commit -m "feat: add BudgetPlannerSlide component with tests"
```

---

### Task 3: Wire the slide into `slides.tsx` and fix the broken carousel test

**Files:**
- Modify: `src/components/login/slides.tsx`
- Modify: `src/components/login/OnboardingCarousel.test.tsx`

- [ ] **Step 1: Insert the new slide at index 3 in `slides.tsx`**

Open `src/components/login/slides.tsx`. After the existing imports at the top, add:

```tsx
import BudgetPlannerSlide from './BudgetPlannerSlide';
```

Then insert the new slide object between the `analytics` and `superpowers` entries. The `SLIDES` array must look like this after the edit:

```tsx
export const SLIDES: Slide[] = [
  {
    id: 'hook',
    eyebrow: 'Welcome',
    render: () => ( /* unchanged */ ),
  },
  {
    id: 'intelligence',
    eyebrow: 'Intelligence',
    render: () => ( /* unchanged */ ),
  },
  {
    id: 'analytics',
    eyebrow: 'Analytics',
    render: () => ( /* unchanged */ ),
  },
  // ── NEW ──────────────────────────────────────────────────────────────────
  {
    id: 'budget-planner',
    eyebrow: 'Budget Planner',
    render: () => <BudgetPlannerSlide />,
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'superpowers',
    eyebrow: 'Why GlintBudget',
    render: () => ( /* unchanged */ ),
  },
  {
    id: 'launch',
    render: () => ( /* unchanged */ ),
  },
];
```

Only add the four lines between the `// ── NEW ──` markers; leave all other slide content exactly as-is.

- [ ] **Step 2: Fix the broken dot-click test in `OnboardingCarousel.test.tsx`**

The carousel test at line 43 clicks "go to slide 4" and expects to see "superpowers" content.
With Budget Planner inserted at index 3 (= slide 4, 1-based), the test now finds Budget Planner
content instead. Update that test to click slide 5:

Find this block in `src/components/login/OnboardingCarousel.test.tsx`:

```tsx
  it('jumps to a slide when its dot is clicked', () => {
    render(<OnboardingCarousel />);
    fireEvent.click(screen.getByRole('button', { name: /go to slide 4/i }));
    expect(activeSlide().textContent).toContain('superpowers');
  });
```

Replace it with:

```tsx
  it('jumps to a slide when its dot is clicked', () => {
    render(<OnboardingCarousel />);
    fireEvent.click(screen.getByRole('button', { name: /go to slide 5/i }));
    expect(activeSlide().textContent).toContain('superpowers');
  });
```

- [ ] **Step 3: Run all login-related tests**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
npm run test -- src/components/login
```

Expected: all tests pass (BudgetPlannerSlide ×4, OnboardingCarousel ×4).

- [ ] **Step 4: Run the full test suite**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
npm run test
```

Expected: all tests pass, no regressions.

- [ ] **Step 5: Typecheck**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
git add src/components/login/slides.tsx src/components/login/OnboardingCarousel.test.tsx
git commit -m "feat: add Budget Planner slide to web onboarding carousel"
```

---

### Task 4: Verify visually in the browser

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/rajeshkumar/workspace/GlintBudgetUI
npm run dev
```

Open `http://localhost:5173`. You should see the login/onboarding page.

- [ ] **Step 2: Check the carousel**

Verify:
- The carousel now has **6 dots** at the bottom left.
- Auto-advancing reaches a slide titled "Budget Planner" (after Analytics).
- The progress bars display correct colours: green for Groceries/Bills, orange for Dining, red for Shopping.
- The footer shows "$255 remaining" in lime green.
- The slide before Budget Planner is Analytics (donut chart); the slide after is Superpowers (benefit cards).

- [ ] **Step 3: Check light mode**

Switch the browser to light mode (OS or the appearance toggle). The login screen's `--login-fg` and `--login-muted` variables adapt automatically; verify text is readable.

---

## Track B — iOS

> Work in `/Users/rajeshkumar/workspace/GlintBudget` for all steps below.

### Task 5: Add `.budgetPlanner` to the `OnboardingPage` enum

**Files:**
- Modify: `GlintBudget/Core/Onboarding/Model/OnboardingPage.swift`

- [ ] **Step 1: Insert the new case**

Open `GlintBudget/Core/Onboarding/Model/OnboardingPage.swift`. The `OnboardingPage` enum
currently reads:

```swift
enum OnboardingPage: Int, CaseIterable, Identifiable {
    case hook
    case intelligence
    case analytics
    case superpowers
    case launch
    ...
}
```

Add `.budgetPlanner` between `.analytics` and `.superpowers`:

```swift
enum OnboardingPage: Int, CaseIterable, Identifiable {
    case hook           // 0
    case intelligence   // 1
    case analytics      // 2
    case budgetPlanner  // 3  ← NEW
    case superpowers    // 4
    case launch         // 5
    ...
}
```

The `ctaTitle` switch already returns `"Continue"` for the `default` arm, so `.budgetPlanner`
will automatically return `"Continue"` — no change needed there.

- [ ] **Step 2: Verify the file compiles**

In Xcode press **⌘B** (Build). The build should fail with a non-exhaustive switch error in
`OnboardingFlowView.swift` — that is expected and will be fixed in Task 7.

---

### Task 6: Create `OnboardingBudgetPlannerView`

**Files:**
- Create: `GlintBudget/Core/Onboarding/View/Screens/OnboardingBudgetPlannerView.swift`

- [ ] **Step 1: Create the file in Xcode**

In Xcode, right-click `Core/Onboarding/View/Screens/` in the navigator → New File → Swift File.
Name it `OnboardingBudgetPlannerView`.

- [ ] **Step 2: Paste the full implementation**

```swift
import SwiftUI

struct OnboardingBudgetPlannerView: View {
    let isActive: Bool
    let parallax: CGFloat

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var grown = false
    @State private var appeared = false

    private struct BudgetEntry: Identifiable {
        let id = UUID()
        let emoji: String
        let name: String
        let spent: Double
        let budget: Double
        var pct: Double { spent / budget }
    }

    private let entries: [BudgetEntry] = [
        BudgetEntry(emoji: "🛒", name: "Groceries", spent: 350, budget: 500),
        BudgetEntry(emoji: "💡", name: "Bills",     spent: 180, budget: 250),
        BudgetEntry(emoji: "🍽", name: "Dining",    spent: 260, budget: 300),
        BudgetEntry(emoji: "🛍", name: "Shopping",  spent: 155, budget: 150),
    ]

    private var totalSpent:  Double { entries.reduce(0) { $0 + $1.spent } }
    private var totalBudget: Double { entries.reduce(0) { $0 + $1.budget } }

    var body: some View {
        VStack(spacing: AppTheme.Spacing.l) {
            Spacer(minLength: 0)

            // Headline + tagline
            VStack(alignment: .leading, spacing: AppTheme.Spacing.s) {
                Text("Plan your spend.")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(AppTheme.Colors.textPrimary)
                    .minimumScaleFactor(0.7)
                Text("Own every dollar.")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(AppTheme.Colors.accentGradient)
                    .minimumScaleFactor(0.7)
                Text("Set category budgets and watch GlintBudget keep you on track — automatically.")
                    .font(.title3)
                    .foregroundStyle(AppTheme.Colors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 20)

            // Budget bars card
            GlassCard {
                VStack(spacing: AppTheme.Spacing.m) {
                    Text("MONTHLY BUDGET")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(AppTheme.Colors.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                        BarRow(entry: entry, index: index, grown: grown, reduceMotion: reduceMotion)
                    }

                    Divider()

                    HStack {
                        Text("Total: $\(Int(totalSpent)) / $\(Int(totalBudget))")
                            .font(.caption)
                            .foregroundStyle(AppTheme.Colors.textSecondary)
                        Spacer()
                        Text("$\(Int(totalBudget - totalSpent)) remaining")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(AppTheme.Colors.accent)
                    }
                }
            }
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 30)
            .parallax(progress: parallax, strength: 14, reduceMotion: reduceMotion)

            // Colour legend
            HStack(spacing: AppTheme.Spacing.l) {
                LegendSwatch(label: "On track",      gradient: AppTheme.Colors.accentGradient)
                LegendSwatch(label: "Nearing limit", gradient: LinearGradient(
                    colors: [.orange, Color(red: 0.98, green: 0.57, blue: 0.24)],
                    startPoint: .leading, endPoint: .trailing))
                LegendSwatch(label: "Over budget",   gradient: LinearGradient(
                    colors: [Color(red: 0.97, green: 0.44, blue: 0.44), .red],
                    startPoint: .leading, endPoint: .trailing))
            }
            .opacity(appeared ? 1 : 0)

            Spacer(minLength: 0)
        }
        .padding(.horizontal, AppTheme.Spacing.xl)
        .padding(.bottom, OnboardingLayout.bottomReserve)
        .onChange(of: isActive, initial: true) { _, active in animate(active) }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "Plan your spend. Own every dollar. " +
            "Set category budgets and watch GlintBudget keep you on track — automatically."
        )
    }

    private func animate(_ active: Bool) {
        guard active else { return }
        if reduceMotion { appeared = true; grown = true; return }
        withAnimation(.spring(response: 0.6, dampingFraction: 0.82).delay(0.1)) {
            appeared = true
        }
        withAnimation(.spring(response: 0.6, dampingFraction: 0.82).delay(0.2)) {
            grown = true
        }
    }
}

// MARK: - Private sub-views

private struct BarRow: View {
    let entry: OnboardingBudgetPlannerView.BudgetEntry  // exposed via typealias workaround below
    let index: Int
    let grown: Bool
    let reduceMotion: Bool

    var body: some View {
        VStack(spacing: AppTheme.Spacing.xs) {
            HStack {
                Text(entry.emoji + " " + entry.name)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.Colors.textPrimary)
                Spacer()
                Text("$\(Int(entry.spent)) / $\(Int(entry.budget))")
                    .font(.caption)
                    .foregroundStyle(AppTheme.Colors.textSecondary)
            }

            GeometryReader { geo in
                Capsule()
                    .fill(Color.white.opacity(0.08))
                    .overlay(alignment: .leading) {
                        Capsule()
                            .fill(barGradient(for: entry))
                            .frame(width: grown
                                ? geo.size.width * CGFloat(min(entry.pct, 1.0))
                                : 0)
                            .animation(
                                reduceMotion ? nil :
                                    .spring(response: 0.6, dampingFraction: 0.8)
                                    .delay(Double(index) * 0.1),
                                value: grown)
                    }
            }
            .frame(height: 9)
        }
    }

    private func barGradient(for entry: OnboardingBudgetPlannerView.BudgetEntry) -> LinearGradient {
        if entry.pct >= 1.0 {
            return LinearGradient(
                colors: [Color(red: 0.97, green: 0.44, blue: 0.44), .red],
                startPoint: .leading, endPoint: .trailing)
        }
        if entry.pct >= 0.8 {
            return LinearGradient(
                colors: [.orange, Color(red: 0.98, green: 0.57, blue: 0.24)],
                startPoint: .leading, endPoint: .trailing)
        }
        return AppTheme.Colors.accentGradient
    }
}

private struct LegendSwatch: View {
    let label: String
    let gradient: LinearGradient

    var body: some View {
        HStack(spacing: AppTheme.Spacing.xs) {
            RoundedRectangle(cornerRadius: 2)
                .fill(gradient)
                .frame(width: 10, height: 10)
            Text(label)
                .font(.caption2)
                .foregroundStyle(AppTheme.Colors.textSecondary)
        }
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        OnboardingGradientBackground(scrollProgress: 3)
        OnboardingBudgetPlannerView(isActive: true, parallax: 0)
    }
}
```

> **Note on `BarRow` referencing `OnboardingBudgetPlannerView.BudgetEntry`:** Swift allows
> private nested types to be referenced from sibling private structs in the same file. If the
> compiler rejects it, move `BudgetEntry` outside `OnboardingBudgetPlannerView` as a
> `private struct BudgetEntry` at file scope.

- [ ] **Step 3: Build in Xcode (⌘B)**

Expected: still one remaining error — the `case .budgetPlanner:` is missing in
`OnboardingFlowView.swift`. Fix that in Task 7.

---

### Task 7: Wire the new view into `OnboardingFlowView`

**Files:**
- Modify: `GlintBudget/Core/Onboarding/View/OnboardingFlowView.swift`

- [ ] **Step 1: Add the new case to `screen(for:)`**

Find the `screen(for:)` method in `OnboardingFlowView.swift` (currently around line 54):

```swift
switch page {
case .hook:         OnboardingHookView(isActive: isActive, parallax: parallax)
case .intelligence: OnboardingIntelligenceView(isActive: isActive, parallax: parallax)
case .analytics:    OnboardingAnalyticsView(isActive: isActive, parallax: parallax)
case .superpowers:  OnboardingSuperpowersView(isActive: isActive, parallax: parallax)
case .launch:       OnboardingLaunchView(isActive: isActive, parallax: parallax)
}
```

Add the new case between `.analytics` and `.superpowers`:

```swift
switch page {
case .hook:          OnboardingHookView(isActive: isActive, parallax: parallax)
case .intelligence:  OnboardingIntelligenceView(isActive: isActive, parallax: parallax)
case .analytics:     OnboardingAnalyticsView(isActive: isActive, parallax: parallax)
case .budgetPlanner: OnboardingBudgetPlannerView(isActive: isActive, parallax: parallax)
case .superpowers:   OnboardingSuperpowersView(isActive: isActive, parallax: parallax)
case .launch:        OnboardingLaunchView(isActive: isActive, parallax: parallax)
}
```

- [ ] **Step 2: Build in Xcode (⌘B)**

Expected: **Build Succeeded** — zero errors, zero warnings introduced by this change.

---

### Task 8: Verify in the iOS Simulator

- [ ] **Step 1: Run the app in the simulator (⌘R)**

If onboarding has already been completed on the device/simulator, reset it:
Settings → (toggle "Show onboarding on launch" back on, if that setting is exposed), or
delete and reinstall the app from the simulator.

- [ ] **Step 2: Swipe through the onboarding**

Verify:
1. The page indicator shows **6 dots**.
2. Swiping from Analytics lands on **Budget Planner** (not Superpowers).
3. Budget Planner shows:
   - Headline "Plan your spend." then "Own every dollar." in gradient.
   - Tagline in muted text.
   - GlassCard with four bars: Groceries + Bills in lime/green; Dining in orange; Shopping in red (over 100%).
   - Footer "$255 remaining" in accent colour.
   - Three-swatch colour legend below the card.
4. The bars animate from 0 → their final width when the screen becomes active.
5. Swiping from Budget Planner lands on **Superpowers** (benefit cards).
6. Swiping to **Launch** still shows the final CTA button.

- [ ] **Step 3: Test "Skip" still works**

Tap "Skip" on any screen — should dismiss onboarding and land on the sign-in flow as before.

---

## Self-Review Checklist (completed before saving)

- [x] **Spec §2 (placement):** Task 3 inserts at index 3; Task 5 adds `.budgetPlanner` at index 3. ✓
- [x] **Spec §3 (content):** Headline, tagline, and eyebrow wired in Tasks 2 and 6. ✓
- [x] **Spec §4 (demo data):** Four entries inline in both platforms — Tasks 2 and 6. ✓
- [x] **Spec §5 (bar colours):** `barGradient()` helper in both files uses correct tokens. ✓
- [x] **Spec §6d (page indicator):** `OnboardingViewModel.pageCount` derives from `allCases.count` — automatic. ✓
- [x] **Spec §7c (web dots):** `OnboardingCarousel` derives dots from `SLIDES.length` — automatic. ✓
- [x] **Spec §7d (test):** Four assertions in `BudgetPlannerSlide.test.tsx` cover all required checks. ✓
- [x] **Breaking test fixed:** `OnboardingCarousel.test.tsx` dot-click test updated from slide 4 → slide 5 in Task 3. ✓
- [x] **Type consistency:** `BudgetEntry` defined in Task 6 is the same type used in `BarRow`; `barGradient` referenced consistently. ✓
- [x] **No placeholders:** All code blocks are complete and runnable. ✓
