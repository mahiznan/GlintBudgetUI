import { useEffect, useRef, useState } from 'react';
import { signOutCurrentUser } from '../firebase/auth';
import type { BudgetUser } from '../auth/types';

function labelFor(user: BudgetUser): string {
  return user.name ?? user.email ?? 'Signed in';
}

export default function UserMenu({ user }: { user: BudgetUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOutCurrentUser();
    // AuthProvider flips to anonymous; <RequireAuth> on /app sends user to /signin.
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:border-slate-300"
      >
        {user.photoUrl !== null && (
          <img src={user.photoUrl} alt="" className="h-7 w-7 rounded-full" />
        )}
        <span>{labelFor(user)}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
