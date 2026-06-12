import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/** Persistent sign-in column shown beside the carousel on every slide. */
export default function LoginPanel() {
  const { signIn, busy, error } = useGoogleSignIn();

  return (
    <aside className="login-panel">
      <img className="login-panel-mark" src="/glint.svg" alt="GlintBudget" />
      <h2 className="text-xl font-extrabold">Welcome to GlintBudget</h2>
      <p className="mt-2 max-w-[240px] text-sm text-slate-400">
        Sign in to start tracking your finances
      </p>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="mt-7 flex w-full max-w-[280px] items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-3 text-[15px] font-semibold text-[#3c4043] shadow-md hover:bg-[#f8f9fa] disabled:opacity-60"
      >
        <GoogleIcon />
        {busy ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error !== null && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">Free · No credit card required</p>
    </aside>
  );
}
