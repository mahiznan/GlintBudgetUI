import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOutCurrentUser } from '../../firebase/auth';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../lib/themes';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '◈', to: '/app/dashboard' },
  { label: 'Transactions', icon: '⇌', to: '/app/transactions' },
  { label: 'Settings', icon: '⚙', to: '/app/settings' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-surface-alt text-text' : 'text-text-muted hover:bg-surface-alt hover:text-text',
  ].join(' ');

export default function Sidebar() {
  const navigate = useNavigate();
  const { themeId, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    setMobileOpen(false);
    navigate('/');
    await signOutCurrentUser();
  }

  return (
    <nav className="border-b border-border bg-surface">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Single row — collapses to wordmark + hamburger on mobile */}
        <div className="flex items-center gap-2 h-12">
          {/* Wordmark */}
          <span className="text-base font-bold tracking-tight text-text mr-2 flex-shrink-0">
            <span aria-hidden="true" style={{ color: '#96bf0d' }}>
              ●
            </span>{' '}
            GlintBudget
          </span>

          {/* Nav links — desktop only */}
          <div className="hidden md:flex gap-1 flex-1">
            {NAV_ITEMS.map(({ label, icon, to }) => (
              <NavLink key={to} to={to} className={navLinkClass}>
                <span aria-hidden="true" className="text-sm">
                  {icon}
                </span>
                {label}
              </NavLink>
            ))}
          </div>

          {/* Theme switcher + sign-out — desktop only */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
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
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text border border-border flex-shrink-0"
            >
              <span aria-hidden="true">⎋</span>
              Sign out
            </button>
          </div>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden ml-auto p-2 rounded-lg text-text-muted hover:bg-surface-alt hover:text-text transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden flex flex-col pb-3 gap-1 border-t border-border pt-2">
            {NAV_ITEMS.map(({ label, icon, to }) => (
              <NavLink
                key={to}
                to={to}
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <span aria-hidden="true" className="text-sm">
                  {icon}
                </span>
                {label}
              </NavLink>
            ))}

            <div className="flex items-center justify-between px-3 pt-2 mt-1 border-t border-border">
              <div role="group" aria-label="Theme" className="flex items-center gap-1.5">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-label={t.name}
                    aria-pressed={themeId === t.id}
                    onClick={() => void setTheme(t.id)}
                    className={[
                      'w-6 h-6 rounded-[3px] transition-all',
                      themeId === t.id
                        ? 'ring-2 ring-offset-1 scale-110'
                        : 'opacity-60 hover:opacity-100',
                    ].join(' ')}
                    style={{ background: t.swatchGradient }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text border border-border"
              >
                <span aria-hidden="true">⎋</span>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
