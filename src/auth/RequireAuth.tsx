import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center text-slate-500"
      >
        Loading…
      </div>
    );
  }

  if (auth.status === 'anonymous') {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}
