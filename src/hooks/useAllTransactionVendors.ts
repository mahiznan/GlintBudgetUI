import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/db';

interface UseAllTransactionVendorsResult {
  vendorNames: Set<string>;
  loading: boolean;
}

export function useAllTransactionVendors(uid: string): UseAllTransactionVendorsResult {
  const [vendorNames, setVendorNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    if (!uid) {
      return;
    }
    const col = collection(db, 'transactions');
    const q = query(col, where('user_id', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const names = new Set<string>();
        snap.docs.forEach((d) => {
          const v = (d.data()['vendor'] as string | undefined)?.trim() ?? '';
          if (v) names.add(v);
        });
        setVendorNames(names);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [uid]);

  return { vendorNames, loading };
}
