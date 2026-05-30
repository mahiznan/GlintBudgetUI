import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/db';
import { useSyncStatus } from '../context/SyncStatusContext';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useBulkRenameAccount() {
  const { notifyWrite } = useSyncStatus();

  function mutate(uid: string, oldName: string, newName: string): void {
    notifyWrite();
    void (async () => {
      const col = collection(db, 'transactions');
      const q = query(col, where('user_id', '==', uid), where('account', '==', oldName));
      const snap = await getDocs(q);
      const groups = chunk(snap.docs, 500);
      await Promise.all(
        groups.map((group) => {
          const batch = writeBatch(db);
          group.forEach((d) => batch.update(d.ref, { account: newName }));
          return batch.commit();
        }),
      );
    })();
  }

  return { mutate };
}
