import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  IconBuilding,
  IconChevronLeft,
  IconClose,
  IconGrid,
  IconInbox,
  IconLayers,
  IconLogout,
  IconMenu,
  IconUsers,
} from './icons';

const NAV_GROUPS = [
  {
    label: 'Ish faoliyati',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
      { to: '/tickets', label: 'Murojaatlar', icon: IconInbox },
    ],
  },
  {
    label: 'Boshqaruv',
    items: [
      { to: '/organizations', label: 'Tashkilotlar', icon: IconBuilding },
      { to: '/categories', label: 'Kategoriyalar', icon: IconLayers },
      { to: '/employees', label: 'Xodimlar', icon: IconUsers, superadminOnly: true },
    ],
  },
];

const COLLAPSE_KEY = 'silknode.sidebar.collapsed';
const MOBILE_BREAKPOINT = 900;

interface AppShellProps {
  title: string;
  breadcrumb?: string;
  actions?: ReactNode;
  children: ReactNode;
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

function useIsMobile(breakpoint: number): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

export function AppShell({ title, breadcrumb, actions, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const effectiveCollapsed = collapsed && !isMobile;

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
      menuBtnRef.current?.focus();
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside
        className="sidebar"
        data-collapsed={effectiveCollapsed}
        data-mobile-open={mobileOpen}
        aria-hidden={isMobile && !mobileOpen ? true : undefined}
      >
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">S</span>
          <span className="sidebar-brand-text">Silknode</span>
          <button
            ref={closeBtnRef}
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => (isMobile ? setMobileOpen(false) : setCollapsed((v) => !v))}
            aria-expanded={isMobile ? mobileOpen : !effectiveCollapsed}
            aria-label={isMobile ? 'Menyuni yopish' : effectiveCollapsed ? 'Menyuni yoyish' : "Menyuni yig'ish"}
            title={isMobile ? 'Menyuni yopish' : effectiveCollapsed ? 'Menyuni yoyish' : "Menyuni yig'ish"}
          >
            {isMobile ? (
              <IconClose className="sidebar-collapse-icon" />
            ) : (
              <IconChevronLeft className="sidebar-collapse-icon" />
            )}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Asosiy navigatsiya">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter(
              (item) => !item.superadminOnly || user?.role === 'superadmin',
            );
            if (items.length === 0) return null;
            return (
              <div className="sidebar-group" key={group.label}>
                <span className="sidebar-group-label">{group.label}</span>
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `sidebar-nav-item${isActive ? ' is-active' : ''}`}
                    title={effectiveCollapsed ? label : undefined}
                  >
                    <Icon className="sidebar-nav-icon" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" title={effectiveCollapsed ? user?.fullname ?? 'Admin' : undefined}>
            <span className="avatar avatar--md">{initials(user?.fullname)}</span>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.fullname ?? 'Admin'}</span>
              <span className="sidebar-user-role">{user?.role ?? '—'}</span>
            </div>
          </div>
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            title={effectiveCollapsed ? 'Chiqish' : undefined}
          >
            <IconLogout />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <div className="app-main">
        <header className="topbar">
          <button
            ref={menuBtnRef}
            type="button"
            className="topbar-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Menyuni ochish"
            aria-expanded={mobileOpen}
          >
            <IconMenu />
          </button>
          <div className="topbar-titles">
            {breadcrumb && <span className="topbar-breadcrumb">{breadcrumb}</span>}
            <h1 className="topbar-title">{title}</h1>
          </div>
          {actions && <div className="topbar-actions">{actions}</div>}
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
