import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  IconBell,
  IconBuilding,
  IconGrid,
  IconInbox,
  IconLayers,
  IconLogout,
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

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  superadmin: 'Superadmin',
};

export function AppShell({ title, breadcrumb, actions, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [newTicketsCount, setNewTicketsCount] = useState(0);

  useEffect(() => {
    api
      .get('/admin/dashboard/stats')
      .then((res) => setNewTicketsCount(res.data.data?.statusCounts?.new ?? 0))
      .catch(() => {});
  }, [location.pathname === '/dashboard']);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="sidebar-brand">
          <span className="sidebar-brand-mark">
            <img src="/logo.jpg" alt="Silknode" />
          </span>
          <span className="sidebar-brand-text">Silknode</span>
        </NavLink>

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
                  >
                    <Icon className="sidebar-nav-icon" />
                    <span>{label}</span>
                    {to === '/tickets' && newTicketsCount > 0 && (
                      <span className="sidebar-nav-badge">{newTicketsCount > 99 ? '99+' : newTicketsCount}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar avatar--md">{initials(user?.fullname)}</span>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.fullname ?? 'Admin'}</span>
              <span className="sidebar-user-role">{user?.role ? ROLE_LABELS[user.role] ?? user.role : '—'}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <IconLogout />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-titles">
            {breadcrumb && <span className="topbar-breadcrumb">{breadcrumb}</span>}
            <h1 className="topbar-title">{title}</h1>
          </div>
          {actions && <div className="topbar-actions">{actions}</div>}
          <div className="topbar-right">
            {user?.role && <span className="role-badge">{ROLE_LABELS[user.role] ?? user.role}</span>}
            <button
              type="button"
              className="topbar-bell"
              onClick={() => navigate('/tickets')}
              aria-label="Bildirishnomalar"
              title="Bildirishnomalar"
            >
              <IconBell width={19} height={19} />
              {newTicketsCount > 0 && (
                <span className="topbar-bell-badge">{newTicketsCount > 99 ? '99+' : newTicketsCount}</span>
              )}
            </button>
            <div className="topbar-user">
              <span className="avatar avatar--sm">{initials(user?.fullname)}</span>
              <span className="topbar-user-name">{user?.fullname ?? 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
