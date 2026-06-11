import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { signInWithGoogle } from '../firebase/auth';

function messageForError(code: unknown): string | null {
  if (typeof code !== 'string') return 'Sign-in failed. Please try again.';
  if (code === 'auth/popup-closed-by-user') return null;
  if (code === 'auth/popup-blocked')
    return 'Popup blocked. Please allow popups for this site and try again.';
  return 'Sign-in failed. Please try again.';
}

export interface GoogleSignIn {
  signIn: () => Promise<void>;
  busy: boolean;
  error: string | null;
}

/** Google sign-in flow: triggers the popup, maps errors, redirects on auth. */
export function useGoogleSignIn(): GoogleSignIn {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status === 'authenticated') {
      navigate('/app', { replace: true });
    }
  }, [auth.status, navigate]);

  const signIn = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const code = (e as { code?: unknown } | null)?.code;
      const message = messageForError(code);
      if (message !== null) setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  return { signIn, busy, error };
}
