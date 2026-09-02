import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoMark from '../ui/LogoMark';

const PUBLIC_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/events', label: 'Events' },
  { to: '/team', label: 'Our Team' },
  { to: '/history', label: 'History' },
  { to: '/verify-certificate', label: 'Certificates' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `text-sm transition-colors ${isActive ? 'text-copper' : 'text-ink-muted hover:text-ink'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-base/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-base font-semibold tracking-tight text-ink">
            CODE CRAFTERS<span className="text-copper">.</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {PUBLIC_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link to="/dashboard" className="btn-secondary !py-2 !px-4 text-xs">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="text-xs text-ink-muted hover:text-danger transition-colors">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-ink-muted hover:text-ink transition-colors">
                Login
              </Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 text-xs">
                Join the Club
              </Link>
            </>
          )}
        </div>

        <button
          className="p-2 text-ink lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-surface-border bg-base px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-4">
            {PUBLIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass} onClick={() => setOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-surface-border pt-4">
              {user ? (
                <>
                  <Link to="/dashboard" className="btn-secondary text-center text-xs" onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className="text-left text-xs text-ink-muted hover:text-danger">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-ink-muted" onClick={() => setOpen(false)}>
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary text-center text-xs" onClick={() => setOpen(false)}>
                    Join the Club
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
