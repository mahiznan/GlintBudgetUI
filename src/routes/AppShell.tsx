import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { Period } from '../lib/dateUtils';
import { useAuth } from '../auth/AuthContext';
import Sidebar from '../components/layout/Sidebar';

export interface AppShellOutletContext {
  period: Period;
  setPeriod: (p: Period) => void;
}

export default function AppShell() {
  const auth = useAuth();
  const [period, setPeriod] = useState<Period>('month');

  if (auth.status !== 'authenticated') return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-alt">
        <div className="max-w-5xl mx-auto w-full">
          <Outlet context={{ period, setPeriod } satisfies AppShellOutletContext} />
        </div>
      </main>
    </div>
  );
}
