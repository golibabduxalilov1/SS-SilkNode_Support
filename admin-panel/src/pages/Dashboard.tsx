import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

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

/** Asosiy TZ bo'lim 6 dagi Dashboard funksiyasi — faqat Web Admin Panel'da (bo'lim 5.3). */
export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
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
    if (!organizationFilter) return tickets;
    return tickets.filter((t) => t.organization?.id === organizationFilter);
  }, [tickets, organizationFilter]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">
            {user?.fullname ?? 'Admin'} — {user?.role}
          </p>
        </div>
        <nav className="dashboard-nav">
          <button onClick={() => navigate('/organizations')}>Tashkilotlar</button>
          <button onClick={logout}>Chiqish</button>
        </nav>
      </header>

      {isLoading ? (
        <p>Yuklanmoqda...</p>
      ) : (
        <>
          {stats && (
            <>
              <div className="stat-cards">
                <div className="stat-card">
                  <span className="stat-value">{stats.statusCounts.new}</span>
                  <span className="stat-label">Yangi</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.statusCounts.in_progress}</span>
                  <span className="stat-label">Ish jarayonida</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.statusCounts.waiting_user}</span>
                  <span className="stat-label">Foydalanuvchi javobi kutilmoqda</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.closedToday}</span>
                  <span className="stat-label">Bugun yopilgan</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.allOpen}</span>
                  <span className="stat-label">Barcha ochiq</span>
                </div>
              </div>

              <div className="time-tracking">
                <h3>Time Tracking</h3>
                <div className="time-tracking-grid">
                  <div>
                    <span className="stat-label">O'rtacha birinchi javob vaqti</span>
                    <span className="stat-value">{formatMinutes(stats.avgFirstResponseMinutes)}</span>
                  </div>
                  <div>
                    <span className="stat-label">O'rtacha yopish vaqti</span>
                    <span className="stat-value">{formatMinutes(stats.avgResolutionMinutes)}</span>
                  </div>
                  <div>
                    <span className="stat-label">Bugun yopilgan</span>
                    <span className="stat-value">{stats.closedToday}</span>
                  </div>
                  <div>
                    <span className="stat-label">Shu hafta yopilgan</span>
                    <span className="stat-value">{stats.closedThisWeek}</span>
                  </div>
                  <div>
                    <span className="stat-label">Shu oy yopilgan</span>
                    <span className="stat-value">{stats.closedThisMonth}</span>
                  </div>
                </div>
              </div>

              {stats.byAssignee.length > 0 && (
                <div className="time-tracking">
                  <h3>Ijrochilar bo'yicha</h3>
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
                          <td>{a.fullname ?? a.userId}</td>
                          <td>{a.ticketsClosed}</td>
                          <td>{formatMinutes(a.avgFirstResponseMinutes)}</td>
                          <td>{formatMinutes(a.avgResolutionMinutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {stats.byOrganization.length > 0 && (
                <div className="time-tracking">
                  <h3>Tashkilotlar bo'yicha</h3>
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
                          <td>{o.organizationName}</td>
                          <td>{o.ticketsCount}</td>
                          <td>{formatMinutes(o.avgResolutionMinutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <div className="filters">
            <label>
              Tashkilot bo'yicha filtr
              <select
                value={organizationFilter}
                onChange={(e) => setOrganizationFilter(e.target.value)}
              >
                <option value="">Barchasi</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredTickets.length === 0 ? (
            <p>Hozircha murojaatlar yo'q.</p>
          ) : (
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
                    <td>{t.number}</td>
                    <td>{t.title}</td>
                    <td>{t.organization?.name ?? '—'}</td>
                    <td>{t.createdBy?.fullname ?? '—'}</td>
                    <td>{t.category}</td>
                    <td>{t.priority}</td>
                    <td>
                      <span className={`status status--${t.status}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td>{t.assignedTo?.fullname ?? '—'}</td>
                    <td>{lastMessage(t)}</td>
                    <td>{new Date(t.createdAt).toLocaleString('uz-UZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
