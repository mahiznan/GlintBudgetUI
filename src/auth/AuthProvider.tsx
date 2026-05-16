import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/client';
import { AuthContext } from './AuthContext';
import type { AuthState, BudgetUser } from './types';

function toBudgetUser(user: User): BudgetUser {
  return {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState(
        user === null
          ? { status: 'anonymous', user: null }
          : { status: 'authenticated', user: toBudgetUser(user) },
      );
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
