/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type SyncStatus = 'synced' | 'syncing' | 'pending';

interface SyncStatusContextValue {
  status: SyncStatus;
  notifyWrite: () => void;
  notifySnapshot: (hasPendingWrites: boolean) => void;
}

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [hasPending, setHasPending] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('synced');
  const lastWriteAt = useRef<number>(0);

  const notifyWrite = useCallback(() => {
    lastWriteAt.current = Date.now();
    setHasPending(true);
  }, []);

  const notifySnapshot = useCallback((pendingWrites: boolean) => {
    if (!pendingWrites) setHasPending(false);
  }, []);

  useEffect(() => {
    if (!hasPending) {
      setStatus('synced');
      return;
    }

    const evaluate = () => {
      const age = Date.now() - lastWriteAt.current;
      setStatus(age <= 3000 ? 'syncing' : 'pending');
    };

    evaluate();
    const id = setInterval(evaluate, 500);
    return () => clearInterval(id);
  }, [hasPending]);

  return (
    <SyncStatusContext.Provider value={{ status, notifyWrite, notifySnapshot }}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextValue {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) throw new Error('useSyncStatus must be used within SyncStatusProvider');
  return ctx;
}
