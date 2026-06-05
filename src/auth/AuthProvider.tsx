import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase/client';
import { db } from '../firebase/db';
import { AuthContext } from './AuthContext';
import type { AuthState, BudgetUser } from './types';

async function toBudgetUser(user: User): Promise<BudgetUser> {
  const budgetUser: BudgetUser = {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
  };

  // Fetch premium status from users collection
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      budgetUser.user_isPremium = userDoc.data()?.user_isPremium ?? false;
    }
  } catch (error) {
    // If fetch fails, default to non-premium
    budgetUser.user_isPremium = false;
  }

  return budgetUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user === null) {
        setState({ status: 'anonymous', user: null });
      } else {
        const budgetUser = await toBudgetUser(user);
        setState({ status: 'authenticated', user: budgetUser });
      }
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
