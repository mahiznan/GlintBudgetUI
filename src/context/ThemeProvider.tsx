import { useEffect, useCallback, useState } from 'react';
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

  // Local state so setTheme updates the context value immediately without
  // waiting for a Firestore round-trip through usePreferences.
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  // Seed from Firestore preference once it loads (or re-loads after refetch).
  useEffect(() => {
    if (preference?.theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeId(preference.theme);
    }
  }, [preference?.theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  const setTheme = useCallback(
    async (id: string) => {
      setThemeId(id);
      document.documentElement.dataset.theme = id;
      await mutate({ theme: id });
    },
    [mutate],
  );

  return <ThemeContext.Provider value={{ themeId, setTheme }}>{children}</ThemeContext.Provider>;
}
