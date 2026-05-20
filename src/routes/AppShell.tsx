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
  '/app/transactions': 'Transactions',
  '/app/transactions/new': 'New Transaction',
  '/app/settings': 'Settings',
};

function getTitle(pathname: string, firstName: string): string {
  if (pathname.endsWith('/edit')) return 'Edit Transaction';
  if (pathname === '/app/dashboard') return `Hello, ${firstName}`;
  return TITLE_MAP[pathname] ?? 'GlintBudget';
}

export default function AppShell() {
  const auth = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const location = useLocation();

  if (auth.status !== 'authenticated') return null;

  const firstName = auth.user.name?.split(' ')[0] ?? 'there';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar title={getTitle(location.pathname, firstName)} />
        <main className="flex-1 overflow-y-auto bg-surface-alt">
          <div className="max-w-5xl mx-auto w-full">
            <Outlet context={{ period, setPeriod } satisfies AppShellOutletContext} />
          </div>
        </main>
      </div>
    </div>
  );
}
