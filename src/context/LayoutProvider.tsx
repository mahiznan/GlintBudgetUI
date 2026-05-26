import { useEffect, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutContext } from './LayoutContext';
import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';

const DEFAULT_LAYOUT_WIDTH = 'fixed' as const;

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { preference } = usePreferenceContext();
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { mutate } = useUpdatePreference(uid);

  const [layoutWidth, setLayoutWidthState] = useState<'fixed' | 'full'>(DEFAULT_LAYOUT_WIDTH);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLayoutWidthState(preference?.layoutWidth ?? DEFAULT_LAYOUT_WIDTH);
  }, [preference?.layoutWidth]);

  const setLayoutWidth = useCallback(
    async (w: 'fixed' | 'full') => {
      setLayoutWidthState(w);
      await mutate({ layoutWidth: w });
    },
    [mutate],
  );

  return (
    <LayoutContext.Provider value={{ layoutWidth, setLayoutWidth }}>
      {children}
    </LayoutContext.Provider>
  );
}
