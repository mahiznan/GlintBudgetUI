import { useAuth } from '../auth/AuthContext';
import UserMenu from '../components/UserMenu';

function firstName(name: string | null, email: string | null): string {
  return ((name ?? email) ?? 'there').split(/[\s@]/)[0] ?? 'there';
}

export default function AppShell() {
  const auth = useAuth();
  // AppShell is only mounted inside <RequireAuth>, so status is always 'authenticated' here.
  // The narrowing keeps TS happy and gives a clean dev-time failure if the guard is bypassed.
  if (auth.status !== 'authenticated') return null;
  const user = auth.user;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-slate-900">
            <span aria-hidden="true" className="text-accent">
              ●
            </span>{' '}
            GlintBudget
          </span>
          <UserMenu user={user} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {firstName(user.name, user.email)} 👋
          </h1>
          <p className="mt-4 text-slate-600">
            Transactions, reports, and preferences are coming in later stages.
          </p>
        </div>
      </main>
    </div>
  );
}
