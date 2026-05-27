import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { app } from './client';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
