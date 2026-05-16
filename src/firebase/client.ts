import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Copy .env.example to .env.local and fill in your Firebase web config.`,
    );
  }
  return value;
}

const firebaseConfig = {
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
};

// Vite HMR re-evaluates modules; reuse the app on the second eval.
export const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
