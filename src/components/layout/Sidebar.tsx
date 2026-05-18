import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: '◈', to: '/app/dashboard'    },
  { label: 'Transactions', icon: '⇌', to: '/app/transactions' },
  { label: 'Settings',     icon: '⚙', to: '/app/settings'     },
];

export default function Sidebar() {
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
    </aside>
  );
}
