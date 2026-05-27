# Stage 4: Local-First Sync & Status Indicator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fetch-on-mount / await-on-write Firestore pattern with Firebase offline persistence, onSnapshot real-time listeners, and fire-and-forget mutations — giving instant UI updates with an always-visible three-state sync indicator in the nav bar.

**Architecture:** Enable `persistentLocalCache` (IndexedDB) in `db.ts`; swap all `getDocs`/`getDoc` calls for `onSnapshot` listeners; make all write hooks fire-and-forget with `void`; add `SyncStatusContext` that reads `hasPendingWrites` from snapshot metadata and a `lastWriteAt` ref to drive a three-state pill in the Sidebar.

**Tech Stack:** React, TypeScript, Firebase JS SDK v10 (`initializeFirestore`, `persistentLocalCache`, `onSnapshot`), Vitest, React Testing Library.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/firebase/db.ts` | Modify | Enable IndexedDB offline cache |
| `src/context/SyncStatusContext.tsx` | **Create** | Three-state machine (`synced/syncing/pending`) + `SyncStatusProvider` + `useSyncStatus` |
| `src/context/SyncStatusContext.test.tsx` | **Create** | Unit tests for state transitions |
| `src/hooks/useTransactions.ts` | Modify | Replace `getDocs` + tick with `onSnapshot`; expose `hasPendingWrites` |
| `src/hooks/useTransactions.test.ts` | Modify | Rewrite to mock `onSnapshot` |
| `src/hooks/usePreferences.ts` | Modify | Replace `getDoc` + tick with `onSnapshot`; expose `hasPendingWrites` |
| `src/hooks/usePreferences.test.ts` | Modify | Rewrite to mock `onSnapshot` |
| `src/hooks/useMutateTransaction.ts` | Modify | Remove `await`; call `notifyWrite()`; remove loading/error |
| `src/hooks/useMutateTransaction.test.ts` | Modify | Update for synchronous API |
| `src/hooks/useUpdatePreference.ts` | Modify | Remove `await`; call `notifyWrite()`; remove loading/error |
| `src/hooks/useUpdatePreference.test.ts` | Modify | Update for synchronous API |
| `src/context/TransactionContext.tsx` | Modify | Add `hasPendingWrites`; remove `refetch` |
| `src/context/TransactionProvider.tsx` | Modify | Call `notifySnapshot`; pass `hasPendingWrites` |
| `src/context/PreferenceContext.tsx` | Modify | Remove `refetch` from value type |
| `src/context/PreferenceProvider.tsx` | Modify | Call `notifySnapshot` |
| `src/App.tsx` | Modify | Add `SyncStatusProvider` around `PreferenceProvider` + `TransactionProvider` |
| `src/components/layout/SyncPill.tsx` | **Create** | Inline nav pill component |
| `src/components/layout/SyncPill.test.tsx` | **Create** | Unit tests for each state |
| `src/components/layout/Sidebar.tsx` | Modify | Add `<SyncPill />` (desktop + mobile) |
| `src/components/transactions/AddTransactionDrawer.tsx` | Modify | Make `onSaved` prop optional |
| `src/routes/AppShell.tsx` | Modify | Remove `refetch` from context destructuring |
| `src/routes/Dashboard.tsx` | Modify | Remove all `refetch()` calls |
| `src/routes/TransactionList.tsx` | Modify | Remove all `refetch()` calls |
| `src/routes/TransactionList.test.tsx` | Modify | Remove `refetch` from mock |
| `src/routes/TransactionForm.tsx` | Modify | Remove mutation loading/error state; sync `handleSubmit` |
| `src/routes/Settings.tsx` | Modify | Remove all `refetch()` calls |
| `src/routes/Settings.test.tsx` | Modify | Remove `refetch` and `loading` from `useUpdatePreference` mock |

---

## Task 1: Enable Firebase Offline Persistence

**Files:**
- Modify: `src/firebase/db.ts`

- [ ] **Step 1: Update `src/firebase/db.ts`**

Replace the entire file content:

```ts
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { app } from './client';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
```

- [ ] **Step 2: Run typecheck to verify**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run tests to verify no regressions**

```bash
npm run test
```

Expected: all existing tests pass (every test mocks `../firebase/db` so the real `db.ts` is never executed during tests).

- [ ] **Step 4: Commit**

```bash
git add src/firebase/db.ts
git commit -m "feat: enable Firestore offline persistence (IndexedDB cache)"
```

---

## Task 2: SyncStatusContext

**Files:**
- Create: `src/context/SyncStatusContext.tsx`
- Create: `src/context/SyncStatusContext.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/context/SyncStatusContext.test.tsx`:

```tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { SyncStatusProvider, useSyncStatus } from './SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncStatusProvider>{children}</SyncStatusProvider>
);

describe('SyncStatusContext', () => {
  afterEach(() => vi.useRealTimers());

  it('starts as synced', () => {
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    expect(result.current.status).toBe('synced');
  });

  it('transitions to syncing immediately after notifyWrite', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    expect(result.current.status).toBe('syncing');
  });

  it('transitions back to synced when notifySnapshot(false) is called', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    act(() => {
      result.current.notifySnapshot(false);
    });
    expect(result.current.status).toBe('synced');
  });

  it('stays syncing while notifySnapshot(true) is called within 3 s', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    act(() => {
      result.current.notifySnapshot(true);
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.status).toBe('syncing');
  });

  it('transitions to pending after 3 s without confirmation', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(result.current.status).toBe('pending');
  });

  it('returns to synced from pending when notifySnapshot(false) arrives', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSyncStatus(), { wrapper });
    act(() => {
      result.current.notifyWrite();
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.status).toBe('pending');
    act(() => {
      result.current.notifySnapshot(false);
    });
    expect(result.current.status).toBe('synced');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- SyncStatusContext
```

Expected: FAIL — `Cannot find module './SyncStatusContext'`.

- [ ] **Step 3: Create `src/context/SyncStatusContext.tsx`**

```tsx
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type SyncStatus = 'synced' | 'syncing' | 'pending';

interface SyncStatusContextValue {
  status: SyncStatus;
  notifyWrite: () => void;
  notifySnapshot: (hasPendingWrites: boolean) => void;
}

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [hasPending, setHasPending] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('synced');
  const lastWriteAt = useRef<number>(0);

  const notifyWrite = useCallback(() => {
    lastWriteAt.current = Date.now();
    setHasPending(true);
  }, []);

  const notifySnapshot = useCallback((pendingWrites: boolean) => {
    if (!pendingWrites) setHasPending(false);
  }, []);

  useEffect(() => {
    if (!hasPending) {
      setStatus('synced');
      return;
    }

    const evaluate = () => {
      const age = Date.now() - lastWriteAt.current;
      setStatus(age <= 3000 ? 'syncing' : 'pending');
    };

    evaluate();
    const id = setInterval(evaluate, 500);
    return () => clearInterval(id);
  }, [hasPending]);

  return (
    <SyncStatusContext.Provider value={{ status, notifyWrite, notifySnapshot }}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextValue {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) throw new Error('useSyncStatus must be used within SyncStatusProvider');
  return ctx;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- SyncStatusContext
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context/SyncStatusContext.tsx src/context/SyncStatusContext.test.tsx
git commit -m "feat: add SyncStatusContext with three-state sync machine"
```

---

## Task 3: useTransactions — Replace getDocs with onSnapshot

**Files:**
- Modify: `src/hooks/useTransactions.ts`
- Modify: `src/hooks/useTransactions.test.ts`

- [ ] **Step 1: Replace `src/hooks/useTransactions.test.ts`**

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockUnsub = vi.fn();
let capturedCallback: ((snap: unknown) => void) | null = null;
let capturedErrorCallback: ((err: Error) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn(() => 'q'),
  where: vi.fn(() => 'w'),
  orderBy: vi.fn(() => 'o'),
  limit: vi.fn(() => 'l'),
  onSnapshot: vi.fn((_q, _opts, cb, errCb) => {
    capturedCallback = cb as (snap: unknown) => void;
    capturedErrorCallback = errCb as (err: Error) => void;
    return mockUnsub;
  }),
}));

import { onSnapshot } from 'firebase/firestore';
import { useTransactions } from './useTransactions';

function makeSnap(docs: unknown[], hasPendingWrites = false) {
  return { docs, metadata: { hasPendingWrites } };
}

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx1',
    data: () => ({
      user_id: 'u1',
      category: 'Food',
      sub_category: 'Groceries',
      date: { toDate: () => new Date('2026-05-17') },
      account: 'HDFC',
      vendor: 'Zepto',
      payment: 'UPI',
      currency: 'INR',
      notes: 'weekly shop',
      amount: 500,
      icon: '🛒',
      ...overrides,
    }),
  };
}

describe('useTransactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedCallback = null;
    capturedErrorCallback = null;
    vi.mocked(onSnapshot).mockImplementation((_q, _opts, cb, errCb) => {
      capturedCallback = cb as (snap: unknown) => void;
      capturedErrorCallback = errCb as (err: Error) => void;
      return mockUnsub;
    });
  });

  it('returns loading=true and empty data initially', () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('maps sub_category → subCategory and date Timestamp → Date on snapshot', async () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    act(() => { capturedCallback!(makeSnap([makeDoc()])); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const tx = result.current.data[0]!;
    expect(tx.subCategory).toBe('Groceries');
    expect(tx.date).toBeInstanceOf(Date);
    expect(tx.id).toBe('tx1');
  });

  it('exposes hasPendingWrites: true from snapshot metadata', async () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    act(() => { capturedCallback!(makeSnap([makeDoc()], true)); });
    await waitFor(() => expect(result.current.hasPendingWrites).toBe(true));
  });

  it('exposes hasPendingWrites: false when snapshot confirms', async () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    act(() => { capturedCallback!(makeSnap([makeDoc()], true)); });
    act(() => { capturedCallback!(makeSnap([makeDoc()], false)); });
    await waitFor(() => expect(result.current.hasPendingWrites).toBe(false));
  });

  it('sets error when onSnapshot calls the error callback', async () => {
    const { result } = renderHook(() => useTransactions({ uid: 'u1' }));
    act(() => { capturedErrorCallback!(new Error('quota exceeded')); });
    await waitFor(() => expect(result.current.error?.message).toBe('quota exceeded'));
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes the listener on unmount', () => {
    const { unmount } = renderHook(() => useTransactions({ uid: 'u1' }));
    unmount();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when uid is empty', () => {
    renderHook(() => useTransactions({ uid: '' }));
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- useTransactions
```

Expected: FAIL — tests call `onSnapshot` but the hook still calls `getDocs`.

- [ ] **Step 3: Replace `src/hooks/useTransactions.ts`**

```ts
import { useEffect, useReducer } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/db';
import type { Transaction } from '../firestore/types';

export interface TransactionFilter {
  uid: string;
  start?: Date;
  end?: Date;
  limit?: number;
}

interface UseTransactionsResult {
  data: Transaction[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
}

type State = {
  data: Transaction[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
};

type Action =
  | { type: 'fetch' }
  | { type: 'success'; data: Transaction[]; hasPendingWrites: boolean }
  | { type: 'error'; error: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch':
      return { ...state, loading: true, error: null };
    case 'success':
      return {
        ...state,
        loading: false,
        data: action.data,
        hasPendingWrites: action.hasPendingWrites,
      };
    case 'error':
      return { ...state, loading: false, error: action.error };
  }
}

function docToTransaction(id: string, raw: DocumentData): Transaction {
  return {
    id,
    user_id: raw['user_id'] as string,
    category: raw['category'] as string,
    subCategory: raw['sub_category'] as string,
    date: (raw['date'] as { toDate(): Date }).toDate(),
    account: raw['account'] as string,
    vendor: raw['vendor'] as string,
    payment: raw['payment'] as string,
    currency: raw['currency'] as string,
    notes: (raw['notes'] as string) ?? '',
    amount: raw['amount'] as number,
    icon: (raw['icon'] as string) ?? '',
  };
}

export function useTransactions(filter: TransactionFilter): UseTransactionsResult {
  const [state, dispatch] = useReducer(reducer, {
    data: [],
    loading: !!filter.uid,
    error: null,
    hasPendingWrites: false,
  });

  useEffect(() => {
    if (!filter.uid) return;
    dispatch({ type: 'fetch' });

    const col = collection(db, 'transactions');
    const constraints: QueryConstraint[] = [
      where('user_id', '==', filter.uid),
      orderBy('date', 'desc'),
    ];

    if (filter.start) constraints.push(where('date', '>=', filter.start));
    if (filter.end) constraints.push(where('date', '<=', filter.end));
    if (filter.limit) constraints.push(limit(filter.limit));

    const q = query(col, ...constraints);

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        dispatch({
          type: 'success',
          data: snap.docs.map((d) => docToTransaction(d.id, d.data())),
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });
      },
      (err) => dispatch({ type: 'error', error: err }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.uid, filter.start?.getTime(), filter.end?.getTime(), filter.limit]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    hasPendingWrites: state.hasPendingWrites,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- useTransactions
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTransactions.ts src/hooks/useTransactions.test.ts
git commit -m "feat: migrate useTransactions to onSnapshot with hasPendingWrites"
```

---

## Task 4: usePreferences — Replace getDoc with onSnapshot

**Files:**
- Modify: `src/hooks/usePreferences.ts`
- Modify: `src/hooks/usePreferences.test.ts`

- [ ] **Step 1: Replace `src/hooks/usePreferences.test.ts`**

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));

const mockUnsub = vi.fn();
let capturedCallback: ((snap: unknown) => void) | null = null;
let capturedErrorCallback: ((err: Error) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  onSnapshot: vi.fn((_ref, _opts, cb, errCb) => {
    capturedCallback = cb as (snap: unknown) => void;
    capturedErrorCallback = errCb as (err: Error) => void;
    return mockUnsub;
  }),
}));

import { onSnapshot } from 'firebase/firestore';
import { usePreferences } from './usePreferences';

const mockPreferenceData = {
  accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
  categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
  subCategories: [],
  vendors: [],
  payments: [{ name: 'UPI', emoji: null, type: 'payment', parent: null }],
  default_currency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
  frequent_currencies: ['INR', 'USD'],
  default_entries: ['account', 'HDFC'],
};

function makeSnap(data: Record<string, unknown> | null, hasPendingWrites = false, id = 'uid-123') {
  return {
    exists: () => data !== null,
    id,
    data: () => data ?? {},
    metadata: { hasPendingWrites },
  };
}

describe('usePreferences', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capturedCallback = null;
    capturedErrorCallback = null;
    vi.mocked(onSnapshot).mockImplementation((_ref, _opts, cb, errCb) => {
      capturedCallback = cb as (snap: unknown) => void;
      capturedErrorCallback = errCb as (err: Error) => void;
      return mockUnsub;
    });
  });

  it('returns loading=true and data=null initially', () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('returns loading=false and data=null when uid is null (no subscription)', () => {
    const { result } = renderHook(() => usePreferences(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('decodes snake_case fields and returns Preference on snapshot', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(mockPreferenceData)); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.defaultCurrency.code).toBe('INR');
    expect(result.current.data?.bookmarkedCurrencies).toEqual(['INR', 'USD']);
    expect(result.current.data?.defaultEntries).toEqual({ account: 'HDFC' });
    expect(result.current.data?.id).toBe('uid-123');
  });

  it('returns built-in defaults when document does not exist', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(null)); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.categories.length).toBeGreaterThan(0);
    expect(result.current.data?.defaultCurrency.code).toBe('SGD');
  });

  it('exposes hasPendingWrites: true from snapshot metadata', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(mockPreferenceData, true)); });
    await waitFor(() => expect(result.current.hasPendingWrites).toBe(true));
  });

  it('exposes hasPendingWrites: false when snapshot confirms', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedCallback!(makeSnap(mockPreferenceData, true)); });
    act(() => { capturedCallback!(makeSnap(mockPreferenceData, false)); });
    await waitFor(() => expect(result.current.hasPendingWrites).toBe(false));
  });

  it('sets error when onSnapshot calls the error callback', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => { capturedErrorCallback!(new Error('permission denied')); });
    await waitFor(() => expect(result.current.error?.message).toBe('permission denied'));
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => usePreferences('uid-123'));
    unmount();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it('appends unique Firestore entries after defaults without duplicating', async () => {
    const { result } = renderHook(() => usePreferences('uid-123'));
    act(() => {
      capturedCallback!(makeSnap({
        ...mockPreferenceData,
        payments: [
          { name: 'Cash', emoji: '💵', type: 'payment', parent: null },
          { name: 'PayNow', emoji: '💸', type: 'payment', parent: null },
        ],
      }));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const names = result.current.data?.payments.map((p) => p.name) ?? [];
    expect(names.filter((n) => n === 'Cash').length).toBe(1);
    expect(names).toContain('PayNow');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- usePreferences
```

Expected: FAIL — hook still calls `getDoc`, not `onSnapshot`.

- [ ] **Step 3: Replace `src/hooks/usePreferences.ts`**

```ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/db';
import type { BudgetData, Preference } from '../firestore/types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_CURRENCY,
  DEFAULT_ENTRIES,
  DEFAULT_PAYMENTS,
  DEFAULT_SUBCATEGORIES,
} from '../lib/defaultPreferences';

interface UsePreferencesResult {
  data: Preference | null;
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
}

function decodeDefaultEntries(raw: unknown): Record<string, string> {
  if (!Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (let i = 0; i + 1 < raw.length; i += 2) {
    result[raw[i] as string] = raw[i + 1] as string;
  }
  return result;
}

function mergeWithDefaults(defaults: BudgetData[], fromFirestore: BudgetData[]): BudgetData[] {
  const seen = new Set(defaults.map((d) => `${d.name}::${d.parent ?? ''}`));
  const additions = fromFirestore.filter((d) => !seen.has(`${d.name}::${d.parent ?? ''}`));
  return [...defaults, ...additions];
}

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

export function usePreferences(uid: string | null): UsePreferencesResult {
  const [data, setData] = useState<Preference | null>(null);
  const [loading, setLoading] = useState(uid !== null);
  const [error, setError] = useState<Error | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const ref = doc(db, 'preference', uid);

    return onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        setHasPendingWrites(snap.metadata.hasPendingWrites);
        if (snap.exists()) {
          setData(docToPreference(snap.id, snap.data() as Record<string, unknown>));
        } else {
          setData(docToPreference(uid, {}));
        }
        setLoading(false);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [uid]);

  return { data, loading, error, hasPendingWrites };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- usePreferences
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePreferences.ts src/hooks/usePreferences.test.ts
git commit -m "feat: migrate usePreferences to onSnapshot with hasPendingWrites"
```

---

## Task 5: useMutateTransaction — Fire-and-Forget

**Files:**
- Modify: `src/hooks/useMutateTransaction.ts`
- Modify: `src/hooks/useMutateTransaction.test.ts`

- [ ] **Step 1: Replace `src/hooks/useMutateTransaction.test.ts`**

```ts
import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  doc: vi.fn(() => 'doc-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import { setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from './useMutateTransaction';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import type { Transaction } from '../firestore/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncStatusProvider>{children}</SyncStatusProvider>
);

const baseTx: Omit<Transaction, 'id'> = {
  user_id: 'u1',
  category: 'Food',
  subCategory: 'Groceries',
  date: new Date('2026-05-17'),
  account: 'HDFC',
  vendor: 'Zepto',
  payment: 'UPI',
  currency: 'INR',
  notes: '',
  amount: 500,
  icon: '🛒',
};

describe('useAddTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls setDoc with snake_case sub_category and returns uuid synchronously', () => {
    const { result } = renderHook(() => useAddTransaction(), { wrapper });
    const id = result.current.mutate(baseTx);
    expect(id).toMatch(UUID_RE);
    expect(setDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['sub_category']).toBe('Groceries');
    expect(callArgs['subCategory']).toBeUndefined();
    expect(callArgs['id']).toMatch(UUID_RE);
  });

  it('mutate returns the same id that was passed to setDoc', () => {
    const { result } = renderHook(() => useAddTransaction(), { wrapper });
    const id = result.current.mutate(baseTx);
    const callArgs = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(id).toBe(callArgs['id']);
  });
});

describe('useUpdateTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls updateDoc with snake_case fields synchronously', () => {
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });
    result.current.mutate('tx-1', { amount: 999, subCategory: 'Dining' });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(updateDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['amount']).toBe(999);
    expect(callArgs['sub_category']).toBe('Dining');
  });
});

describe('useDeleteTransaction', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls deleteDoc synchronously', () => {
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });
    result.current.mutate('tx-1');
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- useMutateTransaction
```

Expected: FAIL — hooks return `loading`/`error` state and `mutate` is async.

- [ ] **Step 3: Replace `src/hooks/useMutateTransaction.ts`**

```ts
import { collection, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import type { Transaction } from '../firestore/types';

type TxInput = Omit<Transaction, 'id'>;
type TxPatch = Partial<Omit<Transaction, 'id'>>;

function encodeTransaction(id: string, tx: TxInput): Record<string, unknown> {
  return {
    id,
    user_id: tx.user_id,
    category: tx.category,
    sub_category: tx.subCategory,
    date: Timestamp.fromDate(tx.date),
    account: tx.account,
    vendor: tx.vendor,
    payment: tx.payment,
    currency: tx.currency,
    notes: tx.notes,
    amount: tx.amount,
    icon: tx.icon,
  };
}

function encodePatch(patch: TxPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.user_id !== undefined) out['user_id'] = patch.user_id;
  if (patch.category !== undefined) out['category'] = patch.category;
  if (patch.subCategory !== undefined) out['sub_category'] = patch.subCategory;
  if (patch.date !== undefined) out['date'] = Timestamp.fromDate(patch.date);
  if (patch.account !== undefined) out['account'] = patch.account;
  if (patch.vendor !== undefined) out['vendor'] = patch.vendor;
  if (patch.payment !== undefined) out['payment'] = patch.payment;
  if (patch.currency !== undefined) out['currency'] = patch.currency;
  if (patch.notes !== undefined) out['notes'] = patch.notes;
  if (patch.amount !== undefined) out['amount'] = patch.amount;
  if (patch.icon !== undefined) out['icon'] = patch.icon;
  return out;
}

export function useAddTransaction() {
  const { notifyWrite } = useSyncStatus();

  function mutate(tx: TxInput): string {
    const id = crypto.randomUUID();
    notifyWrite();
    void setDoc(doc(collection(db, 'transactions'), id), encodeTransaction(id, tx));
    return id;
  }

  return { mutate };
}

export function useUpdateTransaction() {
  const { notifyWrite } = useSyncStatus();

  function mutate(id: string, patch: TxPatch): void {
    notifyWrite();
    void updateDoc(doc(db, 'transactions', id), encodePatch(patch));
  }

  return { mutate };
}

export function useDeleteTransaction() {
  const { notifyWrite } = useSyncStatus();

  function mutate(id: string): void {
    notifyWrite();
    void deleteDoc(doc(db, 'transactions', id));
  }

  return { mutate };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- useMutateTransaction
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMutateTransaction.ts src/hooks/useMutateTransaction.test.ts
git commit -m "feat: make transaction mutations fire-and-forget with notifyWrite"
```

---

## Task 6: useUpdatePreference — Fire-and-Forget

**Files:**
- Modify: `src/hooks/useUpdatePreference.ts`
- Modify: `src/hooks/useUpdatePreference.test.ts`

- [ ] **Step 1: Replace `src/hooks/useUpdatePreference.test.ts`**

```ts
import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../firebase/db', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'pref-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
}));

import { setDoc } from 'firebase/firestore';
import { useUpdatePreference } from './useUpdatePreference';
import { SyncStatusProvider } from '../context/SyncStatusContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SyncStatusProvider>{children}</SyncStatusProvider>
);

describe('useUpdatePreference', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls setDoc with merge:true synchronously', () => {
    const { result } = renderHook(() => useUpdatePreference('u1'), { wrapper });
    result.current.mutate({ accounts: [] });
    expect(vi.mocked(setDoc)).toHaveBeenCalledWith('pref-ref', { accounts: [] }, { merge: true });
  });

  it('encodes default_entries as alternating flat array', () => {
    const { result } = renderHook(() => useUpdatePreference('u1'), { wrapper });
    result.current.mutate({ default_entries: { account: 'HDFC', category: 'Food' } });
    const callArgs = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, unknown>;
    expect(callArgs['default_entries']).toEqual(['account', 'HDFC', 'category', 'Food']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- useUpdatePreference
```

Expected: FAIL — hook still uses `async mutate` with `loading`/`error` state.

- [ ] **Step 3: Replace `src/hooks/useUpdatePreference.ts`**

```ts
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';
import type { BudgetData, Currency } from '../firestore/types';

export interface FirestorePreferencePartial {
  accounts?: BudgetData[];
  categories?: BudgetData[];
  subCategories?: BudgetData[];
  vendors?: BudgetData[];
  payments?: BudgetData[];
  default_currency?: Currency;
  frequent_currencies?: string[];
  default_entries?: Record<string, string>;
  theme?: string;
  spendingChartType?: 'bar' | 'line';
  layoutWidth?: 'fixed' | 'full';
}

function encodeDefaultEntries(entries: Record<string, string>): string[] {
  return Object.entries(entries).flatMap(([k, v]) => [k, v]);
}

export function useUpdatePreference(uid: string) {
  const { notifyWrite } = useSyncStatus();

  function mutate(partial: FirestorePreferencePartial): void {
    const firestoreData: Record<string, unknown> = { ...partial };
    if (partial.default_entries !== undefined) {
      firestoreData['default_entries'] = encodeDefaultEntries(partial.default_entries);
    }
    notifyWrite();
    void setDoc(doc(db, 'preference', uid), firestoreData, { merge: true });
  }

  return { mutate };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- useUpdatePreference
```

Expected: all 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useUpdatePreference.ts src/hooks/useUpdatePreference.test.ts
git commit -m "feat: make preference mutations fire-and-forget with notifyWrite"
```

---

## Task 7: Wire Providers and App.tsx

**Files:**
- Modify: `src/context/TransactionContext.tsx`
- Modify: `src/context/TransactionProvider.tsx`
- Modify: `src/context/PreferenceContext.tsx`
- Modify: `src/context/PreferenceProvider.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `src/context/TransactionContext.tsx`**

Replace the entire file:

```tsx
/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import type { Transaction } from '../firestore/types';

export interface TransactionContextValue {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
}

export const TransactionContext = createContext<TransactionContextValue | null>(null);

export { TransactionProvider } from './TransactionProvider';
export { useTransactionContext } from './useTransactionContext';
```

- [ ] **Step 2: Update `src/context/TransactionProvider.tsx`**

Replace the entire file:

```tsx
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { useSyncStatus } from './SyncStatusContext';
import { TransactionContext } from './TransactionContext';

export function TransactionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifySnapshot } = useSyncStatus();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { data: transactions, loading, error, hasPendingWrites } = useTransactions({ uid });

  useEffect(() => {
    notifySnapshot(hasPendingWrites);
  }, [hasPendingWrites, notifySnapshot]);

  return (
    <TransactionContext.Provider value={{ transactions, loading, error, hasPendingWrites }}>
      {children}
    </TransactionContext.Provider>
  );
}
```

- [ ] **Step 3: Update `src/context/PreferenceContext.tsx`**

Replace the entire file:

```tsx
/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import type { Preference } from '../firestore/types';

export interface PreferenceContextValue {
  preference: Preference | null;
  loading: boolean;
  error: Error | null;
}

export const PreferenceContext = createContext<PreferenceContextValue | null>(null);

export { PreferenceProvider } from './PreferenceProvider';
export { usePreferenceContext } from './usePreferenceContext';
```

- [ ] **Step 4: Update `src/context/PreferenceProvider.tsx`**

Replace the entire file:

```tsx
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePreferences } from '../hooks/usePreferences';
import { useSyncStatus } from './SyncStatusContext';
import { PreferenceContext } from './PreferenceContext';

export function PreferenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { notifySnapshot } = useSyncStatus();
  const uid = auth.status === 'authenticated' ? auth.user.uid : null;
  const { data, loading, error, hasPendingWrites } = usePreferences(uid);

  useEffect(() => {
    notifySnapshot(hasPendingWrites);
  }, [hasPendingWrites, notifySnapshot]);

  return (
    <PreferenceContext.Provider value={{ preference: data, loading, error }}>
      {children}
    </PreferenceContext.Provider>
  );
}
```

- [ ] **Step 5: Update `src/App.tsx`**

Change only the import list and provider nesting. Add `SyncStatusProvider` import and wrap it around `PreferenceProvider` and `TransactionProvider`:

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { SyncStatusProvider } from './context/SyncStatusContext';
import { PreferenceProvider } from './context/PreferenceContext';
import { TransactionProvider } from './context/TransactionContext';
import { ThemeProvider } from './context/ThemeProvider';
import { LayoutProvider } from './context/LayoutProvider';
import Landing from './routes/Landing';

const SignIn = lazy(() => import('./routes/SignIn'));
const AppShell = lazy(() => import('./routes/AppShell'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const TransactionList = lazy(() => import('./routes/TransactionList'));
const TransactionForm = lazy(() => import('./routes/TransactionForm'));
const Settings = lazy(() => import('./routes/Settings'));

const RouteFallback = () => (
  <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center text-slate-500">
    Loading…
  </div>
);

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    path: '/signin',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <SignIn />
      </Suspense>
    ),
  },
  {
    path: '/app',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'transactions',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionList />
          </Suspense>
        ),
      },
      {
        path: 'transactions/new',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="add" />
          </Suspense>
        ),
      },
      {
        path: 'transactions/:id/edit',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="edit" />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <SyncStatusProvider>
        <PreferenceProvider>
          <TransactionProvider>
            <ThemeProvider>
              <LayoutProvider>
                <RouterProvider router={router} />
              </LayoutProvider>
            </ThemeProvider>
          </TransactionProvider>
        </PreferenceProvider>
      </SyncStatusProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: errors about `refetch` being used in route files — that is expected and will be fixed in Task 10.

- [ ] **Step 7: Commit**

```bash
git add src/context/TransactionContext.tsx src/context/TransactionProvider.tsx \
        src/context/PreferenceContext.tsx src/context/PreferenceProvider.tsx src/App.tsx
git commit -m "feat: wire SyncStatusContext into providers; remove refetch from context API"
```

---

## Task 8: SyncPill Component

**Files:**
- Create: `src/components/layout/SyncPill.tsx`
- Create: `src/components/layout/SyncPill.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/layout/SyncPill.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/SyncStatusContext', () => ({
  useSyncStatus: vi.fn(),
}));

import { useSyncStatus } from '../../context/SyncStatusContext';
import SyncPill from './SyncPill';

function setup(status: 'synced' | 'syncing' | 'pending') {
  vi.mocked(useSyncStatus).mockReturnValue({
    status,
    notifyWrite: vi.fn(),
    notifySnapshot: vi.fn(),
  });
}

describe('SyncPill', () => {
  it('renders "In Sync" label when status is synced', () => {
    setup('synced');
    render(<SyncPill />);
    expect(screen.getByRole('status')).toHaveTextContent('In Sync');
  });

  it('renders "Syncing…" label when status is syncing', () => {
    setup('syncing');
    render(<SyncPill />);
    expect(screen.getByRole('status')).toHaveTextContent('Syncing…');
  });

  it('renders "Pending Sync" label when status is pending', () => {
    setup('pending');
    render(<SyncPill />);
    expect(screen.getByRole('status')).toHaveTextContent('Pending Sync');
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    setup('synced');
    render(<SyncPill />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('dot has animate-pulse class only in syncing state', () => {
    setup('syncing');
    const { container } = render(<SyncPill />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot?.className).toContain('animate-pulse');
  });

  it('dot does not have animate-pulse in pending state', () => {
    setup('pending');
    const { container } = render(<SyncPill />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot?.className).not.toContain('animate-pulse');
  });

  it('dot does not have animate-pulse in synced state', () => {
    setup('synced');
    const { container } = render(<SyncPill />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot?.className).not.toContain('animate-pulse');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- SyncPill
```

Expected: FAIL — `Cannot find module './SyncPill'`.

- [ ] **Step 3: Create `src/components/layout/SyncPill.tsx`**

```tsx
import { useSyncStatus, type SyncStatus } from '../../context/SyncStatusContext';

const CONFIG: Record<SyncStatus, { label: string; dotClass: string; pillClass: string }> = {
  synced: {
    label: 'In Sync',
    dotClass: 'w-[7px] h-[7px] rounded-full bg-[#22c55e] flex-shrink-0',
    pillClass: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
  },
  syncing: {
    label: 'Syncing…',
    dotClass: 'w-[7px] h-[7px] rounded-full bg-[#3b82f6] flex-shrink-0 animate-pulse',
    pillClass: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
  },
  pending: {
    label: 'Pending Sync',
    dotClass: 'w-[7px] h-[7px] rounded-full bg-[#f97316] flex-shrink-0',
    pillClass: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
  },
};

export default function SyncPill() {
  const { status } = useSyncStatus();
  const { label, dotClass, pillClass } = CONFIG[status];

  return (
    <span
      role="status"
      aria-live="polite"
      className={[
        'inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full',
        'text-[11px] font-semibold whitespace-nowrap border flex-shrink-0',
        'transition-[background-color,color,border-color] duration-200',
        pillClass,
      ].join(' ')}
    >
      <span className={dotClass} aria-hidden="true" />
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- SyncPill
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/SyncPill.tsx src/components/layout/SyncPill.test.tsx
git commit -m "feat: add SyncPill nav indicator component"
```

---

## Task 9: Add SyncPill to Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add `SyncPill` import and place it in the desktop nav and mobile dropdown**

In `src/components/layout/Sidebar.tsx`, make two changes:

**Add import** at the top of the file (after the existing imports):
```tsx
import SyncPill from './SyncPill';
```

**Desktop nav** — add `<SyncPill />` between the swatches `</div>` and the sign-out `<button>` inside the `hidden md:flex items-center gap-3 ml-auto` div:

```tsx
{/* Theme switcher + sync indicator + sign-out — desktop only */}
<div className="hidden md:flex items-center gap-3 ml-auto">
  <div role="group" aria-label="Theme" className="flex items-center gap-1.5">
    {THEMES.map((t) => (
      <button
        key={t.id}
        type="button"
        aria-label={t.name}
        aria-pressed={themeId === t.id}
        onClick={() => void setTheme(t.id)}
        className={[
          'w-5 h-5 rounded-[3px] transition-all',
          themeId === t.id
            ? 'ring-2 ring-offset-1 scale-110'
            : 'opacity-60 hover:opacity-100',
        ].join(' ')}
        style={{ background: t.swatchGradient }}
      />
    ))}
  </div>
  <SyncPill />
  <button
    type="button"
    onClick={() => void handleSignOut()}
    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text border border-border flex-shrink-0"
  >
    <span aria-hidden="true">⎋</span>
    Sign out
  </button>
</div>
```

**Mobile dropdown** — add `<SyncPill />` inside the `flex items-center justify-between` div at the bottom of the mobile menu, between the theme swatches group and the sign-out button:

```tsx
<div className="flex items-center justify-between px-3 pt-2 mt-1 border-t border-border">
  <div role="group" aria-label="Theme" className="flex items-center gap-1.5">
    {THEMES.map((t) => (
      <button
        key={t.id}
        type="button"
        aria-label={t.name}
        aria-pressed={themeId === t.id}
        onClick={() => void setTheme(t.id)}
        className={[
          'w-6 h-6 rounded-[3px] transition-all',
          themeId === t.id
            ? 'ring-2 ring-offset-1 scale-110'
            : 'opacity-60 hover:opacity-100',
        ].join(' ')}
        style={{ background: t.swatchGradient }}
      />
    ))}
  </div>
  <SyncPill />
  <button
    type="button"
    onClick={() => void handleSignOut()}
    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text border border-border"
  >
    <span aria-hidden="true">⎋</span>
    Sign out
  </button>
</div>
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add SyncPill to Sidebar nav (desktop + mobile)"
```

---

## Task 10: Route Cleanup — Remove refetch and Mutation Loading/Error

**Files:**
- Modify: `src/components/transactions/AddTransactionDrawer.tsx`
- Modify: `src/routes/AppShell.tsx`
- Modify: `src/routes/Dashboard.tsx`
- Modify: `src/routes/TransactionList.tsx`
- Modify: `src/routes/TransactionList.test.tsx`
- Modify: `src/routes/TransactionForm.tsx`
- Modify: `src/routes/Settings.tsx`
- Modify: `src/routes/Settings.test.tsx`

- [ ] **Step 1: Make `onSaved` optional in `AddTransactionDrawer.tsx`**

Find the `interface` / `props` definition for `onSaved` in `src/components/transactions/AddTransactionDrawer.tsx`. Change:
```tsx
onSaved: () => void;
```
to:
```tsx
onSaved?: () => void;
```

Find the call to `onSaved()` (near line 252). Change:
```tsx
onSaved();
```
to:
```tsx
onSaved?.();
```

- [ ] **Step 2: Update `src/routes/AppShell.tsx`**

Remove `refetch` from the `useTransactionContext()` destructure and remove `onSaved={refetch}` prop from `<AddTransactionDrawer>`. The relevant block changes from:

```tsx
const { transactions, refetch } = useTransactionContext();
// ...
<AddTransactionDrawer
  open={fabOpen}
  onClose={() => setFabOpen(false)}
  onSaved={refetch}
  transactions={transactions}
/>
```

to:

```tsx
const { transactions } = useTransactionContext();
// ...
<AddTransactionDrawer
  open={fabOpen}
  onClose={() => setFabOpen(false)}
  transactions={transactions}
/>
```

- [ ] **Step 3: Update `src/routes/Dashboard.tsx`**

Remove `refetch` from the `useTransactionContext()` destructure (line ~59). Change:
```tsx
const { transactions: allTxns, loading, error, refetch } = useTransactionContext();
```
to:
```tsx
const { transactions: allTxns, loading, error } = useTransactionContext();
```

Remove the `refetch()` call after delete (line ~309). Delete just that line.

Change the error retry button (line ~327) from `onClick={refetch}` to `onClick={() => window.location.reload()}`.

Change `onTransactionAdded={refetch}` to `onTransactionAdded={() => {}}` (or remove the prop if the child component accepts it as optional).

Change `onSaved={refetch}` on `<AddTransactionDrawer>` — remove the `onSaved` prop entirely since it is now optional.

- [ ] **Step 4: Update `src/routes/TransactionList.tsx`**

Remove `refetch` from the `useTransactionContext()` destructure (line ~14). Change:
```tsx
const { transactions, loading, error, refetch } = useTransactionContext();
```
to:
```tsx
const { transactions, loading, error } = useTransactionContext();
```

Remove the `refetch()` call after delete (line ~24). Delete just that line.

Change the error retry button (line ~42) from `onClick={refetch}` to `onClick={() => window.location.reload()}`.

- [ ] **Step 5: Update `src/routes/TransactionList.test.tsx`**

Find the mock context object (near line 16) and remove the `refetch` field:
```tsx
// Before
const prefCtx = { preference: null, loading: false, error: null, refetch: vi.fn() };

// After
const prefCtx = { preference: null, loading: false, error: null };
```

Also find any transaction context mock that includes `refetch` and remove it.

- [ ] **Step 6: Update `src/routes/TransactionForm.tsx`**

**Change mutation hook destructuring** (lines ~82-83). Remove `loading` and `error` from both hooks:
```tsx
// Before
const { mutate: addTx, loading: adding, error: addError } = useAddTransaction();
const { mutate: updateTx, loading: updating, error: updateError } = useUpdateTransaction();

// After
const { mutate: addTx } = useAddTransaction();
const { mutate: updateTx } = useUpdateTransaction();
```

**Change `handleSubmit`** — three targeted edits, everything else stays the same:

1. Change the function signature from `async function handleSubmit` to `function handleSubmit`.

2. Replace the `try/catch` block at the end of the function:
```tsx
// Before — the last ~10 lines of handleSubmit
    try {
      if (mode === 'add') {
        await addTx(txData);
      } else {
        await updateTx(id!, txData);
      }
      navigate('/app/transactions');
    } catch {
      // mutateError state is already set by the hook
    }

// After
    if (mode === 'add') {
      addTx(txData);
    } else {
      updateTx(id!, txData);
    }
    navigate('/app/transactions');
```

All other lines in `handleSubmit` (validation, building `txData`, deriving `categoryObj`) remain unchanged.

**Remove `mutateError` and update `loading`** (lines ~189-190):
```tsx
// Before
const mutateError = addError ?? updateError;
const loading = adding || updating || loadingTx;

// After
const loading = loadingTx;
```

**Remove the `mutateError` JSX block** (lines ~322-326):
```tsx
// Remove entirely:
{mutateError && (
  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
    {mutateError.message}
  </p>
)}
```

**Update button label** (line ~342) from `{loading ? 'Saving…' : 'Save'}` to `{loading ? 'Loading…' : 'Save'}`.

- [ ] **Step 7: Update `src/routes/Settings.tsx`**

Remove `refetch` from `usePreferenceContext()` destructure (line 36):
```tsx
// Before
const { preference, loading, error, refetch } = usePreferenceContext();

// After
const { preference, loading, error } = usePreferenceContext();
```

Remove `loading: saving` from `useUpdatePreference` (line 37):
```tsx
// Before
const { mutate, loading: saving } = useUpdatePreference(uid);

// After
const { mutate } = useUpdatePreference(uid);
```

Make all `saveXxx` functions synchronous by removing `await` and `refetch()`:
```tsx
function saveList(field: 'accounts' | 'categories' | 'vendors' | 'payments', items: BudgetData[]) {
  mutate({ [field]: items });
}

function saveSubCategories(items: BudgetData[]) {
  mutate({ subCategories: items });
}

function saveCurrency(currency: Currency) {
  mutate({ default_currency: currency });
}

function saveBookmarks(codes: string[]) {
  mutate({ frequent_currencies: codes });
}

function saveDefaults(partial: Record<string, string>) {
  const current = preference?.defaultEntries ?? {};
  mutate({ default_entries: { ...current, ...partial } });
}
```

Change the error retry button from `onClick={refetch}` to `onClick={() => window.location.reload()}`.

Find any `disabled={saving}` attributes on save buttons and remove them.

- [ ] **Step 8: Update `src/routes/Settings.test.tsx`**

Find the `usePreferenceContext` mock (near line 19-21) and remove `refetch`:
```tsx
// Before
usePreferenceContext: vi.fn(() => ({
  preference: mockPref,
  loading: false,
  error: null,
  refetch: vi.fn(),
})),

// After
usePreferenceContext: vi.fn(() => ({
  preference: mockPref,
  loading: false,
  error: null,
})),
```

Find the `useUpdatePreference` mock (near line 28) and remove `loading` and `error`:
```tsx
// Before
useUpdatePreference: () => ({ mutate: vi.fn(), loading: false, error: null }),

// After
useUpdatePreference: () => ({ mutate: vi.fn() }),
```

Find the loading-state mock (near lines 114-119) and remove `refetch`:
```tsx
// Before
vi.mocked(usePreferenceContext).mockReturnValueOnce({
  preference: null,
  loading: true,
  error: null,
  refetch: vi.fn(),
});

// After
vi.mocked(usePreferenceContext).mockReturnValueOnce({
  preference: null,
  loading: true,
  error: null,
});
```

- [ ] **Step 9: Run full test suite and typecheck**

```bash
npm run typecheck && npm run test
```

Expected: all tests pass, no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/transactions/AddTransactionDrawer.tsx \
        src/routes/AppShell.tsx \
        src/routes/Dashboard.tsx \
        src/routes/TransactionList.tsx \
        src/routes/TransactionList.test.tsx \
        src/routes/TransactionForm.tsx \
        src/routes/Settings.tsx \
        src/routes/Settings.test.tsx
git commit -m "feat: remove refetch calls and mutation loading state from routes"
```

---

## Final Verification

- [ ] **Run full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Manual smoke test**

```bash
npm run dev
```

1. Open http://localhost:5173, sign in.
2. Verify nav bar shows "In Sync" (green pill).
3. Add a transaction — verify it appears in the dashboard immediately and pill briefly shows "Syncing…" then returns to "In Sync".
4. Edit a transaction — verify same instant update behaviour.
5. Delete a transaction — verify it disappears immediately.
6. Open DevTools → Application → IndexedDB → verify `firestore/[default]/…` database is populated.
