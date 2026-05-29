import { useState, useMemo, useRef, useEffect } from 'react';
import { usePreferenceContext } from '../context/PreferenceContext';
import { useTransactionContext } from '../context/TransactionContext';
import { useDeleteTransaction } from '../hooks/useMutateTransaction';
import TransactionTable, { type SortKey } from '../components/transactions/TransactionTable';
import DeleteConfirmDialog from '../components/transactions/DeleteConfirmDialog';

const PAGE_SIZE = 25;

export default function TransactionList() {
  const { preference } = usePreferenceContext();
  const { transactions, loading, error } = useTransactionContext();
  const { mutate: deleteTx } = useDeleteTransaction();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const currencySymbol = preference?.defaultCurrency.symbol ?? '₹';

  function handleSort(key: SortKey) {
    setVisibleCount(PAGE_SIZE);
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function handleSearch(value: string) {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  }

  const processed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const searched =
      q === ''
        ? transactions
        : transactions.filter(
            (tx) =>
              tx.subCategory.toLowerCase().includes(q) ||
              tx.vendor.toLowerCase().includes(q) ||
              tx.category.toLowerCase().includes(q) ||
              tx.payment.toLowerCase().includes(q) ||
              tx.notes.toLowerCase().includes(q),
          );

    return [...searched].sort((a, b) => {
      const d = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'subCategory':
          return d * a.subCategory.localeCompare(b.subCategory);
        case 'category':
          return d * a.category.localeCompare(b.category);
        case 'date':
          return d * (a.date.getTime() - b.date.getTime());
        case 'payment':
          return d * a.payment.localeCompare(b.payment);
        case 'amount':
          return d * (a.amount - b.amount);
      }
    });
  }, [transactions, searchQuery, sortKey, sortDir]);

  const hasMore = visibleCount < processed.length;
  const visible = processed.slice(0, visibleCount);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((n) => n + PAGE_SIZE);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  function handleDelete(id: string) {
    setDeletingId(null);
    deleteTx(id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="m-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700"
        role="alert"
      >
        Couldn't load transactions.{' '}
        <button className="underline ml-1" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-5">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm select-none">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search transactions…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>
      <TransactionTable
        transactions={visible}
        currencySymbol={currencySymbol}
        onDelete={setDeletingId}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />
      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center text-text-muted text-sm">
          <div className="inline-block w-4 h-4 border-2 border-border border-t-brand rounded-full animate-spin mr-2 align-middle" />
          Loading more…
        </div>
      )}
      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
