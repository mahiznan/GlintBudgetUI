import { useEffect, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ColorModeContext } from './ColorModeContext';
import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import {
  resolveMode,
  applyMode,
  readStoredMode,
  writeStoredMode,
} from '../lib/colorMode';
import type { ColorMode, ResolvedMode } from '../lib/colorMode';

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const { preference } = usePreferenceContext();
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { mutate } = useUpdatePreference(uid);

  // Seed synchronously from localStorage so the value is already correct on the
  // login screen, before the Firestore preference loads.
  const [mode, setModeState] = useState<ColorMode>(() => readStoredMode());
  const [resolvedMode, setResolvedMode] = useState<ResolvedMode>(() =>
    resolveMode(readStoredMode()),
  );

  // Reconcile from Firestore once the preference arrives; keep localStorage in sync.
  useEffect(() => {
    if (preference?.colorMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModeState(preference.colorMode);
      writeStoredMode(preference.colorMode);
    }
  }, [preference?.colorMode]);

  // Apply to <html> whenever the mode changes, and follow the OS while on system.
  useEffect(() => {
    const apply = () => {
      const r = resolveMode(mode);
      setResolvedMode(r);
      applyMode(r);
    };
    apply();
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const setMode = useCallback(
    (next: ColorMode) => {
      setModeState(next);
      writeStoredMode(next);
      applyMode(resolveMode(next));
      mutate({ colorMode: next });
    },
    [mutate],
  );

  return (
    <ColorModeContext.Provider value={{ mode, resolvedMode, setMode }}>
      {children}
    </ColorModeContext.Provider>
  );
}
