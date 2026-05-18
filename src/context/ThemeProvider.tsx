import { useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';
import { usePreferenceContext } from './PreferenceContext';
import { useAuth } from '../auth/AuthContext';
import { useUpdatePreference } from '../hooks/useUpdatePreference';
import { DEFAULT_THEME_ID } from '../lib/themes';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preference } = usePreferenceContext();
  const auth = useAuth();
  const uid = auth.status === 'authenticated' ? auth.user.uid : '';
  const { mutate } = useUpdatePreference(uid);

  const themeId = preference?.theme ?? DEFAULT_THEME_ID;

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const setTheme = useCallback(
    async (id: string) => {
      document.documentElement.dataset.theme = id;
      await mutate({ theme: id });
    },
    [mutate],
  );

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
