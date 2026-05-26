# Sidebar Theme Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 gradient dot swatches above the Sign Out button in the Sidebar so the user can switch themes without opening Settings.

**Architecture:** Modify `Sidebar.tsx` inline — import `useTheme` + `THEMES`, render a `role="group"` row of 4 circle buttons each filled with the theme's `swatchGradient`. Active dot gets a white ring; clicking calls `setTheme(id)`. Update `Sidebar.test.tsx` to cover the new behaviour.

**Tech Stack:** React, Tailwind CSS v4, `useTheme` from `ThemeContext`, `THEMES` from `themes.ts`

---

### Task 1: Add failing tests for the theme switcher

**Files:**

- Modify: `src/components/layout/Sidebar.test.tsx`

- [ ] **Step 1: Add ThemeContext mock and new test cases**

Open `src/components/layout/Sidebar.test.tsx`. Add the mock immediately after the existing `vi.mock` calls and add three new test cases at the end of the `describe` block:

```tsx
// after existing vi.mock lines:
vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));

import { useTheme } from '../../context/ThemeContext';
```

Then add inside `describe('Sidebar', () => { … })`:

```tsx
describe('theme switcher', () => {
  const setTheme = vi.fn();

  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({ themeId: 'lime', setTheme });
  });

  it('renders a theme group with 4 swatch buttons', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    const group = screen.getByRole('group', { name: /theme/i });
    expect(group.querySelectorAll('button')).toHaveLength(4);
  });

  it('marks the active theme button with aria-pressed="true"', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    const active = screen.getByRole('button', { name: /lime/i });
    expect(active).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls setTheme when an inactive swatch is clicked', async () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /ocean/i }));
    expect(setTheme).toHaveBeenCalledWith('ocean');
  });
});
```

You will also need to add `beforeEach` to the imports at the top:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npm run test -- --reporter=verbose src/components/layout/Sidebar.test.tsx
```

Expected: 3 new tests **FAIL** (theme group not found, `useTheme` not called yet).

---

### Task 2: Implement the theme switcher in Sidebar.tsx

**Files:**

- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 3: Add imports**

At the top of `src/components/layout/Sidebar.tsx`, add:

```tsx
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../lib/themes';
```

- [ ] **Step 4: Call useTheme inside the component**

Inside `export default function Sidebar()`, after `const navigate = useNavigate();`, add:

```tsx
const { themeId, setTheme } = useTheme();
```

- [ ] **Step 5: Insert the swatch row above Sign Out**

Replace the `{/* Sign out */}` section with:

```tsx
{
  /* Theme switcher */
}
<div role="group" aria-label="Theme" className="px-3 pb-3 flex gap-2 justify-center">
  {THEMES.map((t) => (
    <button
      key={t.id}
      type="button"
      aria-label={t.name}
      aria-pressed={themeId === t.id}
      onClick={() => void setTheme(t.id)}
      className={[
        'w-5 h-5 rounded-full transition-all',
        themeId === t.id
          ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110'
          : 'opacity-60 hover:opacity-100',
      ].join(' ')}
      style={{ background: t.swatchGradient }}
    />
  ))}
</div>;

{
  /* Sign out */
}
<div className="px-3 pt-2">
  <button
    type="button"
    onClick={() => void handleSignOut()}
    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white border border-white/20"
  >
    <span aria-hidden="true" className="text-base">
      ⎋
    </span>
    Sign out
  </button>
</div>;
```

- [ ] **Step 6: Run the tests to confirm they all pass**

```bash
npm run test -- --reporter=verbose src/components/layout/Sidebar.test.tsx
```

Expected: all tests **PASS** including the 3 new ones.

- [ ] **Step 7: Run the full test suite**

```bash
npm run test
```

Expected: all 251 tests pass (248 existing + 3 new).

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Sidebar.test.tsx
git commit -m "feat: add theme swatch switcher to sidebar above sign-out"
```
