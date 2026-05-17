import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { Period } from '../lib/dateUtils';
import { useAuth } from '../auth/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';

export interface AppShellOutletContext {
  period: Period;
  setPeriod: (p: Period) => void;
}

const TITLE_MAP: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/transactions': 'Transactions',
  '/app/transactions/new': 'New Transaction',
};

function getTitle(pathname: string): string {
  if (pathname.endsWith('/edit')) return 'Edit Transaction';
  return TITLE_MAP[pathname] ?? 'GlintBudget';
}

export default function AppShell() {
  const auth = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const location = useLocation();

  if (auth.status !== 'authenticated') return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar
          title={getTitle(location.pathname)}
          period={period}
          onPeriodChange={setPeriod}
        />
        <main className="flex-1 overflow-y-auto bg-surface-alt">
          <Outlet context={{ period, setPeriod } satisfies AppShellOutletContext} />
        </main>
      </div>
    </div>
  );
}
