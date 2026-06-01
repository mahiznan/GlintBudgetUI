import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import type { Period } from '../lib/dateUtils';
import { useAuth } from '../auth/AuthContext';
import { useTransactionContext } from '../context/TransactionContext';
import { useLayout } from '../context/LayoutContext';
import { usePreferenceContext } from '../context/PreferenceContext';
import Sidebar from '../components/layout/Sidebar';
import AddTransactionDrawer from '../components/transactions/AddTransactionDrawer';

export interface AppShellOutletContext {
  period: Period;
  setPeriod: (p: Period) => void;
  fabDate: Date;
  setFabDate: (d: Date) => void;
}

export default function AppShell() {
  const auth = useAuth();
  const { transactions } = useTransactionContext();
  const { layoutWidth } = useLayout();
  const { preference } = usePreferenceContext();
  const [period, setPeriod] = useState<Period>('week');
  const [fabOpen, setFabOpen] = useState(false);
  const [fabDate, setFabDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const periodSynced = useRef(false);

  useEffect(() => {
    if (!periodSynced.current && preference) {
      setPeriod(preference.defaultPeriod ?? 'week');
      periodSynced.current = true;
    }
  }, [preference]);

  if (auth.status !== 'authenticated') return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-alt">
        <div className={layoutWidth === 'fixed' ? 'max-w-5xl mx-auto w-full' : 'w-full'}>
          <Outlet context={{ period, setPeriod, fabDate, setFabDate } satisfies AppShellOutletContext} />
        </div>
      </main>
      <button
        type="button"
        onClick={() => setFabOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-6 z-50 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center transition-opacity hover:opacity-90"
        style={{
          background: 'var(--brand-gradient)',
          boxShadow: '0 4px 20px var(--brand-glow)',
          right: layoutWidth === 'fixed' ? 'max(1.5rem, calc((100vw - 64rem) / 2 + 1.5rem))' : '1.5rem',
        }}
      >
        +
      </button>
      <AddTransactionDrawer
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        transactions={transactions}
        selectedDate={fabDate}
      />
    </div>
  );
}
