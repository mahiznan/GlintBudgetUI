import { NavLink, useNavigate } from 'react-router-dom';
import { signOutCurrentUser } from '../../firebase/auth';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../lib/themes';

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: '◈', to: '/app/dashboard'    },
  { label: 'Transactions', icon: '⇌', to: '/app/transactions' },
  { label: 'Settings',     icon: '⚙', to: '/app/settings'     },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { themeId, setTheme } = useTheme();

  async function handleSignOut() {
    navigate('/');
    await signOutCurrentUser();
  }

  return (
    <nav className="border-b border-border bg-surface">
      <div className="max-w-5xl mx-auto flex items-center gap-2 px-6 py-3">

        {/* Wordmark */}
        <span className="text-base font-bold tracking-tight text-text mr-4 flex-shrink-0">
          <span aria-hidden="true" style={{ color: '#96bf0d' }}>●</span>{' '}
          GlintBudget
        </span>

        {/* Nav links */}
        <div className="flex gap-1 flex-1">
          {NAV_ITEMS.map(({ label, icon, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-alt text-text'
                    : 'text-text-muted hover:bg-surface-alt hover:text-text',
                ].join(' ')
              }
            >
              <span aria-hidden="true" className="text-sm">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Theme switcher — square swatches */}
        <div role="group" aria-label="Theme" className="flex items-center gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.name}
              aria-pressed={themeId === t.id}
              onClick={() => void setTheme(t.id)}
              className={[
                'w-5 h-5 rounded-[3px] transition-all',
                themeId === t.id
                  ? 'ring-2 ring-offset-1 scale-110'
                  : 'opacity-60 hover:opacity-100',
              ].join(' ')}
              style={{ background: t.swatchGradient }}
            />
          ))}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="ml-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text border border-border flex-shrink-0"
        >
          <span aria-hidden="true">⎋</span>
          Sign out
        </button>

      </div>
    </nav>
  );
}
