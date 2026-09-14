import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  IconBell,
  IconBuilding,
  IconClose,
  IconGrid,
  IconHistory,
  IconInbox,
  IconLayers,
  IconLogout,
  IconMenu,
  IconMoon,
  IconPanelLeftClose,
  IconPanelLeftOpen,
  IconSun,
  IconUser,
  IconUsers,
} from './icons';
import { LIST_POLL_INTERVAL_MS } from '../utils/pollInterval';
import { TranslationKey } from '../i18n/LanguageContext';

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

function getStatusLabels(t: (key: TranslationKey) => string): Record<string, string> {
  return {
    new: t('appShell.statusNew'),
    in_progress: t('appShell.statusInProgress'),
    waiting_user: t('appShell.statusWaitingUser'),
    resolved: t('appShell.statusResolved'),
    closed: t('appShell.statusClosed'),
  };
}

interface RecentTicket {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedTo?: { id: string } | null;
  hasNewCustomerReply?: boolean;
}

const RECENT_TICKETS_LIMIT = 8;

function truncateTitle(title: string, max = 46): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max).trimEnd()}...`;
}

function formatRelativeTime(dateStr: string, t: (key: TranslationKey) => string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('appShell.justNow');
  if (minutes < 60) return t('appShell.minutesAgo').replace('{n}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('appShell.hoursAgo').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t('appShell.daysAgo').replace('{n}', String(days));
  const months = Math.floor(days / 30);
  if (months < 12) return t('appShell.monthsAgo').replace('{n}', String(months));
  return t('appShell.yearsAgo').replace('{n}', String(Math.floor(months / 12)));
}

function BellTicketItem({
  ticket,
  onClick,
  statusLabels,
  t,
}: {
  ticket: RecentTicket;
  onClick: () => void;
  statusLabels: Record<string, string>;
  t: (key: TranslationKey) => string;
}) {
  return (
    <button type="button" className="topbar-bell-dropdown-item" onClick={onClick}>
      <div className="topbar-bell-dropdown-item-top">
        <span className="topbar-bell-dropdown-item-number">#{ticket.number}</span>
        <span className={`priority priority--${ticket.priority}`}>{ticket.priority}</span>
      </div>
      <span className="topbar-bell-dropdown-item-title">{truncateTitle(ticket.title)}</span>
      <div className="topbar-bell-dropdown-item-bottom">
        <span className={`status status--${ticket.status}`}>{statusLabels[ticket.status] ?? ticket.status}</span>
        <span className="topbar-bell-dropdown-item-time">{formatRelativeTime(ticket.createdAt, t)}</span>
      </div>
    </button>
  );
}

function getNavGroups(t: (key: TranslationKey) => string) {
  return [
    {
      label: t('appShell.groupWork'),
      items: [
        { to: '/dashboard', label: t('appShell.navDashboard'), icon: IconGrid },
        { to: '/tickets', label: t('appShell.navTickets'), icon: IconInbox },
        { to: '/requesters', label: t('appShell.navRequesters'), icon: IconUser },
      ],
    },
    {
      label: t('appShell.groupManagement'),
      items: [
        { to: '/organizations', label: t('appShell.navOrganizations'), icon: IconBuilding },
        { to: '/categories', label: t('appShell.navCategories'), icon: IconLayers },
        { to: '/employees', label: t('appShell.navEmployees'), icon: IconUsers, superadminOnly: true },
        { to: '/logs', label: t('appShell.navLogs'), icon: IconHistory, superadminOnly: true },
      ],
    },
  ];
}

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

export function AppShell({ title, breadcrumb, actions, children, contentClassName }: AppShellProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const ROLE_LABELS: Record<string, string> = {
    admin: t('common.admin'),
    superadmin: t('common.superadmin'),
  };
  const STATUS_LABELS = getStatusLabels(t);
  const NAV_GROUPS = getNavGroups(t);

  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [newRepliesCount, setNewRepliesCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  const [bellOpen, setBellOpen] = useState(false);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [replyTickets, setReplyTickets] = useState<RecentTicket[]>([]);
  const [recentTicketsLoading, setRecentTicketsLoading] = useState(false);
  const [recentTicketsLoaded, setRecentTicketsLoaded] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function loadNewTicketsCount() {
      api
        .get('/admin/dashboard/stats')
        .then((res) => setNewTicketsCount(res.data.data?.statusCounts?.new ?? 0))
        .catch(() => {});
    }
    // T11 — "Yangi javob" bildirishnomasi: mijoz javob yozib, hali ijrochi tomonidan
    // javobsiz qolgan, joriy foydalanuvchiga tayinlangan murojaatlar soni.
    function loadNewRepliesCount() {
      api
        .get('/admin/tickets/notifications/reply-count')
        .then((res) => setNewRepliesCount(res.data.data?.count ?? 0))
        .catch(() => {});
    }

    loadNewTicketsCount();
    loadNewRepliesCount();
    // Yangi murojaat/javob kelganda qo'ng'iroq belgisi qo'lda sahifani yangilamasdan ham
    // yangilanib tursin — barcha sahifalarda ko'rinadigan yagona doimiy indikator (ТЗ band 8).
    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        loadNewTicketsCount();
        loadNewRepliesCount();
      }
    }, LIST_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [location.pathname === '/dashboard']);

  useEffect(() => {
    if (!bellOpen || recentTicketsLoaded) return;
    setRecentTicketsLoading(true);
    api
      .get('/admin/tickets')
      .then((res) => {
        const all: RecentTicket[] = res.data.data ?? [];
        const tickets = all
          .filter((t) => t.status === 'new')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, RECENT_TICKETS_LIMIT);
        setRecentTickets(tickets);
        const replies = all
          .filter((t) => t.hasNewCustomerReply && t.assignedTo?.id === user?.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, RECENT_TICKETS_LIMIT);
        setReplyTickets(replies);
        setRecentTicketsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setRecentTicketsLoading(false));
  }, [bellOpen, recentTicketsLoaded, user?.id]);

  useEffect(() => {
    setRecentTicketsLoaded(false);
  }, [newTicketsCount, newRepliesCount]);

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

  const locksPageScroll = contentClassName?.includes('app-content--table-scroll') ?? false;

  useEffect(() => {
    if (!locksPageScroll) {
      document.body.style.overflow = sidebarOpen ? 'hidden' : '';
      return () => {
        document.body.style.overflow = '';
      };
    }

    // Below 1024px the table-scroll layout switches to letting the whole
    // page flow/scroll (see .app-content--table-scroll in styles.css) —
    // locking body scroll there would trap the user with no way to reach
    // rows/actions below the fold, so only lock on desktop.
    const desktopQuery = window.matchMedia('(min-width: 1025px)');
    const applyLock = () => {
      document.body.style.overflow = sidebarOpen || desktopQuery.matches ? 'hidden' : '';
    };
    applyLock();
    desktopQuery.addEventListener('change', applyLock);
    return () => {
      desktopQuery.removeEventListener('change', applyLock);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, locksPageScroll]);

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

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <div className={`app-shell${collapsed ? ' is-sidebar-collapsed' : ''}`}>
      <div
        className={`sidebar-overlay${sidebarOpen ? ' is-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`}>
        <NavLink to="/dashboard" className="sidebar-brand">
          <span className="sidebar-brand-mark">
            <img src="/logo.png" alt="Silknode" />
          </span>
          <span className="sidebar-brand-text">Silknode</span>
        </NavLink>

        <nav className="sidebar-nav" aria-label={t('appShell.mainNav')}>
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
              <span className="sidebar-user-name">{user?.fullname ?? t('common.admin')}</span>
              <span className="sidebar-user-role">{user?.role ? ROLE_LABELS[user.role] ?? user.role : '—'}</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t('appShell.expandSidebar') : t('appShell.collapseSidebar')}
            aria-expanded={!collapsed}
            title={collapsed ? t('appShell.expand') : t('appShell.collapse')}
          >
            {collapsed ? <IconPanelLeftOpen width={18} height={18} /> : <IconPanelLeftClose width={18} height={18} />}
            <span>{t('appShell.collapse')}</span>
          </button>
          <button className="sidebar-logout" onClick={handleLogout}>
            <IconLogout />
            <span>{t('appShell.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? t('appShell.closeMenu') : t('appShell.openMenu')}
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
            <button
              type="button"
              className="lang-toggle"
              onClick={toggleLanguage}
              aria-label={t('appShell.switchLanguage')}
              title={t('appShell.switchLanguage')}
            >
              {language === 'uz' ? 'UZ' : 'RU'}
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('appShell.switchToLight') : t('appShell.switchToDark')}
              title={theme === 'dark' ? t('appShell.lightMode') : t('appShell.darkMode')}
            >
              {theme === 'dark' ? <IconSun width={19} height={19} /> : <IconMoon width={19} height={19} />}
            </button>
            <div className="topbar-bell-wrap" ref={bellRef}>
              <button
                type="button"
                className="topbar-bell"
                onClick={() => setBellOpen((v) => !v)}
                aria-label={t('appShell.notifications')}
                title={t('appShell.notifications')}
                aria-expanded={bellOpen}
              >
                <IconBell width={19} height={19} />
                {newTicketsCount + newRepliesCount > 0 && (
                  <span className="topbar-bell-badge">
                    {newTicketsCount + newRepliesCount > 99 ? '99+' : newTicketsCount + newRepliesCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="topbar-bell-dropdown">
                  {newRepliesCount > 0 && (
                    <>
                      <div className="topbar-bell-dropdown-header">
                        <span>{t('appShell.newReplies')}</span>
                      </div>
                      <div className="topbar-bell-dropdown-list">
                        {recentTicketsLoading ? (
                          <div className="topbar-bell-dropdown-loading">
                            {Array.from({ length: 2 }).map((_, i) => (
                              <div className="skeleton skeleton-line" key={i} />
                            ))}
                          </div>
                        ) : (
                          replyTickets.map((ticket) => (
                            <BellTicketItem
                              key={ticket.id}
                              ticket={ticket}
                              statusLabels={STATUS_LABELS}
                              t={t}
                              onClick={() => {
                                setBellOpen(false);
                                navigate(`/dashboard/tickets/${ticket.id}`);
                              }}
                            />
                          ))
                        )}
                      </div>
                    </>
                  )}
                  <div className="topbar-bell-dropdown-header">
                    <span>{t('appShell.newTickets')}</span>
                  </div>
                  <div className="topbar-bell-dropdown-list">
                    {recentTicketsLoading ? (
                      <div className="topbar-bell-dropdown-loading">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div className="skeleton skeleton-line" key={i} />
                        ))}
                      </div>
                    ) : recentTickets.length === 0 ? (
                      <p className="topbar-bell-dropdown-empty">{t('appShell.noNewTickets')}</p>
                    ) : (
                      recentTickets.map((ticket) => (
                        <BellTicketItem
                          key={ticket.id}
                          ticket={ticket}
                          statusLabels={STATUS_LABELS}
                          t={t}
                          onClick={() => {
                            setBellOpen(false);
                            navigate(`/dashboard/tickets/${ticket.id}`);
                          }}
                        />
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
                    {t('appShell.viewAll')}
                  </button>
                </div>
              )}
            </div>
            <div className="topbar-user">
              <span className="avatar avatar--sm">{initials(user?.fullname)}</span>
              <span className="topbar-user-name">{user?.fullname ?? t('common.admin')}</span>
            </div>
          </div>
        </header>

        <main className={`app-content${contentClassName ? ` ${contentClassName}` : ''}`}>{children}</main>
      </div>
    </div>
  );
}
