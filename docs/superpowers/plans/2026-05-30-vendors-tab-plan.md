# Vendors Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic `BudgetDataTab` vendor usage with a dedicated `VendorsTab` that lists all vendors — both from `preference.vendors` and derived from transaction history — with rename-then-bulk-update-transactions behaviour mirroring `AccountsTab`.

**Architecture:** Two new hooks (`useBulkRenameVendor`, `useAllTransactionVendors`) + one new component (`VendorsTab`). `Settings.tsx` swaps the `BudgetDataTab` vendor block for `VendorsTab`. `BudgetDataTab` is unchanged.

**Tech Stack:** React, TypeScript strict, Vitest + React Testing Library, Firebase Firestore (web SDK v9 modular), Tailwind CSS v4.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useBulkRenameVendor.ts` | Batch-rename `vendor` field on matching transactions |
| Create | `src/hooks/useBulkRenameVendor.test.ts` | Tests for above |
| Create | `src/hooks/useAllTransactionVendors.ts` | Fetch all transactions, return `Set<string>` of unique vendor names |
| Create | `src/hooks/useAllTransactionVendors.test.ts` | Tests for above |
| Create | `src/components/settings/VendorsTab.tsx` | Full vendor management UI (two sections, rename modal, delete dialog) |
| Create | `src/components/settings/VendorsTab.test.tsx` | Smoke tests for above |
| Modify | `src/routes/Settings.tsx` | Swap `BudgetDataTab` vendor block → `VendorsTab` |

---

## Task 1: `useBulkRenameVendor` hook

**Files:**
- Create: `src/hooks/useBulkRenameVendor.ts`
- Create: `src/hooks/useBulkRenameVendor.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useBulkRenameVendor.test.ts`:

```ts
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
import { useBulkRenameVendor } from './useBulkRenameVendor';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncStatusProvider>{children}</SyncStatusProvider>
);

function makeSnap(count: number) {
  return {
    docs: Array.from({ length: count }, (_, i) => ({ ref: `ref-${i}` })),
  };
}

describe('useBulkRenameVendor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writeBatch).mockReturnValue(mockBatch as never);
    mockCommit.mockResolvedValue(undefined);
  });

  it('calls getDocs with correct collection and query', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(0) as never);
    const { result } = renderHook(() => useBulkRenameVendor(), { wrapper });
    result.current.mutate('uid-1', 'Starbucks', 'Starbucks Coffee');
    await waitFor(() => expect(getDocs).toHaveBeenCalledWith('query-ref'));
  });

  it('updates all docs in a single batch when count ≤ 500', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(3) as never);
    const { result } = renderHook(() => useBulkRenameVendor(), { wrapper });
    result.current.mutate('uid-1', 'Starbucks', 'Starbucks Coffee');
    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenCalledWith('ref-0', { vendor: 'Starbucks Coffee' });
  });

  it('splits into two batches when doc count is 501', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(501) as never);
    const { result } = renderHook(() => useBulkRenameVendor(), { wrapper });
    result.current.mutate('uid-1', 'Old', 'New');
    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(2));
    expect(writeBatch).toHaveBeenCalledTimes(2);
  });

  it('does not call writeBatch when no matching transactions exist', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeSnap(0) as never);
    const { result } = renderHook(() => useBulkRenameVendor(), { wrapper });
    result.current.mutate('uid-1', 'Old', 'New');
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    expect(mockCommit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- useBulkRenameVendor
```

Expected: FAIL — `Cannot find module './useBulkRenameVendor'`

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useBulkRenameVendor.ts`:

```ts
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useBulkRenameVendor() {
  const { notifyWrite } = useSyncStatus();

  function mutate(uid: string, oldName: string, newName: string): void {
    notifyWrite();
    void (async () => {
      const col = collection(db, 'transactions');
      const q = query(col, where('user_id', '==', uid), where('vendor', '==', oldName));
      const snap = await getDocs(q);
      const groups = chunk(snap.docs, 500);
      await Promise.all(
        groups.map((group) => {
          const batch = writeBatch(db);
          group.forEach((d) => batch.update(d.ref, { vendor: newName }));
          return batch.commit();
        }),
      );
    })();
  }

  return { mutate };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- useBulkRenameVendor
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBulkRenameVendor.ts src/hooks/useBulkRenameVendor.test.ts
git commit -m "feat: add useBulkRenameVendor hook"
```

---

## Task 2: `useAllTransactionVendors` hook

**Files:**
- Create: `src/hooks/useAllTransactionVendors.ts`
- Create: `src/hooks/useAllTransactionVendors.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useAllTransactionVendors.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockUnsub = vi.fn();
let capturedCallback: ((snap: unknown) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  onSnapshot: vi.fn((_q, cb, _errCb) => {
    capturedCallback = cb as (snap: unknown) => void;
    return mockUnsub;
  }),
}));

import { useAllTransactionVendors } from './useAllTransactionVendors';

function makeSnap(vendors: string[]) {
  return {
    docs: vendors.map((vendor, i) => ({
      id: `tx${i}`,
      data: () => ({ vendor }),
    })),
  };
}

describe('useAllTransactionVendors', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedCallback = null;
    const { onSnapshot } = vi.mocked(await import('firebase/firestore'));
    onSnapshot.mockImplementation((_q, cb, _errCb) => {
      capturedCallback = cb as (snap: unknown) => void;
      return mockUnsub;
    });
  });

  it('starts with loading=true and empty set', () => {
    const { result } = renderHook(() => useAllTransactionVendors('u1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.vendorNames.size).toBe(0);
  });

  it('returns unique non-empty vendor names after snapshot', async () => {
    const { result } = renderHook(() => useAllTransactionVendors('u1'));
    act(() => {
      capturedCallback!(makeSnap(['Starbucks', 'Zepto', 'Starbucks', '']));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.vendorNames).toEqual(new Set(['Starbucks', 'Zepto']));
  });

  it('excludes whitespace-only vendor strings', async () => {
    const { result } = renderHook(() => useAllTransactionVendors('u1'));
    act(() => {
      capturedCallback!(makeSnap(['  ', 'Zepto']));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.vendorNames).toEqual(new Set(['Zepto']));
  });

  it('returns empty set and loading=false when uid is empty', () => {
    const { result } = renderHook(() => useAllTransactionVendors(''));
    expect(result.current.loading).toBe(false);
    expect(result.current.vendorNames.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- useAllTransactionVendors
```

Expected: FAIL — `Cannot find module './useAllTransactionVendors'`

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useAllTransactionVendors.ts`:

```ts
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/db';

interface UseAllTransactionVendorsResult {
  vendorNames: Set<string>;
  loading: boolean;
}

export function useAllTransactionVendors(uid: string): UseAllTransactionVendorsResult {
  const [vendorNames, setVendorNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const col = collection(db, 'transactions');
    const q = query(col, where('user_id', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const names = new Set<string>();
        snap.docs.forEach((d) => {
          const v = (d.data()['vendor'] as string | undefined)?.trim() ?? '';
          if (v) names.add(v);
        });
        setVendorNames(names);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [uid]);

  return { vendorNames, loading };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- useAllTransactionVendors
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAllTransactionVendors.ts src/hooks/useAllTransactionVendors.test.ts
git commit -m "feat: add useAllTransactionVendors hook"
```

---

## Task 3: `VendorsTab` component

**Files:**
- Create: `src/components/settings/VendorsTab.tsx`
- Create: `src/components/settings/VendorsTab.test.tsx`

- [ ] **Step 1: Write the failing smoke tests**

Create `src/components/settings/VendorsTab.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BudgetData } from '../../firestore/types';

const mockBulkRenameVendor = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useBulkRenameVendor', () => ({
  useBulkRenameVendor: () => ({ mutate: mockBulkRenameVendor }),
}));

const mockVendorNames = vi.hoisted(() => ({ value: new Set<string>(), loading: false }));
vi.mock('../../hooks/useAllTransactionVendors', () => ({
  useAllTransactionVendors: () => ({
    vendorNames: mockVendorNames.value,
    loading: mockVendorNames.loading,
  }),
}));

import VendorsTab from './VendorsTab';

const saved: BudgetData = { name: 'Starbucks', emoji: '☕', type: 'vendor', parent: null };
const txOnly = 'Zepto';

function renderTab(overrides: Partial<React.ComponentProps<typeof VendorsTab>> = {}) {
  return render(
    <VendorsTab vendors={[saved]} uid="u1" onSave={vi.fn()} {...overrides} />,
  );
}

describe('VendorsTab — rendering', () => {
  beforeEach(() => {
    mockBulkRenameVendor.mockReset();
    mockVendorNames.value = new Set([saved.name, txOnly]);
    mockVendorNames.loading = false;
  });

  it('renders "Saved Vendors" heading and saved vendor name', () => {
    renderTab();
    expect(screen.getByText(/saved vendors/i)).toBeInTheDocument();
    expect(screen.getByText('Starbucks')).toBeInTheDocument();
  });

  it('"From Transactions" section is collapsed by default', () => {
    renderTab();
    expect(screen.getByText(/from transactions/i)).toBeInTheDocument();
    expect(screen.queryByText(txOnly)).not.toBeInTheDocument();
  });

  it('expands "From Transactions" on click and shows transaction-only vendors', async () => {
    renderTab();
    await userEvent.click(screen.getByText(/from transactions/i));
    expect(screen.getByText(txOnly)).toBeInTheDocument();
  });

  it('does not show saved vendor in "From Transactions" section', async () => {
    renderTab();
    await userEvent.click(screen.getByText(/from transactions/i));
    const allStarbucks = screen.getAllByText('Starbucks');
    // Only appears once (in saved section), not duplicated in from-transactions
    expect(allStarbucks).toHaveLength(1);
  });
});

describe('VendorsTab — add', () => {
  beforeEach(() => {
    mockVendorNames.value = new Set([saved.name]);
    mockVendorNames.loading = false;
  });

  it('blocks adding a duplicate name and shows error', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.type(screen.getByLabelText(/new vendor name/i), 'Starbucks');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText(/"Starbucks" already exists/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with new vendor appended on valid add', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.type(screen.getByLabelText(/new vendor name/i), 'Zepto');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(onSave).toHaveBeenCalledWith([
      saved,
      expect.objectContaining({ name: 'Zepto', type: 'vendor' }),
    ]);
  });
});

describe('VendorsTab — rename modal', () => {
  beforeEach(() => {
    mockBulkRenameVendor.mockReset();
    mockVendorNames.value = new Set([saved.name]);
    mockVendorNames.loading = false;
  });

  it('opens rename modal when saved vendor name changes', async () => {
    renderTab({ onSave: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit Starbucks'));
    const nameInput = screen.getByDisplayValue('Starbucks');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Starbucks Coffee');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByRole('dialog', { name: /update transactions/i })).toBeInTheDocument();
  });

  it('calls bulkRenameVendor with correct args on "Yes, update all"', async () => {
    renderTab({ onSave: vi.fn(), uid: 'u1' });
    await userEvent.click(screen.getByLabelText('Edit Starbucks'));
    const nameInput = screen.getByDisplayValue('Starbucks');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Starbucks Coffee');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, update all/i }));
    expect(mockBulkRenameVendor).toHaveBeenCalledWith('u1', 'Starbucks', 'Starbucks Coffee');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does NOT call bulkRenameVendor on "No, keep as-is"', async () => {
    renderTab({ onSave: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit Starbucks'));
    const nameInput = screen.getByDisplayValue('Starbucks');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Starbucks Coffee');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await userEvent.click(screen.getByRole('button', { name: /no, keep/i }));
    expect(mockBulkRenameVendor).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does NOT open rename modal when only emoji changes', async () => {
    renderTab({ onSave: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit Starbucks'));
    const emojiInput = screen.getByLabelText('Emoji');
    await userEvent.clear(emojiInput);
    await userEvent.type(emojiInput, '🌟');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('VendorsTab — delete', () => {
  beforeEach(() => {
    mockVendorNames.value = new Set([saved.name]);
    mockVendorNames.loading = false;
  });

  it('shows delete dialog on delete click, dismisses on Cancel', async () => {
    renderTab();
    await userEvent.click(screen.getByLabelText('Delete Starbucks'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onSave without deleted vendor on confirm', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.click(screen.getByLabelText('Delete Starbucks'));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onSave).toHaveBeenCalledWith([]);
  });
});

describe('VendorsTab — save to list', () => {
  beforeEach(() => {
    mockVendorNames.value = new Set([saved.name, txOnly]);
    mockVendorNames.loading = false;
  });

  it('"Save to list" on a transaction-only vendor calls onSave with that vendor appended', async () => {
    const onSave = vi.fn();
    renderTab({ onSave });
    await userEvent.click(screen.getByText(/from transactions/i));
    await userEvent.click(screen.getByLabelText(`Save ${txOnly} to list`));
    expect(onSave).toHaveBeenCalledWith([
      saved,
      expect.objectContaining({ name: txOnly, type: 'vendor', emoji: null }),
    ]);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- VendorsTab
```

Expected: FAIL — `Cannot find module './VendorsTab'`

- [ ] **Step 3: Write the implementation**

Create `src/components/settings/VendorsTab.tsx`:

```tsx
import { useState } from 'react';
import type { BudgetData } from '../../firestore/types';
import { useBulkRenameVendor } from '../../hooks/useBulkRenameVendor';
import { useAllTransactionVendors } from '../../hooks/useAllTransactionVendors';

interface VendorsTabProps {
  vendors: BudgetData[];
  uid: string;
  onSave: (items: BudgetData[]) => void;
}

function isDuplicate(name: string, allNames: Set<string>, excludeName?: string): boolean {
  const lower = name.trim().toLowerCase();
  if (excludeName && lower === excludeName.toLowerCase()) return false;
  return allNames.has(name.trim()) ||
    [...allNames].some((n) => n.toLowerCase() === lower);
}

export default function VendorsTab({ vendors, uid, onSave }: VendorsTabProps) {
  const { mutate: bulkRenameVendor } = useBulkRenameVendor();
  const { vendorNames, loading: txLoading } = useAllTransactionVendors(uid);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editError, setEditError] = useState('');
  const [addName, setAddName] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addError, setAddError] = useState('');
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [fromTxOpen, setFromTxOpen] = useState(false);

  const allVendorNames: Set<string> = new Set([
    ...vendors.map((v) => v.name),
    ...vendorNames,
  ]);

  const txOnlyVendors = [...vendorNames].filter(
    (name) => !vendors.some((v) => v.name.toLowerCase() === name.toLowerCase()),
  );

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
    const name = editName.trim();
    if (!name) return;
    if (isDuplicate(name, allVendorNames, oldName)) {
      setEditError(`"${name}" already exists.`);
      return;
    }
    const updated = vendors.map((item) =>
      item.name === oldName
        ? { ...item, name, emoji: editEmoji.slice(0, 2) || item.emoji }
        : item,
    );
    onSave(updated);
    if (name !== oldName) {
      setRenameModal({ oldName, newName: name });
    }
    setEditingName(null);
    setEditError('');
  }

  function handleAdd() {
    const name = addName.trim();
    if (!name) return;
    if (isDuplicate(name, allVendorNames)) {
      setAddError(`"${name}" already exists.`);
      return;
    }
    onSave([...vendors, { name, emoji: addEmoji.slice(0, 2) || null, type: 'vendor', parent: null }]);
    setAddName('');
    setAddEmoji('');
    setAddError('');
  }

  function handleDelete(name: string) {
    onSave(vendors.filter((v) => v.name !== name));
    setDeleteDialog(null);
  }

  function handleSaveToList(name: string) {
    onSave([...vendors, { name, emoji: null, type: 'vendor', parent: null }]);
  }

  function handleTxRename(oldName: string, newName: string) {
    if (isDuplicate(newName, allVendorNames, oldName)) {
      return `"${newName}" already exists.`;
    }
    setRenameModal({ oldName, newName });
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Saved Vendors */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
            Saved Vendors
          </h3>
        </div>

        {vendors.length > 0 && (
          <div className="divide-y divide-border">
            {vendors.map((item) => (
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
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
                        className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
                        aria-label="Name"
                      />
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
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-text-muted hover:text-brand p-1"
                      aria-label={`Edit ${item.name}`}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDialog(item.name)}
                      className="text-text-muted hover:text-red-600 p-1"
                      aria-label={`Delete ${item.name}`}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))}
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
              aria-label="New vendor emoji"
              maxLength={2}
            />
            <input
              type="text"
              value={addName}
              onChange={(e) => { setAddName(e.target.value); setAddError(''); }}
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Vendor name"
              aria-label="New vendor name"
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

      {/* From Transactions */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setFromTxOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-text-muted hover:bg-surface-alt transition-colors"
          aria-expanded={fromTxOpen}
        >
          <span>From Transactions ({txLoading ? '…' : txOnlyVendors.length})</span>
          <span aria-hidden="true">{fromTxOpen ? '▾' : '▸'}</span>
        </button>
        {fromTxOpen && (
          <div className="divide-y divide-border border-t border-border">
            {txLoading && (
              <p className="px-5 py-3 text-sm text-text-muted">Loading…</p>
            )}
            {!txLoading && txOnlyVendors.length === 0 && (
              <p className="px-5 py-3 text-sm text-text-muted">
                All transaction vendors are already saved.
              </p>
            )}
            {!txLoading && txOnlyVendors.map((name) => (
              <TxVendorRow
                key={name}
                name={name}
                allVendorNames={allVendorNames}
                onSaveToList={handleSaveToList}
                onRename={handleTxRename}
                onRenameConfirm={(oldName, newName) => setRenameModal({ oldName, newName })}
              />
            ))}
          </div>
        )}
      </div>

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
                  bulkRenameVendor(uid, renameModal.oldName, renameModal.newName);
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

      {/* Delete dialog */}
      {deleteDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="delete-dialog-title" className="text-base font-semibold text-text">
              Delete "{deleteDialog}"?
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              This vendor will be removed. Transactions using "{deleteDialog}" will{' '}
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
                onClick={() => handleDelete(deleteDialog)}
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

// ── TxVendorRow ──────────────────────────────────────────────────────────────

interface TxVendorRowProps {
  name: string;
  allVendorNames: Set<string>;
  onSaveToList: (name: string) => void;
  onRename: (oldName: string, newName: string) => string | null;
  onRenameConfirm: (oldName: string, newName: string) => void;
}

function TxVendorRow({ name, allVendorNames, onSaveToList, onRename, onRenameConfirm }: TxVendorRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editError, setEditError] = useState('');

  function handleSave() {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (trimmed === name) { setEditing(false); return; }
    const err = onRename(name, trimmed);
    if (err) { setEditError(err); return; }
    onRenameConfirm(name, trimmed);
    setEditing(false);
    setEditError('');
  }

  if (editing) {
    return (
      <div className="px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
            aria-label="Name"
          />
          <button
            type="button"
            onClick={handleSave}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ background: 'var(--brand-gradient)' }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setEditName(name); setEditError(''); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
        {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="w-6" />
      <span className="flex-1 text-sm text-text">{name}</span>
      <button
        type="button"
        onClick={() => { setEditing(true); setEditName(name); }}
        className="text-text-muted hover:text-brand p-1"
        aria-label={`Edit ${name}`}
      >
        ✏️
      </button>
      <button
        type="button"
        onClick={() => onSaveToList(name)}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
        aria-label={`Save ${name} to list`}
      >
        Save to list
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- VendorsTab
```

Expected: PASS (all smoke tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/VendorsTab.tsx src/components/settings/VendorsTab.test.tsx
git commit -m "feat: add VendorsTab component"
```

---

## Task 4: Wire `VendorsTab` into `Settings.tsx`

**Files:**
- Modify: `src/routes/Settings.tsx`

- [ ] **Step 1: Update the import and the vendor tab block**

In `src/routes/Settings.tsx`, make two changes:

**Add import** (after the existing `AccountsTab` import line):

```ts
import VendorsTab from '../components/settings/VendorsTab';
```

**Replace** the vendor `activeTab` block (lines 153–161):

```tsx
{activeTab === 'vendors' && (
  <BudgetDataTab
    itemType="vendor"
    allItems={preference.vendors}
    defaultItems={[]}
    onSave={(items) => saveList('vendors', items)}
    saving={false}
  />
)}
```

**With:**

```tsx
{activeTab === 'vendors' && (
  <VendorsTab
    vendors={preference.vendors}
    uid={uid}
    onSave={(items) => saveList('vendors', items)}
  />
)}
```

- [ ] **Step 2: Run typecheck and full test suite**

```bash
npm run typecheck && npm test
```

Expected: no type errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Settings.tsx
git commit -m "feat: wire VendorsTab into Settings — replaces BudgetDataTab for vendors"
```

---

## Task 5: Verify in browser

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173`, sign in, navigate to Settings → Vendors tab.

- [ ] **Step 2: Smoke-check all paths**

| Scenario | Expected |
|----------|----------|
| Open Vendors tab | "Saved Vendors" section shows preference vendors with emoji, edit, delete buttons |
| "From Transactions" section | Collapsed by default, shows count; expands on click; shows vendor names from transactions not in saved list |
| Add a new vendor | Name + optional emoji → appended to saved list |
| Add duplicate name | Inline error shown, onSave not called |
| Edit saved vendor (emoji only) | Saves immediately, no rename modal |
| Edit saved vendor (name change) | Rename modal appears — "No" dismisses, "Yes" triggers bulk rename |
| Delete saved vendor | Delete dialog → confirm removes from list, cancel dismisses |
| "Save to list" on tx-only vendor | Vendor moves from "From Transactions" to "Saved Vendors" |

- [ ] **Step 3: Commit any fixes found during manual testing**

```bash
git add -p
git commit -m "fix: <describe what was fixed>"
```

---

## Self-Review

**Spec coverage:**
- ✅ List all vendors (saved + from transactions)
- ✅ Two sections: "Saved Vendors" + "From Transactions" (collapsible, collapsed by default)
- ✅ Duplicate check on add and rename (against union of both sources)
- ✅ Rename modal → bulk update transactions via `useBulkRenameVendor`
- ✅ "Save to list" on transaction-only vendors
- ✅ Delete saved vendor (with confirmation dialog)
- ✅ No archive
- ✅ `BudgetDataTab` unchanged
- ✅ Firestore rules and iOS data model untouched
- ✅ Tests for both hooks and the component

**Placeholder scan:** No TBDs. All code blocks complete.

**Type consistency:**
- `VendorsTabProps.onSave` receives `BudgetData[]` — matches `saveList('vendors', items)` signature in `Settings.tsx`
- `useBulkRenameVendor().mutate(uid, oldName, newName)` — called with `(uid, renameModal.oldName, renameModal.newName)` ✅
- `useAllTransactionVendors(uid)` returns `{ vendorNames: Set<string>; loading: boolean }` — consumed as `vendorNames`, `loading: txLoading` ✅
- `TxVendorRow` props all satisfied at call site ✅
