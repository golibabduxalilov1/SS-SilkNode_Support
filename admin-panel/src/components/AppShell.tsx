import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { IconBuilding, IconGrid, IconInbox, IconLayers, IconLogout, IconUsers } from './icons';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
  { to: '/tickets', label: 'Murojaatlar', icon: IconInbox },
  { to: '/organizations', label: 'Tashkilotlar', icon: IconBuilding },
  { to: '/categories', label: 'Kategoriyalar', icon: IconLayers },
  { to: '/employees', label: 'Xodimlar', icon: IconUsers, superadminOnly: true },
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

export function AppShell({ title, breadcrumb, actions, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">S</span>
          <span className="sidebar-brand-text">Silknode</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter((item) => !item.superadminOnly || user?.role === 'superadmin').map(
            ({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' is-active' : ''}`}
            >
              <Icon className="sidebar-nav-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar avatar--md">{initials(user?.fullname)}</span>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.fullname ?? 'Admin'}</span>
              <span className="sidebar-user-role">{user?.role ?? '—'}</span>
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
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
