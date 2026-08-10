import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import {
  IconCheck,
  IconClock,
  IconInbox,
  IconLayers,
  IconSearch,
  IconSpinner,
  IconTicketNew,
  IconWait,
} from '../components/icons';
import { Avatar, EmptyState, StatCardSkeleton, TableSkeleton } from '../components/ui';

interface Message {
  id: string;
  text: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  number: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  organization?: { id: string; name: string } | null;
  createdBy?: { fullname: string | null; phoneNumber: string | null } | null;
  assignedTo?: { fullname: string | null } | null;
  messages?: Message[];
}

interface AssigneeStats {
  userId: string;
  fullname: string | null;
  ticketsClosed: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  ticketsCount: number;
  avgResolutionMinutes: number | null;
}

interface DashboardStats {
  statusCounts: {
    new: number;
    in_progress: number;
    waiting_user: number;
    resolved: number;
    closed: number;
  };
  allOpen: number;
  closedToday: number;
  closedThisWeek: number;
  closedThisMonth: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  byAssignee: AssigneeStats[];
  byOrganization: OrganizationStats[];
}

interface Organization {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  waiting_user: 'Javob kutilmoqda',
  resolved: 'Yechilgan',
  closed: 'Yopilgan',
};

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} daq.`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} soat ${rest} daq.`;
}

function lastMessage(ticket: Ticket): string {
  if (!ticket.messages || ticket.messages.length === 0) return '—';
  const sorted = [...ticket.messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const text = sorted[0].text;
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

function gaugeClass(minutes: number | null, goodMax: number, warnMax: number): string {
  if (minutes == null) return 'gauge-fill--good';
  if (minutes <= goodMax) return 'gauge-fill--good';
  if (minutes <= warnMax) return 'gauge-fill--warn';
  return 'gauge-fill--bad';
}

function gaugeWidth(minutes: number | null, warnMax: number): number {
  if (minutes == null) return 0;
  return Math.max(6, Math.min(100, Math.round((minutes / warnMax) * 100)));
}

/** Asosiy TZ bo'lim 6 dagi Dashboard funksiyasi — faqat Web Admin Panel'da (bo'lim 5.3). */
export function DashboardPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/tickets'),
      api.get('/admin/dashboard/stats'),
      api.get('/admin/organizations'),
    ])
      .then(([ticketsRes, statsRes, orgsRes]) => {
        setTickets(ticketsRes.data.data);
        setStats(statsRes.data.data);
        setOrganizations(orgsRes.data.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchesOrg = !organizationFilter || t.organization?.id === organizationFilter;
      const matchesTerm =
        !term ||
        t.number.toLowerCase().includes(term) ||
        t.title.toLowerCase().includes(term) ||
        (t.createdBy?.fullname ?? '').toLowerCase().includes(term);
      return matchesOrg && matchesTerm;
    });
  }, [tickets, organizationFilter, searchTerm]);

  return (
    <AppShell title="Dashboard" breadcrumb="Umumiy ko'rinish">
      {isLoading ? (
        <>
          <div className="stat-cards">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={6} cols={7} />
        </>
      ) : (
        <>
          {stats && (
            <>
              <div className="stat-cards">
                <div className="stat-card">
                  <span className="stat-card-icon" style={{ ['--accent' as any]: 'var(--status-new)', ['--accent-soft' as any]: 'var(--status-new-soft)' }}>
                    <IconTicketNew width={17} height={17} />
                  </span>
                  <span className="stat-value">{stats.statusCounts.new}</span>
                  <span className="stat-label">Yangi</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-icon" style={{ ['--accent' as any]: 'var(--status-in_progress)', ['--accent-soft' as any]: 'var(--status-in_progress-soft)' }}>
                    <IconSpinner width={17} height={17} />
                  </span>
                  <span className="stat-value">{stats.statusCounts.in_progress}</span>
                  <span className="stat-label">Ish jarayonida</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-icon" style={{ ['--accent' as any]: 'var(--status-waiting_user)', ['--accent-soft' as any]: 'var(--status-waiting_user-soft)' }}>
                    <IconWait width={17} height={17} />
                  </span>
                  <span className="stat-value">{stats.statusCounts.waiting_user}</span>
                  <span className="stat-label">Foydalanuvchi javobi kutilmoqda</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-icon" style={{ ['--accent' as any]: 'var(--status-closed)', ['--accent-soft' as any]: 'var(--status-closed-soft)' }}>
                    <IconCheck width={17} height={17} />
                  </span>
                  <span className="stat-value">{stats.closedToday}</span>
                  <span className="stat-label">Bugun yopilgan</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-icon">
                    <IconLayers width={17} height={17} />
                  </span>
                  <span className="stat-value">{stats.allOpen}</span>
                  <span className="stat-label">Barcha ochiq</span>
                </div>
              </div>

              <div className="time-tracking">
                <h3>Time Tracking</h3>
                <p className="time-tracking-subtitle">SLA maqsadlariga nisbatan o'rtacha ko'rsatkichlar</p>
                <div className="time-tracking-grid">
                  <div className="time-metric">
                    <span className="stat-label">
                      <IconClock width={13} height={13} /> O'rtacha birinchi javob vaqti
                    </span>
                    <span className="stat-value">{formatMinutes(stats.avgFirstResponseMinutes)}</span>
                    <div className="gauge">
                      <div
                        className={`gauge-fill ${gaugeClass(stats.avgFirstResponseMinutes, 30, 120)}`}
                        style={{ width: `${gaugeWidth(stats.avgFirstResponseMinutes, 120)}%` }}
                      />
                    </div>
                  </div>
                  <div className="time-metric">
                    <span className="stat-label">
                      <IconClock width={13} height={13} /> O'rtacha yopish vaqti
                    </span>
                    <span className="stat-value">{formatMinutes(stats.avgResolutionMinutes)}</span>
                    <div className="gauge">
                      <div
                        className={`gauge-fill ${gaugeClass(stats.avgResolutionMinutes, 240, 1440)}`}
                        style={{ width: `${gaugeWidth(stats.avgResolutionMinutes, 1440)}%` }}
                      />
                    </div>
                  </div>
                  <div className="time-metric">
                    <span className="stat-label">Bugun yopilgan</span>
                    <span className="stat-value">{stats.closedToday}</span>
                  </div>
                  <div className="time-metric">
                    <span className="stat-label">Shu hafta yopilgan</span>
                    <span className="stat-value">{stats.closedThisWeek}</span>
                  </div>
                  <div className="time-metric">
                    <span className="stat-label">Shu oy yopilgan</span>
                    <span className="stat-value">{stats.closedThisMonth}</span>
                  </div>
                </div>
              </div>

              {stats.byAssignee.length > 0 && (
                <div className="section-card">
                  <h3>Ijrochilar bo'yicha</h3>
                  <div className="table-wrap">
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <th>F.I.Sh</th>
                          <th>Yopgan murojaatlar</th>
                          <th>O'rtacha javob vaqti</th>
                          <th>O'rtacha yopish vaqti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byAssignee.map((a) => (
                          <tr key={a.userId}>
                            <td>
                              <div className="cell-user">
                                <Avatar name={a.fullname} />
                                <span className="cell-primary">{a.fullname ?? a.userId}</span>
                              </div>
                            </td>
                            <td>{a.ticketsClosed}</td>
                            <td>{formatMinutes(a.avgFirstResponseMinutes)}</td>
                            <td>{formatMinutes(a.avgResolutionMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {stats.byOrganization.length > 0 && (
                <div className="section-card">
                  <h3>Tashkilotlar bo'yicha</h3>
                  <div className="table-wrap">
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <th>Tashkilot</th>
                          <th>Murojaatlar soni</th>
                          <th>O'rtacha yopish vaqti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byOrganization.map((o) => (
                          <tr key={o.organizationId}>
                            <td className="cell-primary">{o.organizationName}</td>
                            <td>{o.ticketsCount}</td>
                            <td>{formatMinutes(o.avgResolutionMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="toolbar">
            <div className="toolbar-search">
              <IconSearch width={15} height={15} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Murojaat, mijoz yoki raqam bo'yicha qidirish"
              />
            </div>
            <select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
              <option value="">Barcha tashkilotlar</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {filteredTickets.length === 0 ? (
            <EmptyState
              icon={<IconInbox width={24} height={24} />}
              title="Hozircha murojaatlar yo'q"
              description="Filtrni o'zgartirib ko'ring yoki yangi murojaat kelishini kuting."
            />
          ) : (
            <div className="table-wrap">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mavzu</th>
                    <th>Tashkilot</th>
                    <th>Foydalanuvchi</th>
                    <th>Kategoriya</th>
                    <th>Muhimlik</th>
                    <th>Holat</th>
                    <th>Mas'ul</th>
                    <th>Oxirgi xabar</th>
                    <th>Yaratildi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="clickable-row"
                      onClick={() => navigate(`/dashboard/tickets/${t.id}`)}
                    >
                      <td className="cell-muted">{t.number}</td>
                      <td className="cell-primary">{t.title}</td>
                      <td>{t.organization?.name ?? '—'}</td>
                      <td>
                        <div className="cell-user">
                          <Avatar name={t.createdBy?.fullname} />
                          <span>{t.createdBy?.fullname ?? '—'}</span>
                        </div>
                      </td>
                      <td className="cell-muted">{t.category}</td>
                      <td>
                        <span className={`priority priority--${t.priority}`}>{t.priority}</span>
                      </td>
                      <td>
                        <span className={`status status--${t.status}`}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </td>
                      <td>{t.assignedTo?.fullname ?? '—'}</td>
                      <td className="cell-muted">{lastMessage(t)}</td>
                      <td className="cell-muted">{new Date(t.createdAt).toLocaleString('uz-UZ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
