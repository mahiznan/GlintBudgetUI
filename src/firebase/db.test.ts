import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ app: { name: '[DEFAULT]' } }));
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({ type: 'firestore' })),
  persistentLocalCache: vi.fn(() => ({ kind: 'persistent' })),
}));

import { db } from './db';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

describe('db', () => {
  it('calls initializeFirestore with persistentLocalCache and exports the result', () => {
    expect(persistentLocalCache).toHaveBeenCalled();
    expect(initializeFirestore).toHaveBeenCalledWith(
      { name: '[DEFAULT]' },
      { localCache: { kind: 'persistent' } },
    );
    expect(db).toEqual({ type: 'firestore' });
  });
});
