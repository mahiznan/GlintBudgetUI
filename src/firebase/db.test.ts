import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ app: { name: '[DEFAULT]' } }));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore' })),
}));

import { db } from './db';
import { getFirestore } from 'firebase/firestore';

describe('db', () => {
  it('calls getFirestore with the app and exports the result', () => {
    expect(getFirestore).toHaveBeenCalled();
    expect(db).toEqual({ type: 'firestore' });
  });
});
