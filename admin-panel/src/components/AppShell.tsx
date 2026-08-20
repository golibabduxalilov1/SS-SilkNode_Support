import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  IconBell,
  IconBuilding,
  IconClose,
  IconDownload,
  IconGrid,
  IconHistory,
  IconInbox,
  IconLayers,
  IconLogout,
  IconMenu,
  IconUsers,
} from './icons';

const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  waiting_user: 'Javob kutilmoqda',
  resolved: 'Yechilgan',
  closed: 'Yopilgan',
};

interface RecentTicket {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

const RECENT_TICKETS_LIMIT = 8;

function truncateTitle(title: string, max = 46): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max).trimEnd()}...`;
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'hozirgina';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} oy oldin`;
  return `${Math.floor(months / 12)} yil oldin`;
}

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
      { to: '/logs', label: 'Loglar', icon: IconHistory, superadminOnly: true },
    ],
  },
];

interface AppShellProps {
  title: string;
  breadcrumb?: string;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
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

export function AppShell({ title, breadcrumb, actions, children, contentClassName }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [recentTicketsLoading, setRecentTicketsLoading] = useState(false);
  const [recentTicketsLoaded, setRecentTicketsLoaded] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get('/admin/dashboard/stats')
      .then((res) => setNewTicketsCount(res.data.data?.statusCounts?.new ?? 0))
      .catch(() => {});
  }, [location.pathname === '/dashboard']);

  useEffect(() => {
    if (!bellOpen || recentTicketsLoaded) return;
    setRecentTicketsLoading(true);
    api
      .get('/admin/tickets')
      .then((res) => {
        const tickets: RecentTicket[] = (res.data.data ?? [])
          .filter((t: RecentTicket) => t.status === 'new')
          .sort((a: RecentTicket, b: RecentTicket) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, RECENT_TICKETS_LIMIT);
        setRecentTickets(tickets);
        setRecentTicketsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setRecentTicketsLoading(false));
  }, [bellOpen, recentTicketsLoaded]);

  useEffect(() => {
    setRecentTicketsLoaded(false);
  }, [newTicketsCount]);

  useEffect(() => {
    if (!bellOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [bellOpen]);

  useEffect(() => {
    if (!bellOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBellOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bellOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay${sidebarOpen ? ' is-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
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
                    {to === '/tickets' && (
                      <button
                        type="button"
                        className="sidebar-nav-download"
                        title="Murojaatlarni yuklab olish"
                        aria-label="Murojaatlarni yuklab olish"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate('/tickets?export=1');
                        }}
                      >
                        <IconDownload width={13} height={13} />
                      </button>
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
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <IconClose width={20} height={20} /> : <IconMenu width={20} height={20} />}
          </button>
          <div className="topbar-titles">
            {breadcrumb && <span className="topbar-breadcrumb">{breadcrumb}</span>}
            <h1 className="topbar-title">{title}</h1>
          </div>
          {actions && <div className="topbar-actions">{actions}</div>}
          <div className="topbar-right">
            {user?.role && <span className="role-badge">{ROLE_LABELS[user.role] ?? user.role}</span>}
            <div className="topbar-bell-wrap" ref={bellRef}>
              <button
                type="button"
                className="topbar-bell"
                onClick={() => setBellOpen((v) => !v)}
                aria-label="Bildirishnomalar"
                title="Bildirishnomalar"
                aria-expanded={bellOpen}
              >
                <IconBell width={19} height={19} />
                {newTicketsCount > 0 && (
                  <span className="topbar-bell-badge">{newTicketsCount > 99 ? '99+' : newTicketsCount}</span>
                )}
              </button>
              {bellOpen && (
                <div className="topbar-bell-dropdown">
                  <div className="topbar-bell-dropdown-header">
                    <span>Yangi murojaatlar</span>
                  </div>
                  <div className="topbar-bell-dropdown-list">
                    {recentTicketsLoading ? (
                      <div className="topbar-bell-dropdown-loading">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div className="skeleton skeleton-line" key={i} />
                        ))}
                      </div>
                    ) : recentTickets.length === 0 ? (
                      <p className="topbar-bell-dropdown-empty">Yangi murojaatlar yo'q</p>
                    ) : (
                      recentTickets.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          className="topbar-bell-dropdown-item"
                          onClick={() => {
                            setBellOpen(false);
                            navigate(`/dashboard/tickets/${t.id}`);
                          }}
                        >
                          <div className="topbar-bell-dropdown-item-top">
                            <span className="topbar-bell-dropdown-item-number">#{t.number}</span>
                            <span className={`priority priority--${t.priority}`}>{t.priority}</span>
                          </div>
                          <span className="topbar-bell-dropdown-item-title">{truncateTitle(t.title)}</span>
                          <div className="topbar-bell-dropdown-item-bottom">
                            <span className={`status status--${t.status}`}>
                              {STATUS_LABELS[t.status] ?? t.status}
                            </span>
                            <span className="topbar-bell-dropdown-item-time">{formatRelativeTime(t.createdAt)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    className="topbar-bell-dropdown-footer"
                    onClick={() => {
                      setBellOpen(false);
                      navigate('/tickets');
                    }}
                  >
                    Barchasini ko'rish
                  </button>
                </div>
              )}
            </div>
            <div className="topbar-user">
              <span className="avatar avatar--sm">{initials(user?.fullname)}</span>
              <span className="topbar-user-name">{user?.fullname ?? 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className={`app-content${contentClassName ? ` ${contentClassName}` : ''}`}>{children}</main>
      </div>
    </div>
  );
}
