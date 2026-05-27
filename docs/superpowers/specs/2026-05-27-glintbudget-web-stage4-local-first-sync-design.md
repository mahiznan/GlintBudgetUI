# GlintBudget Web — Stage 4: Local-First Sync & Status Indicator

**Date:** 2026-05-27  
**Status:** Approved

---

## 1. Goal

Replace the current request-response Firestore pattern (fetch-on-mount, await-on-write) with a local-first architecture: all data loads instantly from IndexedDB on login, every mutation reflects in the UI immediately, and Firestore sync happens asynchronously in the background. A persistent three-state indicator in the nav bar tells the user whether their data is in sync.

---

## 2. Decisions Made

| Question | Decision |
|---|---|
| Offline depth | Optimistic updates + IndexedDB persistence. Writes queue locally; retry is SDK-managed. |
| Cache scope | Everything: transactions, preferences, and budget/category data in preferences. |
| Sync failure behaviour | SDK retries automatically. Indicator stays "Pending Sync" until confirmed. |
| Real-time remote updates | Yes — `onSnapshot` listeners remain active; iOS app changes appear without a page reload. |
| Indicator placement | Inline pill in the nav bar, between the theme swatches and Sign out. |
| Architecture approach | Firebase Offline Persistence (SDK-native via `persistentLocalCache`). |

---

## 3. Architecture

### 3.1 Core mechanism

Enable Firestore's built-in `persistentLocalCache` (IndexedDB) in `src/firebase/db.ts`. This single change gives the SDK a local store — all reads hit cache first, all writes queue locally before going to the server. No custom cache management or retry logic is needed.

### 3.2 Data flow

```
Login
  └─ onSnapshot(transactions query)  ──┐
  └─ onSnapshot(preference doc)      ──┤── fires immediately from IndexedDB cache
                                        └── fires again when server responds

User writes a transaction
  └─ void setDoc(...)            fire-and-forget (SDK queues to IndexedDB)
       └─ onSnapshot fires       immediately, hasPendingWrites: true  ← UI updates here
            └─ Firestore acks    onSnapshot fires again, hasPendingWrites: false

iOS app writes a transaction
  └─ Firestore pushes change     onSnapshot fires; merged automatically by SDK
```

### 3.3 Files changed

| File | Change |
|---|---|
| `src/firebase/db.ts` | Swap `getFirestore` for `initializeFirestore` + `persistentLocalCache()` |
| `src/hooks/useTransactions.ts` | Replace `getDocs` + tick/refetch with `onSnapshot`; expose `hasPendingWrites` from snapshot metadata |
| `src/hooks/usePreferences.ts` | Replace `getDoc` + tick with `onSnapshot` on the single preference doc |
| `src/hooks/useMutateTransaction.ts` | Remove `await` from all three hooks; call `notifyWrite()` before firing; remove loading/error state |
| `src/context/TransactionContext.tsx` | Add `hasPendingWrites: boolean` to `TransactionContextValue`; remove `refetch` |
| `src/context/TransactionProvider.tsx` | Pass `hasPendingWrites` from hook to context; call `notifySnapshot` |
| `src/context/PreferenceProvider.tsx` | Call `notifySnapshot` from `usePreferences` result so preference writes drive the indicator |
| `src/components/layout/Sidebar.tsx` | Add `<SyncPill />` between theme swatches and Sign out (desktop + mobile dropdown) |
| `src/App.tsx` | Add `<SyncStatusProvider>` wrapping both `PreferenceProvider` and `TransactionProvider` (must be outer) |
| `src/context/SyncStatusContext.tsx` | **New** — three-state sync machine |
| `src/components/layout/SyncPill.tsx` | **New** — inline nav pill |

---

## 4. SyncStatusContext

### 4.1 Public API

```ts
type SyncStatus = 'synced' | 'syncing' | 'pending';

interface SyncStatusContextValue {
  status: SyncStatus;
  notifyWrite: () => void;                       // called by mutation hooks
  notifySnapshot: (hasPendingWrites: boolean) => void; // called by onSnapshot listeners
}
```

### 4.2 Internal state

Two pieces of internal state drive the derived `status`:

- `hasPending: boolean` — set to `true` by `notifyWrite()`, reset to `false` when `notifySnapshot(false)` is called
- `lastWriteAt: React.MutableRefObject<number>` — timestamp of the most recent `notifyWrite()` call

### 4.3 Status derivation

| Condition | Status |
|---|---|
| `hasPending === false` | `synced` |
| `hasPending === true` and `Date.now() − lastWriteAt ≤ 3000 ms` | `syncing` |
| `hasPending === true` and `Date.now() − lastWriteAt > 3000 ms` | `pending` |

A 500 ms `setInterval` re-evaluates the status while `hasPending` is true, so the `syncing → pending` transition fires on schedule even when no new snapshots arrive. The interval clears itself when `hasPending` goes false.

Both the transaction snapshot listener and the preference snapshot listener call `notifySnapshot`. Status is `pending` if *either* has unconfirmed writes.

---

## 5. Mutation hooks change

```ts
// Before
async function mutate(tx: TxInput): Promise<string> {
  setLoading(true);
  await setDoc(...)    // blocks UI
  return id;
}

// After
function mutate(tx: TxInput): string {
  const id = crypto.randomUUID();
  notifyWrite();       // tell SyncStatusContext a write is in flight
  void setDoc(...)     // fire-and-forget
  return id;           // returns immediately
}
```

The `loading` / `error` state on mutation hooks is removed. The UI never blocks on a write. Errors surface through the sync indicator (writes that never confirm keep `hasPendingWrites: true`).

Callers that currently call `refetch()` after a mutation remove those calls — `onSnapshot` keeps the context current automatically.

---

## 6. onSnapshot wiring

`includeMetadataChanges: true` is required on every listener so the SDK fires the callback when `hasPendingWrites` changes (not only when document data changes).

```ts
onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
  dispatch({ type: 'success', data: snap.docs.map(docToTransaction), hasPendingWrites: snap.metadata.hasPendingWrites });
});
```

The cleanup function returned by `onSnapshot` is returned from `useEffect` to unsubscribe on unmount.

---

## 7. SyncPill component

**File:** `src/components/layout/SyncPill.tsx`

| State | Label | Dot colour | Dot animation |
|---|---|---|---|
| `synced` | In Sync | `#22c55e` (green) | None (static) |
| `syncing` | Syncing… | `#3b82f6` (blue) | `pulse 1.2s ease-in-out infinite` (scale + opacity) |
| `pending` | Pending Sync | `#f97316` (orange) | None (static — it's waiting, not actively uploading) |

The pill uses CSS `transition: background 200ms, color 200ms, border-color 200ms` for smooth state changes with no layout shift.

Accessibility: `role="status"` + `aria-live="polite"` on the pill element so screen readers announce state changes without interrupting the user.

The pill appears in both the desktop nav bar and the mobile dropdown menu — it is never hidden on small screens.

---

## 8. Error handling

| Scenario | Behaviour |
|---|---|
| IndexedDB blocked (private/incognito) | SDK silently falls back to in-memory cache. App works; persistence lost across reloads. Sync indicator still functions. |
| No cache, no network on login | `onSnapshot` fires error callback → existing `error` state in `TransactionContext` shows error UI. |
| Write never confirms | `hasPendingWrites` stays `true`; indicator stays "Pending Sync". SDK retries indefinitely. Write completes when connectivity resumes. |
| Same document edited twice quickly | SDK serialises writes in order. Last write wins on server. `onSnapshot` reflects final confirmed state only — no flicker. |
| Stale cache on login | First `onSnapshot` fire (`fromCache: true`) loads instantly. Server response fires second (`fromCache: false`) with fresh data. Context updates and widgets re-render if data changed. |

---

## 9. Testing

| File | What to test |
|---|---|
| `SyncStatusContext` | `notifyWrite()` → status `syncing`; `notifySnapshot(false)` → status `synced`; 3 s timeout → status `pending` (use `vi.useFakeTimers`) |
| `SyncPill` | Correct label + `role`/`aria-live` for each of the 3 status values; pulsing dot class only in `syncing` state |
| `useTransactions` | Mocked `onSnapshot` with `hasPendingWrites: true` → context reflects it; unsubscribes on unmount |
| `useMutateTransaction` | `mutate()` calls `notifyWrite()` and returns synchronously; `setDoc` is called without `await` |
| `usePreferences` | Same `onSnapshot` pattern as `useTransactions` |

Not tested here: Firebase SDK retry/offline behaviour (that is Firebase's responsibility), the exact 3-second threshold (UX tuning parameter, not a correctness invariant).

---

## 10. Out of scope

- Custom retry backoff (1 → 3 → 5 → 10 s) — deferred; SDK retry is sufficient for Stage 4
- Conflict resolution for multi-device simultaneous edits — last-write-wins via Firestore timestamps is acceptable for a single-user personal finance app
- Preferences UI (currency, theme) — Stage 5
- PWA / push notifications — Stage 6+
