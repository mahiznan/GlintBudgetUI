# Web — Remove Firestore Listeners (Spark Optimisation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all three `onSnapshot` real-time listeners with one-shot `getDocs`/`getDoc` loads and optimistic local state, eliminating the listener read cost and matching the iOS post-optimisation architecture.

**Architecture:** Each of the three Providers (`TransactionProvider`, `PreferenceProvider`, `PlannerProvider`) becomes a stateful in-memory cache — it loads data once on sign-in via a one-shot fetch, then maintains state locally through optimistic mutations. The mutation hooks (`useMutateTransaction`, `useMutatePlanner`, `useUpdatePreference`) delegate Firestore writes to the Provider (transactions, planners) or continue to own writes and call `applyPreferenceUpdate` on the Provider (preferences). `SyncStatusContext` gains a `notifySynced()` function so mutation Promises can clear pending state instead of waiting for a snapshot callback.

**Tech Stack:** React 18, TypeScript strict, Firebase JS SDK v10, Vitest + React Testing Library

---

## Files modified / created

| File | Action |
|---|---|
| `src/context/SyncStatusContext.tsx` | Add `notifySynced` |
| `src/hooks/useTransactions.ts` | Rewrite: `onSnapshot` → `fetchTransactions` async fn |
| `src/hooks/useTransactions.test.ts` | Rewrite to mock `getDocs` |
| `src/context/TransactionContext.tsx` | Add mutation types to context value |
| `src/context/TransactionProvider.tsx` | Rewrite: stateful cache + optimistic mutations |
| `src/context/TransactionProvider.test.tsx` | Rewrite |
| `src/hooks/useMutateTransaction.ts` | Delegate to context; remove Firestore imports |
| `src/hooks/useMutateTransaction.test.tsx` | Update: mock context, not Firestore |
| `src/components/transactions/AddTransactionDrawer.tsx` | Remove redundant `getDoc` |
| `src/routes/TransactionForm.tsx` | Remove redundant `getDoc` |
| `src/hooks/usePreferences.ts` | Rewrite: `onSnapshot` → `fetchPreferences` async fn; export `mergeWithDefaults` |
| `src/hooks/usePreferences.test.ts` | Rewrite to mock `getDoc` |
| `src/context/PreferenceContext.tsx` | Add `applyPreferenceUpdate` to context value |
| `src/context/PreferenceProvider.tsx` | Rewrite: stateful cache |
| `src/hooks/useUpdatePreference.ts` | Call `applyPreferenceUpdate` + `notifySynced` |
| `src/hooks/useUpdatePreference.test.tsx` | Update |
| `src/hooks/usePlanners.ts` | Rewrite: `onSnapshot` → `fetchPlanners` async fn |
| `src/hooks/usePlanners.test.ts` | Rewrite to mock `getDocs` |
| `src/context/PlannerContext.tsx` | Add mutation types to context value |
| `src/context/PlannerProvider.tsx` | Rewrite: stateful cache + optimistic mutations |
| `src/hooks/useMutatePlanner.ts` | Delegate to context |
| `src/hooks/useMutatePlanner.test.tsx` | Update: mock context |
| `src/auth/AuthProvider.tsx` | Add UID guard |
| `src/auth/AuthProvider.test.tsx` | Update |

---

## Task 1: Add `notifySynced` to SyncStatusContext

**Files:**
- Modify: `src/context/SyncStatusContext.tsx`

All mutation Promises in later tasks call `notifySynced()` when they resolve instead of waiting for a snapshot callback.

- [ ] **Step 1: Write the failing test**

  Add to `src/context/SyncStatusContext.test.tsx` (create the file if it doesn't exist — check first with `ls src/context/SyncStatusContext*`):

  ```ts
  // src/context/SyncStatusContext.test.tsx
  import { renderHook, act } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import React from 'react';
  import { SyncStatusProvider, useSyncStatus } from './SyncStatusContext';

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SyncStatusProvider, null, children);

  describe('SyncStatusContext notifySynced', () => {
    it('notifySynced clears pending state set by notifyWrite', () => {
      const { result } = renderHook(() => useSyncStatus(), { wrapper });
      act(() => result.current.notifyWrite());
      expect(result.current.status).toBe('syncing');
      act(() => result.current.notifySynced());
      expect(result.current.status).toBe('synced');
    });
  });
  ```

- [ ] **Step 2: Run to confirm it fails**

  ```bash
  cd /Users/rajeshkumar/workspace/GlintBudgetUI
  npm run test -- SyncStatusContext --reporter=verbose 2>&1 | tail -15
  ```

  Expected: FAIL — `result.current.notifySynced is not a function`

- [ ] **Step 3: Add `notifySynced` to `SyncStatusContext.tsx`**

  In `src/context/SyncStatusContext.tsx`:

  **Add `notifySynced` to the interface** (after `notifySnapshot`):
  ```ts
  interface SyncStatusContextValue {
    status: SyncStatus;
    notifyWrite: () => void;
    notifySnapshot: (hasPendingWrites: boolean) => void;
    notifySynced: () => void;
  }
  ```

  **Add implementation** (inside `SyncStatusProvider`, after `notifySnapshot`):
  ```ts
  const notifySynced = useCallback(() => setHasPending(false), []);
  ```

  **Add to Provider value**:
  ```ts
  <SyncStatusContext.Provider value={{ status, notifyWrite, notifySnapshot, notifySynced }}>
  ```

- [ ] **Step 4: Run test to confirm it passes**

  ```bash
  npm run test -- SyncStatusContext --reporter=verbose 2>&1 | tail -10
  ```

  Expected: PASS

- [ ] **Step 5: Run full suite to confirm no regressions**

  ```bash
  npm run test 2>&1 | tail -5
  ```

  Expected: all 579+ tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/context/SyncStatusContext.tsx src/context/SyncStatusContext.test.tsx
  git commit -m "feat: add notifySynced to SyncStatusContext for promise-based sync clearing"
  ```

---

## Task 2: Replace transaction `onSnapshot` listener with `fetchTransactions`

**Files:**
- Modify: `src/hooks/useTransactions.ts`
- Modify: `src/hooks/useTransactions.test.ts`

The hook becomes a pure async fetch function. The `onSnapshot`-based `useTransactions` React hook is removed entirely; `TransactionProvider` (Task 3) will call `fetchTransactions` directly.

- [ ] **Step 1: Rewrite `useTransactions.test.ts`**

  Replace the entire file:

  ```ts
  import { describe, expect, it, vi, beforeEach } from 'vitest';

  vi.mock('../firebase/db', () => ({ db: {} }));

  const mockGetDocs = vi.fn();
  vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => 'col'),
    query: vi.fn((_col: unknown, ...constraints: unknown[]) => ({ col: _col, constraints })),
    where: vi.fn((...args: unknown[]) => ({ type: 'where', args })),
    orderBy: vi.fn((...args: unknown[]) => ({ type: 'orderBy', args })),
    limit: vi.fn((...args: unknown[]) => ({ type: 'limit', args })),
    getDocs: (q: unknown) => mockGetDocs(q),
  }));

  import { fetchTransactions } from './useTransactions';

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

  describe('fetchTransactions', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns [] without calling getDocs when uid is empty', async () => {
      const result = await fetchTransactions({ uid: '' });
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('maps sub_category → subCategory and Timestamp.toDate() → Date', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [makeDoc()] });
      const result = await fetchTransactions({ uid: 'u1' });
      expect(result).toHaveLength(1);
      expect(result[0]!.subCategory).toBe('Groceries');
      expect(result[0]!.date).toBeInstanceOf(Date);
      expect(result[0]!.id).toBe('tx1');
    });

    it('defaults notes and icon to empty string when absent', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [makeDoc({ notes: undefined, icon: undefined })],
      });
      const result = await fetchTransactions({ uid: 'u1' });
      expect(result[0]!.notes).toBe('');
      expect(result[0]!.icon).toBe('');
    });

    it('includes start constraint when provided', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });
      const start = new Date('2026-01-01');
      await fetchTransactions({ uid: 'u1', start });
      const q = mockGetDocs.mock.calls[0]![0] as { constraints: Array<{ type: string; args: unknown[] }> };
      const whereConstraints = q.constraints.filter(c => c.type === 'where');
      expect(whereConstraints).toContainEqual(
        expect.objectContaining({ args: ['date', '>=', start] }),
      );
    });

    it('includes end constraint when provided', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });
      const end = new Date('2026-12-31');
      await fetchTransactions({ uid: 'u1', end });
      const q = mockGetDocs.mock.calls[0]![0] as { constraints: Array<{ type: string; args: unknown[] }> };
      const whereConstraints = q.constraints.filter(c => c.type === 'where');
      expect(whereConstraints).toContainEqual(
        expect.objectContaining({ args: ['date', '<=', end] }),
      );
    });

    it('propagates getDocs errors', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('quota exceeded'));
      await expect(fetchTransactions({ uid: 'u1' })).rejects.toThrow('quota exceeded');
    });
  });
  ```

- [ ] **Step 2: Run to confirm new tests fail**

  ```bash
  npm run test -- useTransactions --reporter=verbose 2>&1 | tail -15
  ```

  Expected: FAIL — `fetchTransactions is not a function` (old hook exported different shape)

- [ ] **Step 3: Rewrite `useTransactions.ts`**

  Replace the entire file:

  ```ts
  import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
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

  export function docToTransaction(id: string, raw: DocumentData): Transaction {
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

  export async function fetchTransactions(filter: TransactionFilter): Promise<Transaction[]> {
    if (!filter.uid) return [];
    const col = collection(db, 'transactions');
    const constraints: QueryConstraint[] = [
      where('user_id', '==', filter.uid),
      orderBy('date', 'desc'),
    ];
    if (filter.start) constraints.push(where('date', '>=', filter.start));
    if (filter.end) constraints.push(where('date', '<=', filter.end));
    if (filter.limit) constraints.push(limit(filter.limit));
    const snap = await getDocs(query(col, ...constraints));
    return snap.docs.map((d) => docToTransaction(d.id, d.data()));
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npm run test -- useTransactions --reporter=verbose 2>&1 | tail -15
  ```

  Expected: all 6 new `fetchTransactions` tests PASS.

- [ ] **Step 5: Run full suite — expect failures in TransactionProvider (depends on old hook shape)**

  ```bash
  npm run test 2>&1 | tail -10
  ```

  Expected: `TransactionProvider.test.tsx` and possibly `useMutateTransaction.test.tsx` fail (they mock the old `useTransactions` hook). This is expected and will be fixed in Tasks 3 and 4.

- [ ] **Step 6: Commit**

  ```bash
  git add src/hooks/useTransactions.ts src/hooks/useTransactions.test.ts
  git commit -m "perf: replace useTransactions onSnapshot listener with one-shot fetchTransactions"
  ```

---

## Task 3: TransactionProvider — stateful cache with optimistic mutations

**Files:**
- Modify: `src/context/TransactionContext.tsx`
- Modify: `src/context/TransactionProvider.tsx`
- Modify: `src/context/TransactionProvider.test.tsx`

The Provider becomes the in-memory cache (mirrors iOS `TransactionCacheManager`). It owns both the Firestore writes and the local state.

- [ ] **Step 1: Update `TransactionContext.tsx`**

  Replace the entire file:

  ```ts
  /* eslint-disable react-refresh/only-export-components */
  import { createContext } from 'react';
  import type { Transaction } from '../firestore/types';

  export interface TransactionContextValue {
    transactions: Transaction[];
    loading: boolean;
    error: Error | null;
    addTransaction: (tx: Omit<Transaction, 'id'>) => string;
    updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
    deleteTransaction: (id: string) => void;
    loadYear: (year: number) => Promise<void>;
  }

  export const TransactionContext = createContext<TransactionContextValue | null>(null);

  export { TransactionProvider } from './TransactionProvider';
  export { useTransactionContext } from './useTransactionContext';
  ```

- [ ] **Step 2: Write the failing TransactionProvider tests**

  Replace the entire `src/context/TransactionProvider.test.tsx`:

  ```tsx
  import React from 'react';
  import { renderHook, act, waitFor } from '@testing-library/react';
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

  const mockFetch = vi.fn(() => Promise.resolve([]));
  vi.mock('../hooks/useTransactions', () => ({
    fetchTransactions: (...args: unknown[]) => mockFetch(...args),
  }));

  vi.mock('./SyncStatusContext', () => ({
    useSyncStatus: vi.fn(() => ({
      notifyWrite: vi.fn(),
      notifySynced: vi.fn(),
      notifySnapshot: vi.fn(),
    })),
    SyncStatusProvider: ({ children }: { children: React.ReactNode }) => children,
  }));

  import { AuthContext } from '../auth/AuthContext';
  import { TransactionProvider } from './TransactionProvider';
  import { useTransactionContext } from './useTransactionContext';
  import type { Transaction } from '../firestore/types';
  import { setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

  const baseTx: Omit<Transaction, 'id'> = {
    user_id: 'u1', category: 'Food', subCategory: 'Groceries',
    date: new Date('2026-05-17'), account: 'HDFC', vendor: 'Zepto',
    payment: 'UPI', currency: 'INR', notes: '', amount: -500, icon: '🛒',
  };

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider
        value={{ status: 'authenticated', user: { uid: 'u1', name: null, email: null, photoUrl: null } }}
      >
        <TransactionProvider>{children}</TransactionProvider>
      </AuthContext.Provider>
    );
  }

  describe('TransactionProvider', () => {
    beforeEach(() => { vi.resetAllMocks(); mockFetch.mockResolvedValue([]); });

    it('calls fetchTransactions for current year on mount', async () => {
      renderHook(() => useTransactionContext(), { wrapper });
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      const call = mockFetch.mock.calls[0]![0] as { uid: string; start: Date };
      expect(call.uid).toBe('u1');
      expect(call.start.getFullYear()).toBe(new Date().getFullYear());
      expect(call.start.getMonth()).toBe(0);
    });

    it('addTransaction inserts optimistically and calls setDoc', () => {
      const { result } = renderHook(() => useTransactionContext(), { wrapper });
      act(() => { result.current.addTransaction(baseTx); });
      expect(result.current.transactions).toHaveLength(1);
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    it('addTransaction returns a UUID', () => {
      const { result } = renderHook(() => useTransactionContext(), { wrapper });
      let id = '';
      act(() => { id = result.current.addTransaction(baseTx); });
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('addTransaction rolls back on setDoc failure', async () => {
      vi.mocked(setDoc).mockRejectedValueOnce(new Error('network error'));
      const { result } = renderHook(() => useTransactionContext(), { wrapper });
      act(() => { result.current.addTransaction(baseTx); });
      expect(result.current.transactions).toHaveLength(1);
      await waitFor(() => expect(result.current.transactions).toHaveLength(0));
    });

    it('updateTransaction patches transaction in list', () => {
      mockFetch.mockResolvedValueOnce([{ ...baseTx, id: 'tx-1' }]);
      const { result } = renderHook(() => useTransactionContext(), { wrapper });
      act(() => { result.current.updateTransaction('tx-1', { amount: -999 }); });
      expect(result.current.transactions.find(t => t.id === 'tx-1')?.amount).toBe(-999);
      expect(updateDoc).toHaveBeenCalledTimes(1);
    });

    it('deleteTransaction removes from list', () => {
      mockFetch.mockResolvedValueOnce([{ ...baseTx, id: 'tx-1' }]);
      const { result } = renderHook(() => useTransactionContext(), { wrapper });
      act(() => { result.current.deleteTransaction('tx-1'); });
      expect(result.current.transactions).toHaveLength(0);
      expect(deleteDoc).toHaveBeenCalledTimes(1);
    });

    it('loadYear calls fetchTransactions with the given year range', async () => {
      const { result } = renderHook(() => useTransactionContext(), { wrapper });
      await act(async () => { await result.current.loadYear(2025); });
      const yearCall = mockFetch.mock.calls.find(
        (c) => (c[0] as { start: Date }).start.getFullYear() === 2025
      );
      expect(yearCall).toBeDefined();
    });

    it('clears transactions when uid becomes empty (sign-out)', () => {
      const { result, rerender } = renderHook(() => useTransactionContext(), {
        wrapper: ({ children }) => (
          <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
            <TransactionProvider>{children}</TransactionProvider>
          </AuthContext.Provider>
        ),
      });
      expect(result.current.transactions).toEqual([]);
    });
  });
  ```

- [ ] **Step 3: Run to confirm tests fail**

  ```bash
  npm run test -- TransactionProvider --reporter=verbose 2>&1 | tail -15
  ```

  Expected: FAIL (Provider still uses old hook shape)

- [ ] **Step 4: Rewrite `TransactionProvider.tsx`**

  Replace the entire file:

  ```tsx
  import { useState, useCallback, useEffect, type ReactNode } from 'react';
  import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
  } from 'firebase/firestore';
  import { db } from '../firebase/db';
  import { useAuth } from '../auth/AuthContext';
  import { useSyncStatus } from './SyncStatusContext';
  import { fetchTransactions } from '../hooks/useTransactions';
  import { TransactionContext, type TransactionContextValue } from './TransactionContext';
  import type { Transaction } from '../firestore/types';

  function encodeTransaction(id: string, tx: Omit<Transaction, 'id'>): Record<string, unknown> {
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

  function encodePatch(
    patch: Partial<Omit<Transaction, 'id'>>,
  ): Record<string, unknown> {
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

  export function TransactionProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const { notifyWrite, notifySynced } = useSyncStatus();
    const uid = auth.status === 'authenticated' ? auth.user.uid : '';
    const isPremium =
      auth.status === 'authenticated' ? (auth.user.user_isPremium ?? false) : false;

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadYear = useCallback(
      async (year: number) => {
        if (!uid) return;
        setLoading(true);
        setError(null);
        try {
          const start = new Date(year, 0, 1);
          const end = isPremium
            ? undefined
            : new Date(year, 11, 31, 23, 59, 59, 999);
          const loaded = await fetchTransactions({ uid, start, end });
          setTransactions(loaded);
        } catch (e) {
          setError(e as Error);
        } finally {
          setLoading(false);
        }
      },
      [uid, isPremium],
    );

    useEffect(() => {
      if (!uid) {
        setTransactions([]);
        return;
      }
      void loadYear(new Date().getFullYear());
    }, [uid, loadYear]);

    const addTransaction = useCallback(
      (tx: Omit<Transaction, 'id'>): string => {
        const id = crypto.randomUUID();
        const newTx: Transaction = { ...tx, id };
        setTransactions((prev) =>
          [newTx, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()),
        );
        notifyWrite();
        void setDoc(doc(collection(db, 'transactions'), id), encodeTransaction(id, tx))
          .then(() => notifySynced())
          .catch(() => setTransactions((prev) => prev.filter((t) => t.id !== id)));
        return id;
      },
      [notifyWrite, notifySynced],
    );

    const updateTransaction = useCallback(
      (id: string, patch: Partial<Omit<Transaction, 'id'>>): void => {
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        );
        notifyWrite();
        void updateDoc(doc(db, 'transactions', id), encodePatch(patch)).then(
          () => notifySynced(),
        );
      },
      [notifyWrite, notifySynced],
    );

    const deleteTransaction = useCallback(
      (id: string): void => {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        notifyWrite();
        void deleteDoc(doc(db, 'transactions', id)).then(() => notifySynced());
      },
      [notifyWrite, notifySynced],
    );

    const value: TransactionContextValue = {
      transactions,
      loading,
      error,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      loadYear,
    };

    return (
      <TransactionContext.Provider value={value}>
        {children}
      </TransactionContext.Provider>
    );
  }
  ```

- [ ] **Step 5: Run TransactionProvider tests**

  ```bash
  npm run test -- TransactionProvider --reporter=verbose 2>&1 | tail -20
  ```

  Expected: all 8 tests PASS.

- [ ] **Step 6: Run full suite**

  ```bash
  npm run test 2>&1 | tail -5
  ```

  Expected: most tests pass; `useMutateTransaction.test.tsx` will still fail (fixed in Task 4).

- [ ] **Step 7: Commit**

  ```bash
  git add src/context/TransactionContext.tsx src/context/TransactionProvider.tsx src/context/TransactionProvider.test.tsx
  git commit -m "perf: TransactionProvider becomes stateful cache with optimistic mutations"
  ```

---

## Task 4: useMutateTransaction delegates to context; remove redundant getDoc from edit forms

**Files:**
- Modify: `src/hooks/useMutateTransaction.ts`
- Modify: `src/hooks/useMutateTransaction.test.tsx`
- Modify: `src/components/transactions/AddTransactionDrawer.tsx`
- Modify: `src/routes/TransactionForm.tsx`

- [ ] **Step 1: Update `useMutateTransaction.test.tsx`**

  Replace from the `wrapper` definition down (keep `toTitleCase` / `vendorExists` unit tests as-is):

  ```tsx
  // Replace everything from line 118 onwards (the wrapper and useAddTransaction/useUpdateTransaction/useDeleteTransaction describe blocks)

  const mockAddTransaction = vi.fn(() => 'test-uuid');
  const mockUpdateTransaction = vi.fn();
  const mockDeleteTransaction = vi.fn();

  vi.mock('../context/useTransactionContext', () => ({
    useTransactionContext: vi.fn(() => ({
      transactions: [],
      loading: false,
      error: null,
      addTransaction: mockAddTransaction,
      updateTransaction: mockUpdateTransaction,
      deleteTransaction: mockDeleteTransaction,
      loadYear: vi.fn(),
    })),
  }));

  vi.mock('../firebase/db', () => ({ db: {} }));
  vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    Timestamp: { fromDate: vi.fn((d: Date) => d) },
  }));

  import {
    useAddTransaction,
    useUpdateTransaction,
    useDeleteTransaction,
  } from './useMutateTransaction';
  import { SyncStatusProvider } from '../context/SyncStatusContext';
  import { PreferenceProvider } from '../context/PreferenceContext';
  import { AuthProvider } from '../auth/AuthProvider';
  import type { Transaction } from '../firestore/types';

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <SyncStatusProvider>
        <PreferenceProvider>{children}</PreferenceProvider>
      </SyncStatusProvider>
    </AuthProvider>
  );

  const baseTx: Omit<Transaction, 'id'> = {
    user_id: 'u1', category: 'Food', subCategory: 'Groceries',
    date: new Date('2026-05-17'), account: 'HDFC', vendor: 'Zepto',
    payment: 'UPI', currency: 'INR', notes: '', amount: -500, icon: '🛒',
  };

  describe('useAddTransaction', () => {
    beforeEach(() => { vi.resetAllMocks(); mockAddTransaction.mockReturnValue('test-uuid'); });

    it('calls context addTransaction and returns its id', () => {
      const { result } = renderHook(() => useAddTransaction('u1'), { wrapper });
      const id = result.current.mutate(baseTx);
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
      expect(id).toBe('test-uuid');
    });

    it('trims vendor whitespace before passing to addTransaction', () => {
      const { result } = renderHook(() => useAddTransaction('u1'), { wrapper });
      result.current.mutate({ ...baseTx, vendor: '  Zepto  ' });
      const called = mockAddTransaction.mock.calls[0]![0] as Omit<Transaction, 'id'>;
      expect(called.vendor).toBe('Zepto');
    });
  });

  describe('useUpdateTransaction', () => {
    beforeEach(() => vi.resetAllMocks());

    it('calls context updateTransaction with id and patch', () => {
      const { result } = renderHook(() => useUpdateTransaction('u1'), { wrapper });
      result.current.mutate('tx-1', { amount: -999 });
      expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({ amount: -999 }));
    });

    it('trims vendor whitespace in patch before calling updateTransaction', () => {
      const { result } = renderHook(() => useUpdateTransaction('u1'), { wrapper });
      result.current.mutate('tx-1', { vendor: '  ZEPTO  ' });
      const patch = mockUpdateTransaction.mock.calls[0]![1] as { vendor: string };
      expect(patch.vendor).toBe('ZEPTO');
    });
  });

  describe('useDeleteTransaction', () => {
    beforeEach(() => vi.resetAllMocks());

    it('calls context deleteTransaction with id', () => {
      const { result } = renderHook(() => useDeleteTransaction(), { wrapper });
      result.current.mutate('tx-1');
      expect(mockDeleteTransaction).toHaveBeenCalledWith('tx-1');
    });
  });
  ```

  **Note:** The file has two import sections — keep the existing `import React` at the top and the `toTitleCase` / `vendorExists` unit tests intact. The `vi.mock('firebase/firestore', ...)` block at the top of the file replaces the existing one (now firebase/firestore is imported but not directly called by the hooks).

- [ ] **Step 2: Run to confirm tests fail**

  ```bash
  npm run test -- useMutateTransaction --reporter=verbose 2>&1 | tail -15
  ```

  Expected: FAIL — hooks still call `setDoc` directly, not via context.

- [ ] **Step 3: Rewrite `useMutateTransaction.ts`**

  Replace the entire file:

  ```ts
  import { useTransactionContext } from '../context/useTransactionContext';
  import { usePreferenceContext } from '../context/PreferenceContext';
  import { useUpdatePreference } from './useUpdatePreference';
  import type { Transaction, BudgetData } from '../firestore/types';

  type TxInput = Omit<Transaction, 'id'>;
  type TxPatch = Partial<Omit<Transaction, 'id'>>;

  export function toTitleCase(str: string): string {
    const trimmed = str.trim();
    if (!trimmed) return '';
    return trimmed
      .split(' ')
      .map((word) => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  export function vendorExists(
    name: string,
    vendors: Array<{ name: string; [key: string]: unknown }>,
  ): boolean {
    const lowerName = name.toLowerCase();
    return vendors.some((vendor) => vendor.name.toLowerCase() === lowerName);
  }

  export function useAddTransaction(uid: string) {
    const { addTransaction } = useTransactionContext();
    const { preference } = usePreferenceContext();
    const { mutate: updatePreference } = useUpdatePreference(uid);

    function mutate(tx: TxInput): string {
      const trimmedVendor = tx.vendor.trim();
      if (
        preference &&
        !vendorExists(
          trimmedVendor,
          (preference.vendors ?? []) as Array<{ name: string; [key: string]: unknown }>,
        )
      ) {
        const newVendor: BudgetData = {
          name: trimmedVendor,
          emoji: '🏪',
          type: 'vendor',
          parent: null,
        };
        updatePreference({ vendors: [...(preference.vendors ?? []), newVendor] });
      }
      return addTransaction({ ...tx, vendor: trimmedVendor });
    }

    return { mutate };
  }

  export function useUpdateTransaction(uid: string) {
    const { updateTransaction } = useTransactionContext();
    const { preference } = usePreferenceContext();
    const { mutate: updatePreference } = useUpdatePreference(uid);

    function mutate(id: string, patch: TxPatch): void {
      if (patch.vendor !== undefined) {
        const trimmedVendor = patch.vendor.trim();
        if (
          preference &&
          !vendorExists(
            trimmedVendor,
            (preference.vendors ?? []) as Array<{ name: string; [key: string]: unknown }>,
          )
        ) {
          const newVendor: BudgetData = {
            name: trimmedVendor,
            emoji: '🏪',
            type: 'vendor',
            parent: null,
          };
          updatePreference({ vendors: [...(preference.vendors ?? []), newVendor] });
        }
        patch = { ...patch, vendor: trimmedVendor };
      }
      updateTransaction(id, patch);
    }

    return { mutate };
  }

  export function useDeleteTransaction() {
    const { deleteTransaction } = useTransactionContext();

    function mutate(id: string): void {
      deleteTransaction(id);
    }

    return { mutate };
  }
  ```

- [ ] **Step 4: Remove redundant `getDoc` from `AddTransactionDrawer.tsx`**

  In `src/components/transactions/AddTransactionDrawer.tsx`:

  **Replace the import line** (line 7):
  ```ts
  // Remove: import { getDoc, doc, type Timestamp } from 'firebase/firestore';
  // Remove: import { db } from '../../firebase/db';
  ```

  **Add** to the existing imports at the top:
  ```ts
  import { useTransactionContext } from '../../context/TransactionContext';
  ```

  **Replace the edit pre-fill `useEffect`** (lines 149–167, which contain `getDoc(doc(db, 'transactions', editId))...`):
  ```ts
  // Pre-fill form when editing an existing transaction
  const { transactions } = useTransactionContext();
  useEffect(() => {
    if (!open || !editId) return;
    const tx = transactions.find((t) => t.id === editId);
    if (!tx) return;
    setForm({
      type: tx.amount < 0 ? 'expense' : 'income',
      amount: String(Math.abs(tx.amount)),
      currency: tx.currency,
      category: tx.category,
      subCategory: tx.subCategory,
      vendor: tx.vendor,
      account: tx.account,
      payment: tx.payment,
      date: toLocalDateStr(tx.date),
      notes: tx.notes ?? '',
    });
  }, [open, editId, transactions]);
  ```

- [ ] **Step 5: Remove redundant `getDoc` from `TransactionForm.tsx`**

  In `src/routes/TransactionForm.tsx`:

  **Replace the import line** (line 3):
  ```ts
  // Remove: import { doc, getDoc, type Timestamp } from 'firebase/firestore';
  // Remove: import { db } from '../firebase/db';
  ```

  **Add** to existing imports:
  ```ts
  import { useTransactionContext } from '../context/TransactionContext';
  ```

  **Replace the edit-mode `useEffect`** (lines 104–127, which contain `getDoc(doc(db, 'transactions', id))...`):
  ```ts
  const { transactions } = useTransactionContext();
  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    const tx = transactions.find((t) => t.id === id);
    if (!tx) {
      navigate('/app/transactions');
      return;
    }
    setForm({
      type: tx.amount < 0 ? 'expense' : 'income',
      amount: String(Math.abs(tx.amount)),
      currency: tx.currency,
      category: tx.category,
      subCategory: tx.subCategory,
      vendor: tx.vendor,
      account: tx.account,
      payment: tx.payment,
      date: toLocalDateString(tx.date),
      notes: tx.notes ?? '',
    });
    setLoadingTx(false);
  }, [mode, id, navigate, transactions]);
  ```

  Also remove `const [loadingTx, setLoadingTx] = useState(mode === 'edit')` if it's now unused, or keep if still referenced elsewhere in the file. Search the file for `loadingTx` — if still used in the JSX, keep it and set it to `false` in the `else` branch; if unused, remove the `useState`.

- [ ] **Step 6: Run all tests**

  ```bash
  npm run test 2>&1 | tail -5
  ```

  Expected: all tests pass (579 original + new ones from Task 3).

- [ ] **Step 7: Commit**

  ```bash
  git add src/hooks/useMutateTransaction.ts src/hooks/useMutateTransaction.test.tsx \
          src/components/transactions/AddTransactionDrawer.tsx src/routes/TransactionForm.tsx
  git commit -m "perf: useMutateTransaction delegates to TransactionContext; remove redundant Firestore reads in edit forms"
  ```

---

## Task 5: Replace preference `onSnapshot` listener with `fetchPreferences`

**Files:**
- Modify: `src/hooks/usePreferences.ts`
- Modify: `src/hooks/usePreferences.test.ts`

- [ ] **Step 1: Rewrite `usePreferences.test.ts`**

  Replace the entire file:

  ```ts
  import { describe, expect, it, vi, beforeEach } from 'vitest';

  vi.mock('../firebase/db', () => ({ db: {} }));

  const mockGetDoc = vi.fn();
  vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => 'doc-ref'),
    getDoc: (ref: unknown) => mockGetDoc(ref),
  }));

  import { fetchPreferences, mergeWithDefaults } from './usePreferences';
  import type { BudgetData } from '../firestore/types';

  const mockPreferenceData = {
    accounts: [{ name: 'HDFC', emoji: '🏦', type: 'account', parent: null }],
    categories: [{ name: 'Food', emoji: '🍔', type: 'category', parent: null }],
    subCategories: [],
    vendors: [],
    payments: [{ name: 'UPI', emoji: null, type: 'payment', parent: null }],
    default_currency: { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
    frequent_currencies: ['INR', 'USD'],
    default_entries: { account: 'HDFC' },
  };

  function makeSnap(data: Record<string, unknown> | null, id = 'uid-123') {
    return { exists: () => data !== null, id, data: () => data ?? {} };
  }

  describe('fetchPreferences', () => {
    beforeEach(() => vi.resetAllMocks());

    it('decodes snake_case fields and returns Preference', async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(mockPreferenceData));
      const result = await fetchPreferences('uid-123');
      expect(result.defaultCurrency.code).toBe('INR');
      expect(result.bookmarkedCurrencies).toEqual(['INR', 'USD']);
      expect(result.defaultEntries).toEqual({ account: 'HDFC' });
      expect(result.id).toBe('uid-123');
    });

    it('returns built-in defaults when document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(null));
      const result = await fetchPreferences('uid-123');
      expect(result.categories.length).toBeGreaterThan(0);
      expect(result.defaultCurrency.code).toBe('SGD');
    });

    it('appends unique Firestore entries after defaults without duplicating', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeSnap({
          ...mockPreferenceData,
          payments: [
            { name: 'Cash', emoji: '💵', type: 'payment', parent: null },
            { name: 'PayNow', emoji: '💸', type: 'payment', parent: null },
          ],
        }),
      );
      const result = await fetchPreferences('uid-123');
      const names = result.payments.map((p) => p.name);
      expect(names.filter((n) => n === 'Cash').length).toBe(1);
      expect(names).toContain('PayNow');
    });

    it('propagates getDoc errors', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('permission denied'));
      await expect(fetchPreferences('uid-123')).rejects.toThrow('permission denied');
    });
  });

  describe('mergeWithDefaults', () => {
    it('keeps defaults and appends unique Firestore items', () => {
      const defaults: BudgetData[] = [{ name: 'Cash', emoji: '💵', type: 'payment', parent: null }];
      const fromFirestore: BudgetData[] = [
        { name: 'PayNow', emoji: '💸', type: 'payment', parent: null },
      ];
      const result = mergeWithDefaults(defaults, fromFirestore);
      expect(result.map((r) => r.name)).toContain('Cash');
      expect(result.map((r) => r.name)).toContain('PayNow');
    });

    it('prefers Firestore version for matching names (emoji override)', () => {
      const defaults: BudgetData[] = [{ name: 'Cash', emoji: '💵', type: 'payment', parent: null }];
      const fromFirestore: BudgetData[] = [
        { name: 'cash', emoji: '💰', type: 'payment', parent: null },
      ];
      const result = mergeWithDefaults(defaults, fromFirestore);
      expect(result.find((r) => r.name.toLowerCase() === 'cash')?.emoji).toBe('💰');
      expect(result.filter((r) => r.name.toLowerCase() === 'cash')).toHaveLength(1);
    });
  });
  ```

- [ ] **Step 2: Run to confirm new tests fail**

  ```bash
  npm run test -- usePreferences --reporter=verbose 2>&1 | tail -15
  ```

  Expected: FAIL — `fetchPreferences` / `mergeWithDefaults` not exported.

- [ ] **Step 3: Rewrite `usePreferences.ts`**

  Replace the entire file:

  ```ts
  import { doc, getDoc } from 'firebase/firestore';
  import { db } from '../firebase/db';
  import type { BudgetData, Preference } from '../firestore/types';
  import type { Period } from '../lib/dateUtils';
  import {
    DEFAULT_ACCOUNTS,
    DEFAULT_CATEGORIES,
    DEFAULT_CURRENCY,
    DEFAULT_ENTRIES,
    DEFAULT_PAYMENTS,
    DEFAULT_SUBCATEGORIES,
  } from '../lib/defaultPreferences';

  // Exported so PreferenceProvider can reuse it for applyPreferenceUpdate
  export function mergeWithDefaults(
    defaults: BudgetData[],
    fromFirestore: BudgetData[],
  ): BudgetData[] {
    const firestoreByKey = new Map(
      fromFirestore.map((d) => [`${d.name.toLowerCase()}::${d.parent ?? ''}`, d]),
    );
    const result: BudgetData[] = [];
    for (const def of defaults) {
      const key = `${def.name.toLowerCase()}::${def.parent ?? ''}`;
      result.push(firestoreByKey.get(key) ?? def);
      firestoreByKey.delete(key);
    }
    firestoreByKey.forEach((item) => result.push(item));
    return result;
  }

  function docToPreference(id: string, raw: Record<string, unknown>): Preference {
    return {
      id,
      accounts: mergeWithDefaults(
        DEFAULT_ACCOUNTS,
        (raw['accounts'] as BudgetData[]) ?? [],
      ),
      categories: mergeWithDefaults(
        DEFAULT_CATEGORIES,
        (raw['categories'] as BudgetData[]) ?? [],
      ),
      subCategories: mergeWithDefaults(
        DEFAULT_SUBCATEGORIES,
        (raw['subCategories'] as BudgetData[]) ?? [],
      ),
      vendors: (raw['vendors'] as BudgetData[]) ?? [],
      payments: mergeWithDefaults(
        DEFAULT_PAYMENTS,
        (raw['payments'] as BudgetData[]) ?? [],
      ),
      archivedAccounts: (raw['archivedAccounts'] as BudgetData[]) ?? [],
      defaultCurrency:
        (raw['default_currency'] as Preference['defaultCurrency']) ?? DEFAULT_CURRENCY,
      bookmarkedCurrencies: (raw['frequent_currencies'] as string[]) ?? [],
      defaultEntries:
        (raw['default_entries'] as Record<string, string> | undefined) ?? DEFAULT_ENTRIES,
      theme: raw['theme'] as string | undefined,
      colorMode: raw['colorMode'] as 'system' | 'light' | 'dark' | undefined,
      spendingChartType: raw['spendingChartType'] as 'bar' | 'line' | undefined,
      defaultPeriod: raw['defaultPeriod'] as Period | undefined,
      layoutWidth: raw['layoutWidth'] as 'fixed' | 'full' | undefined,
    };
  }

  export async function fetchPreferences(uid: string): Promise<Preference> {
    const snap = await getDoc(doc(db, 'preference', uid));
    if (snap.exists()) {
      return docToPreference(snap.id, snap.data() as Record<string, unknown>);
    }
    return docToPreference(uid, {});
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npm run test -- usePreferences --reporter=verbose 2>&1 | tail -15
  ```

  Expected: all new tests PASS.

- [ ] **Step 5: Run full suite**

  ```bash
  npm run test 2>&1 | tail -5
  ```

  Expected: all tests pass (PreferenceProvider will still compile because it re-exports from a module that still exists).

- [ ] **Step 6: Commit**

  ```bash
  git add src/hooks/usePreferences.ts src/hooks/usePreferences.test.ts
  git commit -m "perf: replace usePreferences onSnapshot listener with one-shot fetchPreferences"
  ```

---

## Task 6: PreferenceProvider — stateful cache; useUpdatePreference calls context

**Files:**
- Modify: `src/context/PreferenceContext.tsx`
- Modify: `src/context/PreferenceProvider.tsx`
- Modify: `src/hooks/useUpdatePreference.ts`
- Modify: `src/hooks/useUpdatePreference.test.tsx`

- [ ] **Step 1: Update `PreferenceContext.tsx`**

  Replace entire file:

  ```ts
  /* eslint-disable react-refresh/only-export-components */
  import { createContext } from 'react';
  import type { Preference } from '../firestore/types';
  import type { FirestorePreferencePartial } from '../hooks/useUpdatePreference';

  export interface PreferenceContextValue {
    preference: Preference | null;
    loading: boolean;
    error: Error | null;
    applyPreferenceUpdate: (partial: FirestorePreferencePartial) => void;
  }

  export const PreferenceContext = createContext<PreferenceContextValue | null>(null);

  export { PreferenceProvider } from './PreferenceProvider';
  export { usePreferenceContext } from './usePreferenceContext';
  ```

- [ ] **Step 2: Rewrite `PreferenceProvider.tsx`**

  Replace entire file:

  ```tsx
  import { useState, useCallback, useEffect, type ReactNode } from 'react';
  import { useAuth } from '../auth/AuthContext';
  import { fetchPreferences, mergeWithDefaults } from '../hooks/usePreferences';
  import { PreferenceContext, type PreferenceContextValue } from './PreferenceContext';
  import type { Preference } from '../firestore/types';
  import type { FirestorePreferencePartial } from '../hooks/useUpdatePreference';
  import {
    DEFAULT_ACCOUNTS,
    DEFAULT_CATEGORIES,
    DEFAULT_PAYMENTS,
    DEFAULT_SUBCATEGORIES,
  } from '../lib/defaultPreferences';

  export function PreferenceProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const uid = auth.status === 'authenticated' ? auth.user.uid : null;

    const [preference, setPreference] = useState<Preference | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      if (!uid) {
        setPreference(null);
        return;
      }
      setLoading(true);
      setError(null);
      fetchPreferences(uid)
        .then((p) => setPreference(p))
        .catch((e: Error) => setError(e))
        .finally(() => setLoading(false));
    }, [uid]);

    const applyPreferenceUpdate = useCallback(
      (partial: FirestorePreferencePartial) => {
        setPreference((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (partial.accounts !== undefined)
            next.accounts = mergeWithDefaults(DEFAULT_ACCOUNTS, partial.accounts);
          if (partial.categories !== undefined)
            next.categories = mergeWithDefaults(DEFAULT_CATEGORIES, partial.categories);
          if (partial.subCategories !== undefined)
            next.subCategories = mergeWithDefaults(
              DEFAULT_SUBCATEGORIES,
              partial.subCategories,
            );
          if (partial.vendors !== undefined) next.vendors = partial.vendors;
          if (partial.payments !== undefined)
            next.payments = mergeWithDefaults(DEFAULT_PAYMENTS, partial.payments);
          if (partial.archivedAccounts !== undefined)
            next.archivedAccounts = partial.archivedAccounts;
          if (partial.default_currency !== undefined)
            next.defaultCurrency = partial.default_currency;
          if (partial.frequent_currencies !== undefined)
            next.bookmarkedCurrencies = partial.frequent_currencies;
          if (partial.default_entries !== undefined)
            next.defaultEntries = partial.default_entries;
          if (partial.theme !== undefined) next.theme = partial.theme;
          if (partial.colorMode !== undefined) next.colorMode = partial.colorMode;
          if (partial.spendingChartType !== undefined)
            next.spendingChartType = partial.spendingChartType;
          if (partial.defaultPeriod !== undefined) next.defaultPeriod = partial.defaultPeriod;
          if (partial.layoutWidth !== undefined) next.layoutWidth = partial.layoutWidth;
          return next;
        });
      },
      [],
    );

    const value: PreferenceContextValue = { preference, loading, error, applyPreferenceUpdate };

    return (
      <PreferenceContext.Provider value={value}>
        {children}
      </PreferenceContext.Provider>
    );
  }
  ```

- [ ] **Step 3: Update `useUpdatePreference.ts`**

  Replace entire file:

  ```ts
  import { doc, setDoc } from 'firebase/firestore';
  import { db } from '../firebase/db';
  import { useSyncStatus } from '../context/SyncStatusContext';
  import { usePreferenceContext } from '../context/PreferenceContext';
  import type { BudgetData, Currency } from '../firestore/types';
  import type { Period } from '../lib/dateUtils';

  export interface FirestorePreferencePartial {
    accounts?: BudgetData[];
    categories?: BudgetData[];
    subCategories?: BudgetData[];
    vendors?: BudgetData[];
    payments?: BudgetData[];
    archivedAccounts?: BudgetData[];
    default_currency?: Currency;
    frequent_currencies?: string[];
    default_entries?: Record<string, string>;
    theme?: string;
    colorMode?: 'system' | 'light' | 'dark';
    spendingChartType?: 'bar' | 'line';
    defaultPeriod?: Period;
    layoutWidth?: 'fixed' | 'full';
  }

  export function useUpdatePreference(uid: string) {
    const { notifyWrite, notifySynced } = useSyncStatus();
    const { applyPreferenceUpdate } = usePreferenceContext();

    function mutate(partial: FirestorePreferencePartial): void {
      applyPreferenceUpdate(partial);
      notifyWrite();
      void setDoc(doc(db, 'preference', uid), partial, { merge: true }).then(
        () => notifySynced(),
      );
    }

    return { mutate };
  }
  ```

- [ ] **Step 4: Update `useUpdatePreference.test.tsx`**

  Replace the Firestore-call assertions with context call assertions. Open `src/hooks/useUpdatePreference.test.tsx` and replace with:

  ```tsx
  import React from 'react';
  import { renderHook } from '@testing-library/react';
  import { describe, expect, it, vi, beforeEach } from 'vitest';

  vi.mock('../firebase/db', () => ({ db: {} }));
  vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => 'doc-ref'),
    setDoc: vi.fn(() => Promise.resolve()),
  }));

  const mockApplyPreferenceUpdate = vi.fn();
  vi.mock('../context/PreferenceContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../context/PreferenceContext')>();
    return {
      ...actual,
      usePreferenceContext: () => ({
        preference: null,
        loading: false,
        error: null,
        applyPreferenceUpdate: mockApplyPreferenceUpdate,
      }),
    };
  });

  import { setDoc } from 'firebase/firestore';
  import { useUpdatePreference } from './useUpdatePreference';
  import { SyncStatusProvider } from '../context/SyncStatusContext';

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SyncStatusProvider, null, children);

  describe('useUpdatePreference', () => {
    beforeEach(() => vi.resetAllMocks());

    it('calls applyPreferenceUpdate immediately (optimistic)', () => {
      const { result } = renderHook(() => useUpdatePreference('u1'), { wrapper });
      result.current.mutate({ theme: 'ocean' });
      expect(mockApplyPreferenceUpdate).toHaveBeenCalledWith({ theme: 'ocean' });
    });

    it('calls setDoc with merge:true', () => {
      const { result } = renderHook(() => useUpdatePreference('u1'), { wrapper });
      result.current.mutate({ theme: 'ocean' });
      expect(setDoc).toHaveBeenCalledWith('doc-ref', { theme: 'ocean' }, { merge: true });
    });
  });
  ```

- [ ] **Step 5: Run full suite**

  ```bash
  npm run test 2>&1 | tail -5
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/context/PreferenceContext.tsx src/context/PreferenceProvider.tsx \
          src/hooks/useUpdatePreference.ts src/hooks/useUpdatePreference.test.tsx
  git commit -m "perf: PreferenceProvider becomes stateful cache; useUpdatePreference updates local state optimistically"
  ```

---

## Task 7: Replace planner `onSnapshot` listener with `fetchPlanners`

**Files:**
- Modify: `src/hooks/usePlanners.ts`
- Modify: `src/hooks/usePlanners.test.ts`

- [ ] **Step 1: Rewrite `usePlanners.test.ts`**

  Replace entire file:

  ```ts
  import { describe, expect, it, vi, beforeEach } from 'vitest';

  vi.mock('../firebase/db', () => ({ db: {} }));

  const mockGetDocs = vi.fn();
  vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => 'col'),
    query: vi.fn((_col: unknown, ...constraints: unknown[]) => ({ col: _col, constraints })),
    where: vi.fn((...args: unknown[]) => ({ type: 'where', args })),
    orderBy: vi.fn((...args: unknown[]) => ({ type: 'orderBy', args })),
    getDocs: (q: unknown) => mockGetDocs(q),
  }));

  import { fetchPlanners } from './usePlanners';

  function makeDoc(overrides: Record<string, unknown> = {}) {
    return {
      id: 'p1',
      data: () => ({
        user_id: 'u1',
        name: 'Monthly SGD',
        description: '',
        currency: 'SGD',
        active: true,
        archived: false,
        period: 'monthly',
        repeatable: true,
        filter_accounts: [],
        filter_vendors: [],
        filter_payments: [],
        category_budgets: [{ category: 'Food', amount: 1000 }],
        chart_view: 'bar',
        created_at: { toDate: () => new Date('2026-05-01') },
        updated_at: { toDate: () => new Date('2026-05-01') },
        ...overrides,
      }),
    };
  }

  describe('fetchPlanners', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns [] without calling getDocs when uid is empty', async () => {
      const result = await fetchPlanners('');
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('maps snake_case fields to camelCase BudgetPlanner', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [makeDoc()] });
      const result = await fetchPlanners('u1');
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Monthly SGD');
      expect(result[0]!.filterAccounts).toEqual([]);
      expect(result[0]!.categoryBudgets).toEqual([{ category: 'Food', amount: 1000 }]);
      expect(result[0]!.chartView).toBe('bar');
      expect(result[0]!.createdAt).toBeInstanceOf(Date);
    });

    it('propagates getDocs errors', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('permission denied'));
      await expect(fetchPlanners('u1')).rejects.toThrow('permission denied');
    });
  });
  ```

- [ ] **Step 2: Run to confirm new tests fail**

  ```bash
  npm run test -- usePlanners --reporter=verbose 2>&1 | tail -15
  ```

  Expected: FAIL — `fetchPlanners` not exported.

- [ ] **Step 3: Rewrite `usePlanners.ts`**

  Replace entire file:

  ```ts
  import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    type DocumentData,
  } from 'firebase/firestore';
  import { db } from '../firebase/db';
  import type { BudgetPlanner } from '../firestore/types';

  function docToPlanner(id: string, raw: DocumentData): BudgetPlanner {
    return {
      id,
      user_id: raw['user_id'] as string,
      name: raw['name'] as string,
      description: (raw['description'] as string) ?? '',
      currency: raw['currency'] as string,
      active: raw['active'] as boolean,
      archived: raw['archived'] as boolean,
      period: raw['period'] as BudgetPlanner['period'],
      customStart: raw['custom_start']
        ? (raw['custom_start'] as { toDate(): Date }).toDate()
        : undefined,
      customEnd: raw['custom_end']
        ? (raw['custom_end'] as { toDate(): Date }).toDate()
        : undefined,
      repeatable: raw['repeatable'] as boolean,
      filterAccounts: (raw['filter_accounts'] as string[]) ?? [],
      filterVendors: (raw['filter_vendors'] as string[]) ?? [],
      filterPayments: (raw['filter_payments'] as string[]) ?? [],
      categoryBudgets:
        (raw['category_budgets'] as Array<{ category: string; amount: number }>) ?? [],
      chartView: (raw['chart_view'] as BudgetPlanner['chartView']) ?? 'bar',
      createdAt: (raw['created_at'] as { toDate(): Date }).toDate(),
      updatedAt: (raw['updated_at'] as { toDate(): Date }).toDate(),
    };
  }

  export async function fetchPlanners(uid: string): Promise<BudgetPlanner[]> {
    if (!uid) return [];
    const q = query(
      collection(db, 'budget_planners'),
      where('user_id', '==', uid),
      orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToPlanner(d.id, d.data()));
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npm run test -- usePlanners --reporter=verbose 2>&1 | tail -10
  ```

  Expected: all 3 tests PASS.

- [ ] **Step 5: Run full suite**

  ```bash
  npm run test 2>&1 | tail -5
  ```

  Expected: all tests pass (PlannerProvider still compiles with the old shape during this transitional step).

- [ ] **Step 6: Commit**

  ```bash
  git add src/hooks/usePlanners.ts src/hooks/usePlanners.test.ts
  git commit -m "perf: replace usePlanners onSnapshot listener with one-shot fetchPlanners"
  ```

---

## Task 8: PlannerProvider — stateful cache with optimistic mutations; useMutatePlanner delegates to context

**Files:**
- Modify: `src/context/PlannerContext.tsx`
- Modify: `src/context/PlannerProvider.tsx`
- Modify: `src/hooks/useMutatePlanner.ts`
- Modify: `src/hooks/useMutatePlanner.test.tsx`

- [ ] **Step 1: Update `PlannerContext.tsx`**

  Replace entire file:

  ```ts
  /* eslint-disable react-refresh/only-export-components */
  import { createContext } from 'react';
  import type { BudgetPlanner } from '../firestore/types';

  type PlannerInput = Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'>;
  type PlannerPatch = Partial<Omit<BudgetPlanner, 'id' | 'createdAt' | 'updatedAt'>>;

  export type { PlannerInput, PlannerPatch };

  export interface PlannerContextValue {
    planners: BudgetPlanner[];
    loading: boolean;
    error: Error | null;
    addPlanner: (p: PlannerInput) => string;
    updatePlanner: (id: string, patch: PlannerPatch) => void;
    archivePlanner: (id: string) => void;
    deletePlanner: (id: string) => void;
  }

  export const PlannerContext = createContext<PlannerContextValue | null>(null);

  export { PlannerProvider } from './PlannerProvider';
  export { usePlannerContext } from './usePlannerContext';
  ```

- [ ] **Step 2: Rewrite `PlannerProvider.tsx`**

  Replace entire file:

  ```tsx
  import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
  import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
  } from 'firebase/firestore';
  import { db } from '../firebase/db';
  import { useAuth } from '../auth/AuthContext';
  import { useSyncStatus } from './SyncStatusContext';
  import { fetchPlanners } from '../hooks/usePlanners';
  import { isPlannerExpired } from '../lib/plannerUtils';
  import {
    PlannerContext,
    type PlannerContextValue,
    type PlannerInput,
    type PlannerPatch,
  } from './PlannerContext';
  import type { BudgetPlanner } from '../firestore/types';

  function encodePlanner(id: string, p: PlannerInput): Record<string, unknown> {
    const now = Timestamp.now();
    return {
      id,
      user_id: p.user_id,
      name: p.name,
      description: p.description,
      currency: p.currency,
      active: p.active,
      archived: p.archived,
      period: p.period,
      custom_start: p.customStart ? Timestamp.fromDate(p.customStart) : null,
      custom_end: p.customEnd ? Timestamp.fromDate(p.customEnd) : null,
      repeatable: p.repeatable,
      filter_accounts: p.filterAccounts,
      filter_vendors: p.filterVendors,
      filter_payments: p.filterPayments,
      category_budgets: p.categoryBudgets,
      chart_view: p.chartView,
      created_at: now,
      updated_at: now,
    };
  }

  function encodePatch(patch: PlannerPatch): Record<string, unknown> {
    const out: Record<string, unknown> = { updated_at: Timestamp.now() };
    if (patch.name !== undefined) out['name'] = patch.name;
    if (patch.description !== undefined) out['description'] = patch.description;
    if (patch.currency !== undefined) out['currency'] = patch.currency;
    if (patch.active !== undefined) out['active'] = patch.active;
    if (patch.archived !== undefined) out['archived'] = patch.archived;
    if (patch.period !== undefined) out['period'] = patch.period;
    if (patch.customStart !== undefined)
      out['custom_start'] = patch.customStart
        ? Timestamp.fromDate(patch.customStart)
        : null;
    if (patch.customEnd !== undefined)
      out['custom_end'] = patch.customEnd
        ? Timestamp.fromDate(patch.customEnd)
        : null;
    if (patch.repeatable !== undefined) out['repeatable'] = patch.repeatable;
    if (patch.filterAccounts !== undefined)
      out['filter_accounts'] = patch.filterAccounts;
    if (patch.filterVendors !== undefined)
      out['filter_vendors'] = patch.filterVendors;
    if (patch.filterPayments !== undefined)
      out['filter_payments'] = patch.filterPayments;
    if (patch.categoryBudgets !== undefined)
      out['category_budgets'] = patch.categoryBudgets;
    if (patch.chartView !== undefined) out['chart_view'] = patch.chartView;
    return out;
  }

  export function PlannerProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const { notifyWrite, notifySynced } = useSyncStatus();
    const uid = auth.status === 'authenticated' ? auth.user.uid : '';

    const [planners, setPlanners] = useState<BudgetPlanner[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const archivedThisSession = useRef(new Set<string>());

    useEffect(() => {
      if (!uid) {
        setPlanners([]);
        archivedThisSession.current.clear();
        return;
      }
      setLoading(true);
      setError(null);
      fetchPlanners(uid)
        .then((loaded) => {
          setPlanners(loaded);
          // Auto-archive expired planners once after initial load
          for (const planner of loaded) {
            if (
              !planner.archived &&
              !archivedThisSession.current.has(planner.id) &&
              isPlannerExpired(planner)
            ) {
              archivedThisSession.current.add(planner.id);
              void updateDoc(doc(db, 'budget_planners', planner.id), {
                archived: true,
                active: false,
                updated_at: Timestamp.now(),
              });
              setPlanners((prev) =>
                prev.map((p) =>
                  p.id === planner.id ? { ...p, archived: true, active: false } : p,
                ),
              );
            }
          }
        })
        .catch((e: Error) => setError(e))
        .finally(() => setLoading(false));
    }, [uid]);

    const addPlanner = useCallback(
      (p: PlannerInput): string => {
        const id = crypto.randomUUID();
        const now = new Date();
        const newPlanner: BudgetPlanner = {
          ...p,
          id,
          createdAt: now,
          updatedAt: now,
        };
        setPlanners((prev) => [newPlanner, ...prev]);
        notifyWrite();
        void setDoc(
          doc(collection(db, 'budget_planners'), id),
          encodePlanner(id, p),
        ).then(() => notifySynced());
        return id;
      },
      [notifyWrite, notifySynced],
    );

    const updatePlanner = useCallback(
      (id: string, patch: PlannerPatch): void => {
        setPlanners((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date() } : p)),
        );
        notifyWrite();
        void updateDoc(doc(db, 'budget_planners', id), encodePatch(patch)).then(
          () => notifySynced(),
        );
      },
      [notifyWrite, notifySynced],
    );

    const archivePlanner = useCallback(
      (id: string): void => {
        setPlanners((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, archived: true, active: false, updatedAt: new Date() } : p,
          ),
        );
        notifyWrite();
        void updateDoc(doc(db, 'budget_planners', id), {
          archived: true,
          active: false,
          updated_at: Timestamp.now(),
        }).then(() => notifySynced());
      },
      [notifyWrite, notifySynced],
    );

    const deletePlanner = useCallback(
      (id: string): void => {
        setPlanners((prev) => prev.filter((p) => p.id !== id));
        notifyWrite();
        void deleteDoc(doc(db, 'budget_planners', id)).then(() => notifySynced());
      },
      [notifyWrite, notifySynced],
    );

    const value: PlannerContextValue = {
      planners,
      loading,
      error,
      addPlanner,
      updatePlanner,
      archivePlanner,
      deletePlanner,
    };

    return (
      <PlannerContext.Provider value={value}>
        {children}
      </PlannerContext.Provider>
    );
  }
  ```

- [ ] **Step 3: Rewrite `useMutatePlanner.ts`**

  Replace entire file:

  ```ts
  import { usePlannerContext, type PlannerInput, type PlannerPatch } from '../context/PlannerContext';

  export function useAddPlanner() {
    const { addPlanner } = usePlannerContext();
    function mutate(planner: PlannerInput): string {
      return addPlanner(planner);
    }
    return { mutate };
  }

  export function useUpdatePlanner() {
    const { updatePlanner } = usePlannerContext();
    function mutate(id: string, patch: PlannerPatch): void {
      updatePlanner(id, patch);
    }
    return { mutate };
  }

  export function useArchivePlanner() {
    const { archivePlanner } = usePlannerContext();
    function mutate(id: string): void {
      archivePlanner(id);
    }
    return { mutate };
  }

  export function useDeletePlanner() {
    const { deletePlanner } = usePlannerContext();
    function mutate(id: string): void {
      deletePlanner(id);
    }
    return { mutate };
  }
  ```

- [ ] **Step 4: Update `useMutatePlanner.test.tsx`**

  Replace entire file:

  ```tsx
  import React from 'react';
  import { renderHook } from '@testing-library/react';
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  const mockAddPlanner = vi.fn(() => 'test-uuid');
  const mockUpdatePlanner = vi.fn();
  const mockArchivePlanner = vi.fn();
  const mockDeletePlanner = vi.fn();

  vi.mock('../context/PlannerContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../context/PlannerContext')>();
    return {
      ...actual,
      usePlannerContext: () => ({
        planners: [],
        loading: false,
        error: null,
        addPlanner: mockAddPlanner,
        updatePlanner: mockUpdatePlanner,
        archivePlanner: mockArchivePlanner,
        deletePlanner: mockDeletePlanner,
      }),
    };
  });

  import {
    useAddPlanner,
    useUpdatePlanner,
    useArchivePlanner,
    useDeletePlanner,
  } from './useMutatePlanner';
  import { SyncStatusProvider } from '../context/SyncStatusContext';

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SyncStatusProvider, null, children);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  describe('useAddPlanner', () => {
    beforeEach(() => vi.resetAllMocks());

    it('calls context addPlanner and returns its id', () => {
      mockAddPlanner.mockReturnValue('test-uuid');
      const { result } = renderHook(() => useAddPlanner(), { wrapper });
      const id = result.current.mutate({
        user_id: 'u1', name: 'Monthly', description: '', currency: 'SGD',
        active: true, archived: false, period: 'monthly', repeatable: true,
        filterAccounts: [], filterVendors: [], filterPayments: [],
        categoryBudgets: [], chartView: 'bar',
      });
      expect(mockAddPlanner).toHaveBeenCalledTimes(1);
      expect(id).toBe('test-uuid');
    });
  });

  describe('useUpdatePlanner', () => {
    beforeEach(() => vi.resetAllMocks());

    it('calls context updatePlanner with id and patch', () => {
      const { result } = renderHook(() => useUpdatePlanner(), { wrapper });
      result.current.mutate('p1', { name: 'Renamed' });
      expect(mockUpdatePlanner).toHaveBeenCalledWith('p1', { name: 'Renamed' });
    });
  });

  describe('useArchivePlanner', () => {
    beforeEach(() => vi.resetAllMocks());

    it('calls context archivePlanner with id', () => {
      const { result } = renderHook(() => useArchivePlanner(), { wrapper });
      result.current.mutate('p1');
      expect(mockArchivePlanner).toHaveBeenCalledWith('p1');
    });
  });

  describe('useDeletePlanner', () => {
    beforeEach(() => vi.resetAllMocks());

    it('calls context deletePlanner with id', () => {
      const { result } = renderHook(() => useDeletePlanner(), { wrapper });
      result.current.mutate('p1');
      expect(mockDeletePlanner).toHaveBeenCalledWith('p1');
    });
  });
  ```

- [ ] **Step 5: Run full suite**

  ```bash
  npm run test 2>&1 | tail -5
  ```

  Expected: all tests pass.

- [ ] **Step 6: Verify no `onSnapshot` calls remain in production source**

  ```bash
  grep -rn "onSnapshot" src --include="*.ts" --include="*.tsx" | grep -v "test\|spec\|\.d\.ts"
  ```

  Expected: no output.

- [ ] **Step 7: Commit**

  ```bash
  git add src/context/PlannerContext.tsx src/context/PlannerProvider.tsx \
          src/hooks/useMutatePlanner.ts src/hooks/useMutatePlanner.test.tsx
  git commit -m "perf: PlannerProvider becomes stateful cache; useMutatePlanner delegates to context; fix auto-archive loop"
  ```

---

## Task 9: Remove stale `hasPendingWrites` from contexts; clean up `notifySnapshot` callers

**Files:**
- Modify: `src/context/TransactionContext.tsx` (already done in Task 3 — verify `hasPendingWrites` is absent)
- Modify: `src/context/PlannerContext.tsx` (already done in Task 8 — verify `hasPendingWrites` is absent)
- Modify: `src/context/TransactionProvider.tsx` — no more `notifySnapshot` calls
- Modify: `src/context/PlannerProvider.tsx` — no more `notifySnapshot` calls

The old contexts exposed `hasPendingWrites` that was fed from snapshot metadata. Now that there are no listeners, this field no longer exists. Some consumer components may still reference it. Find and fix them.

- [ ] **Step 1: Check for remaining `hasPendingWrites` and `notifySnapshot` usage**

  ```bash
  grep -rn "hasPendingWrites\|notifySnapshot" src --include="*.ts" --include="*.tsx" | grep -v "test\|spec\|SyncStatus"
  ```

  If this returns any results (e.g., a component that still reads `hasPendingWrites` from `useTransactionContext()`), remove those references. The `SyncPill` now derives sync state entirely from `SyncStatusContext`, not from the provider contexts.

- [ ] **Step 2: Check for any TypeScript errors**

  ```bash
  npm run typecheck 2>&1 | grep -v "^$" | head -30
  ```

  Expected: no errors. Fix any type errors that arise from the missing `hasPendingWrites` field.

- [ ] **Step 3: Run full suite and typecheck**

  ```bash
  npm run test 2>&1 | tail -5
  npm run typecheck 2>&1 | tail -5
  ```

  Expected: all tests pass, no type errors.

- [ ] **Step 4: Commit**

  ```bash
  git add -p  # stage only changed files
  git commit -m "chore: remove stale hasPendingWrites from transaction and planner contexts"
  ```

---

## Task 10: Add UID guard to `AuthProvider`

**Files:**
- Modify: `src/auth/AuthProvider.tsx`
- Modify: `src/auth/AuthProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

  Open `src/auth/AuthProvider.test.tsx`. Add the following test (check first if the file exists; create if not):

  ```tsx
  import { render, waitFor } from '@testing-library/react';
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  vi.mock('../firebase/db', () => ({ db: {} }));
  vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => 'doc-ref'),
    getDoc: vi.fn(() =>
      Promise.resolve({ exists: () => false, data: () => ({}) }),
    ),
  }));

  const mockOnAuthStateChanged = vi.fn();
  vi.mock('../firebase/client', () => ({
    auth: {},
    app: {},
  }));
  vi.mock('firebase/auth', () => ({
    onAuthStateChanged: (
      _auth: unknown,
      cb: (user: unknown) => void,
    ) => {
      mockOnAuthStateChanged.mockImplementation(cb);
      return () => {};
    },
  }));

  import { getDoc } from 'firebase/firestore';
  import { AuthProvider } from './AuthProvider';
  import React from 'react';

  describe('AuthProvider UID guard', () => {
    beforeEach(() => { vi.resetAllMocks(); });

    it('does not call getDoc again when the same UID fires a second auth event', async () => {
      render(<AuthProvider>{null}</AuthProvider>);
      // First auth event
      await waitFor(() => mockOnAuthStateChanged({
        uid: 'u1',
        displayName: 'Alice',
        email: 'alice@example.com',
        photoURL: null,
      }));
      const firstCallCount = vi.mocked(getDoc).mock.calls.length;

      // Second auth event — same UID (simulates token refresh)
      await waitFor(() => mockOnAuthStateChanged({
        uid: 'u1',
        displayName: 'Alice',
        email: 'alice@example.com',
        photoURL: null,
      }));
      expect(vi.mocked(getDoc).mock.calls.length).toBe(firstCallCount);
    });
  });
  ```

- [ ] **Step 2: Run to confirm it fails**

  ```bash
  npm run test -- AuthProvider --reporter=verbose 2>&1 | tail -15
  ```

  Expected: FAIL — `getDoc` is called twice (no guard yet).

- [ ] **Step 3: Add UID guard to `AuthProvider.tsx`**

  Replace the entire file:

  ```tsx
  import { useEffect, useState, useRef, type ReactNode } from 'react';
  import { onAuthStateChanged, type User } from 'firebase/auth';
  import { doc, getDoc } from 'firebase/firestore';
  import { auth } from '../firebase/client';
  import { db } from '../firebase/db';
  import { AuthContext } from './AuthContext';
  import type { AuthState, BudgetUser } from './types';

  async function toBudgetUser(user: User): Promise<BudgetUser> {
    const budgetUser: BudgetUser = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoUrl: user.photoURL,
    };
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        budgetUser.user_isPremium = userDoc.data()?.user_isPremium ?? false;
      }
    } catch {
      budgetUser.user_isPremium = false;
    }
    return budgetUser;
  }

  export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
    const lastUid = useRef<string | null>(null);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user === null) {
          lastUid.current = null;
          setState({ status: 'anonymous', user: null });
        } else {
          if (lastUid.current === user.uid) return;
          lastUid.current = user.uid;
          const budgetUser = await toBudgetUser(user);
          setState({ status: 'authenticated', user: budgetUser });
        }
      });
      return unsubscribe;
    }, []);

    return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npm run test -- AuthProvider --reporter=verbose 2>&1 | tail -15
  ```

  Expected: PASS.

- [ ] **Step 5: Run full suite + lint + typecheck**

  ```bash
  npm run test 2>&1 | tail -5
  npm run typecheck 2>&1 | tail -5
  npm run lint 2>&1 | tail -5
  ```

  Expected: all pass.

- [ ] **Step 6: Final verification — confirm zero `onSnapshot` in production code**

  ```bash
  grep -rn "onSnapshot" src --include="*.ts" --include="*.tsx" | grep -v "test\|spec\|\.d\.ts"
  ```

  Expected: no output.

- [ ] **Step 7: Commit**

  ```bash
  git add src/auth/AuthProvider.tsx src/auth/AuthProvider.test.tsx
  git commit -m "perf: add UID guard to AuthProvider to skip redundant getDoc on same-user auth events"
  ```

---

## Self-review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Remove transaction `onSnapshot` | Task 2 + 3 |
| Transaction optimistic add/update/delete | Task 3 |
| Transaction rollback on Firestore failure | Task 3 |
| Remove redundant `getDoc` on edit forms | Task 4 |
| Remove preference `onSnapshot` | Task 5 + 6 |
| Preference optimistic update | Task 6 |
| Remove planner `onSnapshot` | Task 7 + 8 |
| Planner optimistic mutations | Task 8 |
| Fix auto-archive write-on-read loop | Task 8 |
| `notifySynced` for SyncPill | Task 1 |
| UID guard in AuthProvider | Task 10 |
| Zero `onSnapshot` in production | Task 8 step 6 + Task 10 step 6 |

All requirements covered. No placeholders found. Types are consistent: `PlannerInput`, `PlannerPatch` defined in `PlannerContext.tsx` and re-exported, used identically in `PlannerProvider.tsx`, `useMutatePlanner.ts`, and the test file.
