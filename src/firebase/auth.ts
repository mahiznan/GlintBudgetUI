import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './client';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}
