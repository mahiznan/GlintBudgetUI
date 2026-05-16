import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function AuthCta() {
  const auth = useAuth();
  if (auth.status === 'loading') return null;
  if (auth.status === 'authenticated') {
    return (
      <Link
        to="/app"
        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
      >
        Open dashboard
      </Link>
    );
  }
  return (
    <Link
      to="/signin"
      className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
    >
      Sign in
    </Link>
  );
}

function Header() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-xl font-bold tracking-tight text-slate-900">
          <span aria-hidden="true" className="text-accent">
            ●
          </span>{' '}
          GlintBudget
        </span>
        <div className="flex items-center gap-6">
          <nav aria-label="Primary" className="hidden gap-6 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#footer" className="hover:text-slate-900">
              About
            </a>
          </nav>
          <AuthCta />
        </div>
      </div>
    </header>
  );
}

export default Header;
