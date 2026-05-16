import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { signInWithGoogle } from '../firebase/auth';

function messageForError(code: unknown): string | null {
  if (typeof code !== 'string') return 'Sign-in failed. Please try again.';
  if (code === 'auth/popup-closed-by-user') return null; // silent
  if (code === 'auth/popup-blocked')
    return 'Popup blocked. Please allow popups for this site and try again.';
  return 'Sign-in failed. Please try again.';
}

export default function SignIn() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (auth.status === 'authenticated') {
    return <Navigate to="/app" replace />;
  }

  async function handleClick() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // AuthProvider's onAuthStateChanged will flip status -> authenticated;
      // the redirect above takes over on the next render.
    } catch (e: unknown) {
      const code = (e as { code?: unknown } | null)?.code;
      const message = messageForError(code);
      if (message !== null) setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-slate-900">Sign in to GlintBudget</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Use the same Google account as your iOS app.
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="mt-6 w-full rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
        {error !== null && (
          <p role="alert" className="mt-4 text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
