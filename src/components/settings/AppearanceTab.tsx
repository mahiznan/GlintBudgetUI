import type { ReactNode } from 'react';
import { THEMES } from '../../lib/themes';
import { useTheme } from '../../context/ThemeContext';
import { useLayout } from '../../context/LayoutContext';
import { useColorMode } from '../../context/ColorModeContext';
import type { ColorMode } from '../../lib/colorMode';

const MODE_OPTIONS: { id: ColorMode; label: string; emoji: string }[] = [
  { id: 'system', label: 'System', emoji: '🖥️' },
  { id: 'light', label: 'Light', emoji: '☀️' },
  { id: 'dark', label: 'Dark', emoji: '🌙' },
];

const LAYOUT_OPTIONS: { id: 'fixed' | 'full'; label: string; illustration: ReactNode }[] = [
  {
    id: 'fixed',
    label: 'Fixed width',
    illustration: (
      <div className="w-full flex justify-center">
        <div className="h-5 w-3/5 rounded bg-border" />
      </div>
    ),
  },
  {
    id: 'full',
    label: 'Full width',
    illustration: <div className="h-5 w-full rounded bg-border" />,
  },
];

export default function AppearanceTab() {
  const { themeId, setTheme } = useTheme();
  const { layoutWidth, setLayoutWidth } = useLayout();
  const { mode, setMode } = useColorMode();

  return (
    <div className="flex flex-col gap-6 py-2">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-muted">
          Appearance
        </p>
        <div className="grid grid-cols-3 gap-3">
          {MODE_OPTIONS.map(({ id, label, emoji }) => {
            const isActive = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={[
                  'flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all',
                  isActive
                    ? 'border-[2px] border-accent shadow-[0_0_0_2px_rgba(34,197,94,0.2)]'
                    : 'border-[1.5px] border-border hover:border-brand/60',
                ].join(' ')}
              >
                <span className="text-xs font-bold text-text">
                  {emoji} <span>{label}</span>
                </span>
                {isActive ? (
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                    style={{ background: 'var(--brand-gradient)' }}
                  >
                    ✓
                  </span>
                ) : (
                  <span className="h-4 w-4 rounded-full border-[1.5px] border-border" />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Appearance saved to your account — syncs across all devices.
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-muted">
          App Theme
        </p>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((theme) => {
            const isActive = themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => void setTheme(theme.id)}
                className={[
                  'overflow-hidden rounded-xl text-left transition-all',
                  isActive
                    ? 'border-[2px] border-accent shadow-[0_0_0_2px_rgba(34,197,94,0.2)]'
                    : 'border-[1.5px] border-border hover:border-brand/60',
                ].join(' ')}
              >
                <div className="h-10 w-full" style={{ background: theme.swatchGradient }} />
                <div className="flex items-center justify-between bg-surface px-3 py-2">
                  <span className="text-xs font-bold text-text">
                    {theme.emoji} {theme.name}
                  </span>
                  {isActive ? (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                      style={{ background: 'var(--brand-gradient)' }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border-[1.5px] border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Theme saved to your account — syncs across all devices.
      </p>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-muted">
          Layout Width
        </p>
        <div className="grid grid-cols-2 gap-3">
          {LAYOUT_OPTIONS.map(({ id, label, illustration }) => {
            const isActive = layoutWidth === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => void setLayoutWidth(id)}
                className={[
                  'overflow-hidden rounded-xl text-left transition-all',
                  isActive
                    ? 'border-[2px] border-accent shadow-[0_0_0_2px_rgba(34,197,94,0.2)]'
                    : 'border-[1.5px] border-border hover:border-brand/60',
                ].join(' ')}
              >
                <div className="h-10 w-full bg-surface-alt flex items-center justify-center px-2">
                  {illustration}
                </div>
                <div className="flex items-center justify-between bg-surface px-3 py-2">
                  <span className="text-xs font-bold text-text">{label}</span>
                  {isActive ? (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                      style={{ background: 'var(--brand-gradient)' }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border-[1.5px] border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Layout saved to your account — syncs across all devices.
      </p>
    </div>
  );
}
