import { THEMES } from '../../lib/themes';
import { useTheme } from '../../context/ThemeContext';

export default function AppearanceTab() {
  const { themeId, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6 py-2">
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
    </div>
  );
}
