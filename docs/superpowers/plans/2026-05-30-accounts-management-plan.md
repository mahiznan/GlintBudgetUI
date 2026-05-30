# Accounts Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delete (with confirmation), edit-with-transaction-rename, and archive/restore capabilities to the Settings Accounts tab, storing archived accounts in a new `archivedAccounts` field on the Preference document.

**Architecture:** A dedicated `AccountsTab` component replaces the generic `BudgetDataTab` for the accounts tab only. Archived accounts are stored in a new `archivedAccounts: BudgetData[]` field on the Firestore Preference document; `accounts` continues to mean active-only, so all existing dropdowns work without changes. Bulk transaction rename is a fire-and-forget hook (`useBulkRenameAccount`) that batches Firestore writes in groups of 500.

**Tech Stack:** React, TypeScript strict, Vitest + React Testing Library, Firestore (`writeBatch`, `getDocs`, `query`, `where`), Tailwind CSS v4.

---

## File Map

| File | Action |
|---|---|
| `src/firestore/types.ts` | Modify — add `archivedAccounts: BudgetData[]` to `Preference` |
| `src/hooks/useUpdatePreference.ts` | Modify — add `archivedAccounts?: BudgetData[]` to `FirestorePreferencePartial` |
| `src/hooks/usePreferences.ts` | Modify — decode `archivedAccounts` (default `[]`) in `docToPreference` |
| `src/hooks/usePreferences.test.ts` | Modify — add test for `archivedAccounts` decoding |
| `src/hooks/useBulkRenameAccount.ts` | Create — bulk rename hook |
| `src/hooks/useBulkRenameAccount.test.ts` | Create — hook tests |
| `src/components/settings/AccountsTab.tsx` | Create — dedicated accounts tab component |
| `src/components/settings/AccountsTab.test.tsx` | Create — component smoke tests |
| `src/routes/Settings.tsx` | Modify — wire up `AccountsTab`, add `saveArchivedAccounts` |

---

## Task 1: Extend the Preference type and decoding

**Files:**
- Modify: `src/firestore/types.ts`
- Modify: `src/hooks/useUpdatePreference.ts`
- Modify: `src/hooks/usePreferences.ts`
- Modify: `src/hooks/usePreferences.test.ts`

- [ ] **Step 1: Add `archivedAccounts` to the `Preference` interface**

In `src/firestore/types.ts`, add one line inside `Preference`:

```ts
// Mirrors iOS Preference (document ID = user uid)
export interface Preference {
  id: string;
  accounts: BudgetData[];
  categories: BudgetData[];
  subCategories: BudgetData[];
  vendors: BudgetData[];
  payments: BudgetData[];
  archivedAccounts: BudgetData[];   // ← add this line
  defaultCurrency: Currency;
  bookmarkedCurrencies: string[];
  defaultEntries: Record<string, string> | null;
  theme?: string;
  spendingChartType?: 'bar' | 'line';
  layoutWidth?: 'fixed' | 'full';
}
```

- [ ] **Step 2: Add `archivedAccounts` to `FirestorePreferencePartial`**

In `src/hooks/useUpdatePreference.ts`, add one line to `FirestorePreferencePartial`:

```ts
export interface FirestorePreferencePartial {
  accounts?: BudgetData[];
  categories?: BudgetData[];
  subCategories?: BudgetData[];
  vendors?: BudgetData[];
  payments?: BudgetData[];
  archivedAccounts?: BudgetData[];   // ← add this line
  default_currency?: Currency;
  frequent_currencies?: string[];
  default_entries?: Record<string, string>;
  theme?: string;
  spendingChartType?: 'bar' | 'line';
  layoutWidth?: 'fixed' | 'full';
}
```

No changes needed to `mutate()` — the spread `{ ...partial }` already forwards the new field to Firestore as `archivedAccounts` (camelCase, matching the read key).

- [ ] **Step 3: Update `mergeWithDefaults` to prefer Firestore version for matching names**

This makes emoji edits on default accounts persist correctly. In `src/hooks/usePreferences.ts`, replace the `mergeWithDefaults` function:

```ts
// Before
function mergeWithDefaults(defaults: BudgetData[], fromFirestore: BudgetData[]): BudgetData[] {
  const seen = new Set(defaults.map((d) => `${d.name}::${d.parent ?? ''}`));
  const additions = fromFirestore.filter((d) => !seen.has(`${d.name}::${d.parent ?? ''}`));
  return [...defaults, ...additions];
}

// After
function mergeWithDefaults(defaults: BudgetData[], fromFirestore: BudgetData[]): BudgetData[] {
  const firestoreByKey = new Map(
    fromFirestore.map((d) => [`${d.name.toLowerCase()}::${d.parent ?? ''}`, d]),
  );
  const result: BudgetData[] = [];
  for (const def of defaults) {
    const key = `${def.name.toLowerCase()}::${def.parent ?? ''}`;
    // Use Firestore version if stored (allows user to override default emoji); else use constant.
    result.push(firestoreByKey.get(key) ?? def);
    firestoreByKey.delete(key);
  }
  firestoreByKey.forEach((item) => result.push(item));
  return result;
}
```

This is safe for all existing callers (categories, payments, subcategories) — identical output when no Firestore item matches a default name.

- [ ] **Step 4: Decode `archivedAccounts` in `docToPreference`**

In `src/hooks/usePreferences.ts`, add one line inside `docToPreference`:

```ts
function docToPreference(id: string, raw: Record<string, unknown>): Preference {
  return {
    id,
    accounts: mergeWithDefaults(DEFAULT_ACCOUNTS, (raw['accounts'] as BudgetData[]) ?? []),
    categories: mergeWithDefaults(DEFAULT_CATEGORIES, (raw['categories'] as BudgetData[]) ?? []),
    subCategories: mergeWithDefaults(
      DEFAULT_SUBCATEGORIES,
      (raw['subCategories'] as BudgetData[]) ?? [],
    ),
    vendors: (raw['vendors'] as BudgetData[]) ?? [],
    payments: mergeWithDefaults(DEFAULT_PAYMENTS, (raw['payments'] as BudgetData[]) ?? []),
    archivedAccounts: (raw['archivedAccounts'] as BudgetData[]) ?? [],   // ← add this line
    defaultCurrency: (raw['default_currency'] as Preference['defaultCurrency']) ?? DEFAULT_CURRENCY,
    bookmarkedCurrencies: (raw['frequent_currencies'] as string[]) ?? [],
    defaultEntries:
      raw['default_entries'] !== undefined
        ? decodeDefaultEntries(raw['default_entries'])
        : DEFAULT_ENTRIES,
    theme: raw['theme'] as string | undefined,
    spendingChartType: raw['spendingChartType'] as 'bar' | 'line' | undefined,
    layoutWidth: raw['layoutWidth'] as 'fixed' | 'full' | undefined,
  };
}
```

- [ ] **Step 5: Add tests for `archivedAccounts` decoding and updated `mergeWithDefaults`**

At the bottom of `src/hooks/usePreferences.test.ts`, add inside the existing `describe('usePreferences', ...)` block:

```ts
it('decodes archivedAccounts from Firestore', async () => {
  const { result } = renderHook(() => usePreferences('uid-123'));
  act(() => {
    capturedCallback!(
      makeSnap({
        ...mockPreferenceData,
        archivedAccounts: [{ name: 'Old Wallet', emoji: '👛', type: 'account', parent: null }],
      }),
    );
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data?.archivedAccounts).toHaveLength(1);
  expect(result.current.data?.archivedAccounts[0]!.name).toBe('Old Wallet');
});

it('defaults archivedAccounts to [] when field is absent', async () => {
  const { result } = renderHook(() => usePreferences('uid-123'));
  act(() => { capturedCallback!(makeSnap(mockPreferenceData)); });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data?.archivedAccounts).toEqual([]);
});

it('mergeWithDefaults prefers Firestore version when names match (allows emoji override)', async () => {
  const { result } = renderHook(() => usePreferences('uid-123'));
  act(() => {
    capturedCallback!(
      makeSnap({
        ...mockPreferenceData,
        accounts: [{ name: 'Monthly Budget', emoji: '💰', type: 'account', parent: null }],
      }),
    );
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  const monthly = result.current.data?.accounts.find((a) => a.name === 'Monthly Budget');
  expect(monthly?.emoji).toBe('💰');
  // still only one "Monthly Budget" (no duplicate)
  expect(result.current.data?.accounts.filter((a) => a.name === 'Monthly Budget')).toHaveLength(1);
});
```

- [ ] **Step 6: Run tests and confirm they pass**

```bash
npm run test -- --reporter=verbose src/hooks/usePreferences.test.ts
```

Expected: all tests pass including the three new ones.

- [ ] **Step 7: Commit**

```bash
git add src/firestore/types.ts src/hooks/useUpdatePreference.ts src/hooks/usePreferences.ts src/hooks/usePreferences.test.ts
git commit -m "feat: add archivedAccounts field; update mergeWithDefaults to prefer Firestore version for matching names"
```

---

## Task 2: `useBulkRenameAccount` hook (TDD)

**Files:**
- Create: `src/hooks/useBulkRenameAccount.ts`
- Create: `src/hooks/useBulkRenameAccount.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useBulkRenameAccount.test.ts`:

```ts
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockCommit = vi.fn();
const mockUpdate = vi.fn();
const mockBatch = { update: mockUpdate, commit: mockCommit };

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col-ref'),
  query: vi.fn(() => 'query-ref'),
  where: vi.fn(() => 'where-clause'),
  getDocs: vi.fn(),
  writeBatch: vi.fn(() => mockBatch),
}));

import { getDocs, writeBatch } from 'firebase/firestore';
import { useBulkRenameAccount } from './useBulkRenameAccount';
import { SyncStatusProvider } from '../context/SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncStatusProvider>{children}</SyncStatusProvider>
);

function makeSnap(count: number) {
  return {
    docs: Array.from({ length: count }, (_, i) => ({ ref: `ref-${i}` })),
  };
}

describe('useBulkRenameAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writeBatch).mockReturnValue(mockBatch as never);
    mockCommit.mockResolvedValue(undefined);
  });

  it('calls getDocs with correct collection and query', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(0) as never);
    const { result } = renderHook(() => useBulkRenameAccount(), { wrapper });
    result.current.mutate('uid-1', 'Savings', 'Main Savings');
    await waitFor(() => expect(getDocs).toHaveBeenCalledWith('query-ref'));
  });

  it('updates all docs in a single batch when count ≤ 500', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(3) as never);
    const { result } = renderHook(() => useBulkRenameAccount(), { wrapper });
    result.current.mutate('uid-1', 'Savings', 'Main Savings');
    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenCalledWith('ref-0', { account: 'Main Savings' });
  });

  it('splits into two batches when doc count is 501', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(501) as never);
    const { result } = renderHook(() => useBulkRenameAccount(), { wrapper });
    result.current.mutate('uid-1', 'Old', 'New');
    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(2));
    expect(writeBatch).toHaveBeenCalledTimes(2);
  });

  it('does not call writeBatch when no matching transactions exist', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(0) as never);
    const { result } = renderHook(() => useBulkRenameAccount(), { wrapper });
    result.current.mutate('uid-1', 'Old', 'New');
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    expect(mockCommit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose src/hooks/useBulkRenameAccount.test.ts
```

Expected: FAIL — `Cannot find module './useBulkRenameAccount'`

- [ ] **Step 3: Implement `useBulkRenameAccount`**

Create `src/hooks/useBulkRenameAccount.ts`:

```ts
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useBulkRenameAccount() {
  const { notifyWrite } = useSyncStatus();

  function mutate(uid: string, oldName: string, newName: string): void {
    notifyWrite();
    void (async () => {
      const col = collection(db, 'transactions');
      const q = query(col, where('user_id', '==', uid), where('account', '==', oldName));
      const snap = await getDocs(q);
      const groups = chunk(snap.docs, 500);
      await Promise.all(
        groups.map((group) => {
          const batch = writeBatch(db);
          group.forEach((d) => batch.update(d.ref, { account: newName }));
          return batch.commit();
        }),
      );
    })();
  }

  return { mutate };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/hooks/useBulkRenameAccount.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBulkRenameAccount.ts src/hooks/useBulkRenameAccount.test.ts
git commit -m "feat: add useBulkRenameAccount hook with 500-doc batch chunking"
```

---

## Task 3: `AccountsTab` component (TDD)

**Files:**
- Create: `src/components/settings/AccountsTab.test.tsx`
- Create: `src/components/settings/AccountsTab.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/settings/AccountsTab.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BudgetData } from '../../firestore/types';

const mockBulkRename = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useBulkRenameAccount', () => ({
  useBulkRenameAccount: () => ({ mutate: mockBulkRename }),
}));

import AccountsTab from './AccountsTab';

const defaultItem: BudgetData = { name: 'Monthly Budget', emoji: '💼', type: 'account', parent: null };
const userItemA: BudgetData = { name: 'HDFC', emoji: '🏦', type: 'account', parent: null };
const archivedItem: BudgetData = { name: 'Old Wallet', emoji: '👛', type: 'account', parent: null };

function renderTab(overrides: Partial<React.ComponentProps<typeof AccountsTab>> = {}) {
  return render(
    <AccountsTab
      accounts={[defaultItem]}
      archivedAccounts={[]}
      defaultItems={[defaultItem]}
      onSaveActive={vi.fn()}
      onSaveArchived={vi.fn()}
      uid="u1"
      {...overrides}
    />,
  );
}

describe('AccountsTab — active accounts rendering', () => {
  beforeEach(() => mockBulkRename.mockReset());

  it('renders default account with star badge and edit button, no archive/delete', () => {
    renderTab();
    expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
    expect(screen.getByLabelText('Default account')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Monthly Budget')).toBeInTheDocument();
    expect(screen.queryByLabelText('Archive Monthly Budget')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete Monthly Budget')).not.toBeInTheDocument();
  });

  it('edit form for default shows name as plain text (not editable) and emoji as input', async () => {
    renderTab();
    await userEvent.click(screen.getByLabelText('Edit Monthly Budget'));
    // Name shown as text, not an input
    expect(screen.queryByDisplayValue('Monthly Budget')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument(); // the span with aria-label
    // Emoji is still editable
    expect(screen.getByLabelText('Emoji')).toBeInTheDocument();
    // No rename modal appears after save (name unchanged)
  });

  it('saving a default emoji change calls onSaveActive with the default (updated emoji) + user items', async () => {
    const onSaveActive = vi.fn();
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive });
    await userEvent.click(screen.getByLabelText('Edit Monthly Budget'));
    const emojiInput = screen.getByLabelText('Emoji');
    await userEvent.clear(emojiInput);
    await userEvent.type(emojiInput, '💰');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSaveActive).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Monthly Budget', emoji: '💰' }),
      userItemA,
    ]);
    // No rename modal
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders user account with edit, archive, and delete buttons', () => {
    renderTab({ accounts: [defaultItem, userItemA] });
    expect(screen.getByLabelText('Edit HDFC')).toBeInTheDocument();
    expect(screen.getByLabelText('Archive HDFC')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete HDFC')).toBeInTheDocument();
  });

  it('hides archived section when archivedAccounts is empty', () => {
    renderTab({ archivedAccounts: [] });
    expect(screen.queryByText(/Archived/)).not.toBeInTheDocument();
  });

  it('shows archived section with account name when archivedAccounts has items', () => {
    renderTab({ archivedAccounts: [archivedItem] });
    expect(screen.getByText(/Archived \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Old Wallet')).toBeInTheDocument();
  });
});

describe('AccountsTab — delete', () => {
  beforeEach(() => mockBulkRename.mockReset());

  it('shows delete dialog on delete click, dismisses on Cancel', async () => {
    renderTab({ accounts: [defaultItem, userItemA] });
    await userEvent.click(screen.getByLabelText('Delete HDFC'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onSaveActive without the deleted item on confirm', async () => {
    const onSaveActive = vi.fn();
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive });
    await userEvent.click(screen.getByLabelText('Delete HDFC'));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    // only user items are passed (defaults re-added at read time)
    expect(onSaveActive).toHaveBeenCalledWith([]);
  });

  it('calls onSaveArchived without the deleted item when deleting from archived section', async () => {
    const onSaveArchived = vi.fn();
    renderTab({ archivedAccounts: [archivedItem], onSaveArchived });
    await userEvent.click(screen.getByLabelText('Delete Old Wallet'));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onSaveArchived).toHaveBeenCalledWith([]);
  });
});

describe('AccountsTab — archive & restore', () => {
  beforeEach(() => mockBulkRename.mockReset());

  it('calls onSaveActive and onSaveArchived on archive', async () => {
    const onSaveActive = vi.fn();
    const onSaveArchived = vi.fn();
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive, onSaveArchived });
    await userEvent.click(screen.getByLabelText('Archive HDFC'));
    expect(onSaveActive).toHaveBeenCalledWith([]);
    expect(onSaveArchived).toHaveBeenCalledWith([userItemA]);
  });

  it('calls onSaveActive and onSaveArchived on restore', async () => {
    const onSaveActive = vi.fn();
    const onSaveArchived = vi.fn();
    renderTab({
      accounts: [defaultItem],
      archivedAccounts: [archivedItem],
      onSaveActive,
      onSaveArchived,
    });
    await userEvent.click(screen.getByLabelText('Restore Old Wallet'));
    expect(onSaveActive).toHaveBeenCalledWith([archivedItem]);
    expect(onSaveArchived).toHaveBeenCalledWith([]);
  });

  it('shows error when restoring an account whose name conflicts with an active account', async () => {
    const conflictItem: BudgetData = { name: 'HDFC', emoji: '🏦', type: 'account', parent: null };
    renderTab({
      accounts: [defaultItem, userItemA],
      archivedAccounts: [conflictItem],
    });
    await userEvent.click(screen.getByLabelText('Restore HDFC'));
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });
});

describe('AccountsTab — rename modal', () => {
  beforeEach(() => mockBulkRename.mockReset());

  it('shows rename modal when account name changes on save', async () => {
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'HDFC Savings');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByRole('dialog', { name: /update transactions/i })).toBeInTheDocument();
  });

  it('does NOT show rename modal when only emoji changes', async () => {
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const emojiInput = screen.getByLabelText('Emoji');
    await userEvent.clear(emojiInput);
    await userEvent.type(emojiInput, '💰');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls bulkRename with correct args on "Yes, update all"', async () => {
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn(), uid: 'u1' });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'HDFC Savings');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, update all/i }));
    expect(mockBulkRename).toHaveBeenCalledWith('u1', 'HDFC', 'HDFC Savings');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does NOT call bulkRename on "No, keep as-is" and closes modal', async () => {
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'HDFC Savings');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await userEvent.click(screen.getByRole('button', { name: /no, keep/i }));
    expect(mockBulkRename).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose src/components/settings/AccountsTab.test.tsx
```

Expected: FAIL — `Cannot find module './AccountsTab'`

- [ ] **Step 3: Implement `AccountsTab`**

Create `src/components/settings/AccountsTab.tsx`:

```tsx
import { useState } from 'react';
import type { BudgetData } from '../../firestore/types';
import { useBulkRenameAccount } from '../../hooks/useBulkRenameAccount';

interface AccountsTabProps {
  accounts: BudgetData[];
  archivedAccounts: BudgetData[];
  defaultItems: BudgetData[];
  onSaveActive: (items: BudgetData[]) => void;
  onSaveArchived: (items: BudgetData[]) => void;
  uid: string;
}

function isDuplicate(name: string, items: BudgetData[], excludeName?: string): boolean {
  const lower = name.trim().toLowerCase();
  return items.some(
    (item) =>
      item.name.toLowerCase() === lower &&
      item.name.toLowerCase() !== (excludeName?.toLowerCase() ?? '\0'),
  );
}

export default function AccountsTab({
  accounts,
  archivedAccounts,
  defaultItems,
  onSaveActive,
  onSaveArchived,
  uid,
}: AccountsTabProps) {
  const { mutate: bulkRename } = useBulkRenameAccount();

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editError, setEditError] = useState('');
  const [addName, setAddName] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addError, setAddError] = useState('');
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    name: string;
    source: 'active' | 'archived';
  } | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  function isDefault(item: BudgetData): boolean {
    return defaultItems.some((d) => d.name.toLowerCase() === item.name.toLowerCase());
  }

  const userItems = accounts.filter((item) => !isDefault(item));

  function startEdit(item: BudgetData) {
    setEditingName(item.name);
    setEditName(item.name);
    setEditEmoji(item.emoji ?? '');
    setEditError('');
  }

  function cancelEdit() {
    setEditingName(null);
    setEditError('');
  }

  function handleSaveEdit() {
    const oldName = editingName!;
    const def = isDefault({ name: oldName } as BudgetData);

    if (def) {
      // Default accounts: name is read-only; only emoji can change.
      // Write the default with its new emoji alongside user items so
      // mergeWithDefaults will pick up the Firestore version.
      const defaultItem = accounts.find((i) => i.name === oldName)!;
      onSaveActive([
        { ...defaultItem, emoji: editEmoji.slice(0, 2) || defaultItem.emoji },
        ...userItems,
      ]);
      setEditingName(null);
      return;
    }

    const name = editName.trim();
    if (!name) return;
    if (isDuplicate(name, accounts, oldName)) {
      setEditError(`"${name}" already exists.`);
      return;
    }
    const updated = userItems.map((item) =>
      item.name === oldName
        ? { ...item, name, emoji: editEmoji.slice(0, 2) || item.emoji }
        : item,
    );
    onSaveActive(updated);
    if (name !== oldName) {
      setRenameModal({ oldName, newName: name });
    }
    setEditingName(null);
    setEditError('');
  }

  function handleAdd() {
    const name = addName.trim();
    if (!name) return;
    if (isDuplicate(name, accounts)) {
      setAddError(`"${name}" already exists.`);
      return;
    }
    onSaveActive([
      ...userItems,
      { name, emoji: addEmoji.slice(0, 2) || null, type: 'account', parent: null },
    ]);
    setAddName('');
    setAddEmoji('');
    setAddError('');
  }

  function handleArchive(item: BudgetData) {
    onSaveActive(userItems.filter((i) => i.name !== item.name));
    onSaveArchived([...archivedAccounts, item]);
  }

  function handleDeleteClick(name: string, source: 'active' | 'archived') {
    setDeleteDialog({ name, source });
  }

  function confirmDelete() {
    if (!deleteDialog) return;
    if (deleteDialog.source === 'active') {
      onSaveActive(userItems.filter((i) => i.name !== deleteDialog.name));
    } else {
      onSaveArchived(archivedAccounts.filter((i) => i.name !== deleteDialog.name));
    }
    setDeleteDialog(null);
  }

  function handleRestore(item: BudgetData) {
    if (accounts.some((a) => a.name.toLowerCase() === item.name.toLowerCase())) {
      setRestoreError(
        `An active account named "${item.name}" already exists. Rename it before restoring.`,
      );
      return;
    }
    setRestoreError(null);
    onSaveActive([...userItems, item]);
    onSaveArchived(archivedAccounts.filter((a) => a.name !== item.name));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Active Accounts */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
            Active Accounts
          </h3>
        </div>

        {accounts.length > 0 && (
          <div className="divide-y divide-border">
            {accounts.map((item) => {
              const def = isDefault(item);
              return (
                <div key={item.name} className="px-5 py-3">
                  {editingName === item.name ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editEmoji}
                          onChange={(e) => setEditEmoji(e.target.value.slice(0, 2))}
                          className="w-10 text-center border border-border rounded-lg p-1.5 text-sm"
                          placeholder="😀"
                          aria-label="Emoji"
                          maxLength={2}
                        />
                        {isDefault({ name: editingName! } as BudgetData) ? (
                          <span className="flex-1 text-sm text-text px-3 py-1.5" aria-label="Name">
                            {editName}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              setEditError('');
                            }}
                            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
                            aria-label="Name"
                          />
                        )}
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                          style={{ background: 'var(--brand-gradient)' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
                        >
                          Cancel
                        </button>
                      </div>
                      {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm">{item.emoji ?? ''}</span>
                      <span className="flex-1 text-sm text-text">{item.name}</span>
                      {def && (
                        <span aria-label="Default account" title="Default">
                          ⭐
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-text-muted hover:text-brand p-1"
                        aria-label={`Edit ${item.name}`}
                      >
                        ✏️
                      </button>
                      {!def && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleArchive(item)}
                            className="text-text-muted hover:text-brand p-1"
                            aria-label={`Archive ${item.name}`}
                          >
                            📦
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(item.name, 'active')}
                            className="text-text-muted hover:text-red-600 p-1"
                            aria-label={`Delete ${item.name}`}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={addEmoji}
              onChange={(e) => setAddEmoji(e.target.value.slice(0, 2))}
              className="w-10 text-center border border-border rounded-lg p-1.5 text-sm"
              placeholder="😀"
              aria-label="Emoji"
              maxLength={2}
            />
            <input
              type="text"
              value={addName}
              onChange={(e) => {
                setAddName(e.target.value);
                setAddError('');
              }}
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Account name"
              aria-label="Name"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!addName.trim()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: 'var(--brand-gradient)' }}
            >
              Add
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
        </div>
      </div>

      {/* Archived Accounts */}
      {archivedAccounts.length > 0 && (
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setArchivedOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-text-muted hover:bg-surface-alt transition-colors"
            aria-expanded={archivedOpen}
          >
            <span>Archived ({archivedAccounts.length})</span>
            <span aria-hidden="true">{archivedOpen ? '▾' : '▸'}</span>
          </button>
          {archivedOpen && (
            <div className="divide-y divide-border border-t border-border">
              {restoreError && (
                <p className="px-5 py-3 text-xs text-red-600">{restoreError}</p>
              )}
              {archivedAccounts.map((item) => (
                <div key={item.name} className="flex items-center gap-3 px-5 py-3 opacity-60">
                  <span className="w-6 text-center text-sm">{item.emoji ?? ''}</span>
                  <span className="flex-1 text-sm text-text">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
                    aria-label={`Restore ${item.name}`}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(item.name, 'archived')}
                    className="text-text-muted hover:text-red-600 p-1"
                    aria-label={`Delete ${item.name}`}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rename modal */}
      {renameModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-modal-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="rename-modal-title" className="text-base font-semibold text-text">
              Update transactions?
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Do you want to update all existing transactions from{' '}
              <strong>"{renameModal.oldName}"</strong> to{' '}
              <strong>"{renameModal.newName}"</strong>?
            </p>
            <p className="text-xs text-text-muted italic">
              Choosing No will keep old transactions linked to "{renameModal.oldName}".
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text"
              >
                No, keep as-is
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkRename(uid, renameModal.oldName, renameModal.newName);
                  setRenameModal(null);
                }}
                className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
                style={{ background: 'var(--brand-gradient)' }}
              >
                Yes, update all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="delete-dialog-title" className="text-base font-semibold text-text">
              Delete "{deleteDialog.name}"?
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              This account will be removed. Transactions using "{deleteDialog.name}" will{' '}
              <strong>not</strong> be changed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/components/settings/AccountsTab.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm run test
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/AccountsTab.tsx src/components/settings/AccountsTab.test.tsx
git commit -m "feat: add AccountsTab component with archive, delete, and rename-with-transaction-update"
```

---

## Task 4: Wire up `AccountsTab` in `Settings.tsx`

**Files:**
- Modify: `src/routes/Settings.tsx`

- [ ] **Step 1: Update `Settings.tsx`**

Replace the current accounts tab import and rendering. Here is the full updated file:

```tsx
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENTS,
  DEFAULT_SUBCATEGORIES,
} from '../lib/defaultPreferences';
import type { BudgetData, Currency } from '../firestore/types';
import AccountsTab from '../components/settings/AccountsTab';
import BudgetDataTab from '../components/settings/BudgetDataTab';
import SubcategoriesTab from '../components/settings/SubcategoriesTab';
import CurrencyTab from '../components/settings/CurrencyTab';
import DefaultsTab from '../components/settings/DefaultsTab';
import AppearanceTab from '../components/settings/AppearanceTab';
import PlannerSettings from '../components/settings/PlannerSettings';

const TABS = [
  { key: 'accounts', label: 'Accounts' },
  { key: 'categories', label: 'Categories' },
  { key: 'subcategories', label: 'Subcategories' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'payments', label: 'Payments' },
  { key: 'currency', label: 'Currency' },
  { key: 'defaults', label: 'Defaults' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'planners', label: 'Budget Planners' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function Settings() {
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'accounts') as TabKey;
  const { preference, loading, error } = usePreferenceContext();
  const { mutate } = useUpdatePreference(uid);

  function setTab(key: TabKey) {
    setSearchParams({ tab: key });
  }

  function saveList(
    field: 'accounts' | 'categories' | 'vendors' | 'payments',
    items: BudgetData[],
  ): Promise<void> {
    mutate({ [field]: items });
    return Promise.resolve();
  }

  function saveArchivedAccounts(items: BudgetData[]): void {
    mutate({ archivedAccounts: items });
  }

  function saveSubCategories(items: BudgetData[]): Promise<void> {
    mutate({ subCategories: items });
    return Promise.resolve();
  }

  function saveCurrency(currency: Currency): Promise<void> {
    mutate({ default_currency: currency });
    return Promise.resolve();
  }

  function saveBookmarks(codes: string[]): Promise<void> {
    mutate({ frequent_currencies: codes });
    return Promise.resolve();
  }

  function saveDefaults(partial: Record<string, string>): Promise<void> {
    const current = preference?.defaultEntries ?? {};
    mutate({ default_entries: { ...current, ...partial } });
    return Promise.resolve();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (error || !preference) {
    return (
      <div
        className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700"
        role="alert"
      >
        Couldn't load preferences.{' '}
        <button className="underline ml-1" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center rounded-lg border border-border bg-surface-alt p-0.5 gap-0.5 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === key ? 'text-white shadow-sm' : 'text-text-muted hover:text-text',
              ].join(' ')}
              style={activeTab === key ? { background: 'var(--brand-gradient)' } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'accounts' && (
          <AccountsTab
            accounts={preference.accounts}
            archivedAccounts={preference.archivedAccounts}
            defaultItems={DEFAULT_ACCOUNTS}
            onSaveActive={(items) => saveList('accounts', items)}
            onSaveArchived={saveArchivedAccounts}
            uid={uid}
          />
        )}
        {activeTab === 'categories' && (
          <BudgetDataTab
            itemType="category"
            allItems={preference.categories}
            defaultItems={DEFAULT_CATEGORIES}
            onSave={(items) => saveList('categories', items)}
            saving={false}
          />
        )}
        {activeTab === 'subcategories' && (
          <SubcategoriesTab
            allItems={preference.subCategories}
            defaultItems={DEFAULT_SUBCATEGORIES}
            categories={preference.categories}
            onSave={saveSubCategories}
            saving={false}
          />
        )}
        {activeTab === 'vendors' && (
          <BudgetDataTab
            itemType="vendor"
            allItems={preference.vendors}
            defaultItems={[]}
            onSave={(items) => saveList('vendors', items)}
            saving={false}
          />
        )}
        {activeTab === 'payments' && (
          <BudgetDataTab
            itemType="payment"
            allItems={preference.payments}
            defaultItems={DEFAULT_PAYMENTS}
            onSave={(items) => saveList('payments', items)}
            saving={false}
          />
        )}
        {activeTab === 'currency' && (
          <CurrencyTab
            defaultCurrency={preference.defaultCurrency}
            bookmarkedCurrencies={preference.bookmarkedCurrencies}
            onSaveCurrency={saveCurrency}
            onSaveBookmarks={saveBookmarks}
            saving={false}
          />
        )}
        {activeTab === 'defaults' && (
          <DefaultsTab
            accounts={preference.accounts}
            categories={preference.categories}
            payments={preference.payments}
            subCategories={preference.subCategories}
            defaultEntries={preference.defaultEntries}
            onSave={saveDefaults}
            saving={false}
          />
        )}
        {activeTab === 'appearance' && <AppearanceTab />}
        {activeTab === 'planners' && <PlannerSettings uid={uid} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Settings.tsx
git commit -m "feat: wire up AccountsTab in Settings — accounts tab now supports archive, delete, and rename-with-transaction-update"
```

---

## Done

After all 4 tasks are complete, the Accounts tab will:

- Show all active accounts (defaults ⭐ + user accounts) in a single Active Accounts card
- Allow editing name/emoji on any account; if the name changes, prompt to update transactions
- Allow archiving and deleting user accounts (with confirmation for delete)
- Show an Archived section (hidden when empty) where accounts can be restored or permanently deleted
- Exclude archived accounts from all transaction form dropdowns automatically (zero consumer changes required)
