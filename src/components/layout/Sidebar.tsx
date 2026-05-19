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
    <aside
      className="flex h-screen w-[220px] flex-shrink-0 flex-col py-6"
      style={{
        background: 'var(--sidebar-gradient)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient radial blobs */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(150,191,13,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 80, left: -30, width: 120, height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(31,163,46,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Wordmark */}
      <div className="mb-8 px-5">
        <span className="text-xl font-bold tracking-tight text-white">
          <span aria-hidden="true" style={{ color: '#96bf0d' }}>●</span>{' '}
          GlintBudget
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <span aria-hidden="true" className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Theme switcher */}
      <div
        role="group"
        aria-label="Theme"
        className="px-3 pb-3 flex gap-2 justify-center"
      >
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.name}
            aria-pressed={themeId === t.id}
            onClick={() => void setTheme(t.id)}
            className={[
              'w-5 h-5 rounded-full transition-all',
              themeId === t.id
                ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110'
                : 'opacity-60 hover:opacity-100',
            ].join(' ')}
            style={{ background: t.swatchGradient }}
          />
        ))}
      </div>

      {/* Sign out */}
      <div className="px-3 pt-2">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white border border-white/20"
        >
          <span aria-hidden="true" className="text-base">⎋</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
