import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { Period } from '../lib/dateUtils';
import { useAuth } from '../auth/AuthContext';
import { useTransactionContext } from '../context/TransactionContext';
import Sidebar from '../components/layout/Sidebar';
import AddTransactionDrawer from '../components/transactions/AddTransactionDrawer';

export interface AppShellOutletContext {
  period: Period;
  setPeriod: (p: Period) => void;
}

export default function AppShell() {
  const auth = useAuth();
  const { refetch } = useTransactionContext();
  const [period, setPeriod] = useState<Period>('month');
  const [fabOpen, setFabOpen] = useState(false);

  if (auth.status !== 'authenticated') return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-alt">
        <div className="max-w-5xl mx-auto w-full">
          <Outlet context={{ period, setPeriod } satisfies AppShellOutletContext} />
        </div>
      </main>
      <button
        type="button"
        onClick={() => setFabOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center transition-opacity hover:opacity-90"
        style={{ background: 'var(--brand-gradient)', boxShadow: '0 4px 20px var(--brand-glow)' }}
      >
        +
      </button>
      <AddTransactionDrawer
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
