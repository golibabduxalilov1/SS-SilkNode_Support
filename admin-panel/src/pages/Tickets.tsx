import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { IconInbox, IconSearch, IconTrash } from '../components/icons';
import { Avatar, EmptyState, TableSkeleton } from '../components/ui';

interface Message {
  id: string;
  text: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  number: string;
  title: string;
  categoryEntity?: { id: string; name: string } | null;
  priority: string;
  status: string;
  createdAt: string;
  closedAt?: string | null;
  organization?: { id: string; name: string } | null;
  createdBy?: { fullname: string | null; phoneNumber: string | null } | null;
  assignedTo?: { id: string; fullname: string | null } | null;
  messages?: Message[];
}

interface Organization {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  fullname: string | null;
  role: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Yangi' },
  { value: 'in_progress', label: 'Jarayonda' },
  { value: 'waiting_user', label: 'Javob kutilmoqda' },
  { value: 'resolved', label: 'Yechilgan' },
  { value: 'closed', label: 'Yopilgan' },
];

function closingDuration(ticket: Ticket): string {
  if (!ticket.closedAt) return '-';
  const minutes = Math.max(
    0,
    Math.round((new Date(ticket.closedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} daqiqa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} soat`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} kun`;
  if (days < 30) return `${Math.round(days / 7)} hafta`;
  return `${Math.round(days / 30)} oy`;
}

/** Asosiy TZ bo'lim 6 dagi murojaatlar jadvali — endi Dashboard'dan ajratilgan alohida bo'lim. */
export function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([api.get('/admin/tickets'), api.get('/admin/organizations'), api.get('/admin/users')])
      .then(([ticketsRes, orgsRes, adminsRes]) => {
        setTickets(ticketsRes.data.data);
        setOrganizations(orgsRes.data.data);
        setAdmins(adminsRes.data.data);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleStatusChange = async (ticket: Ticket, status: string) => {
    try {
      const res = await api.patch(`/admin/tickets/${ticket.id}/status`, { status });
      const updated = res.data.data;
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: updated.status } : t)));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Holatni o'zgartirib bo'lmadi.";
      setError(message);
    }
  };

  const handleAssign = async (ticket: Ticket, assignedToId: string) => {
    try {
      const res = await api.patch(`/admin/tickets/${ticket.id}/assign`, {
        assignedToId: assignedToId || null,
      });
      const updated = res.data.data;
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, assignedTo: updated.assignedTo } : t)));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Ijrochini tayinlab bo'lmadi.";
      setError(message);
    }
  };

  const handleDelete = async (ticket: Ticket) => {
    if (!window.confirm(`"${ticket.title}" murojaatini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
    try {
      await api.delete(`/admin/tickets/${ticket.id}`);
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? "Murojaatni o'chirib bo'lmadi.";
      setError(message);
    }
  };

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
    <AppShell title="Murojaatlar" breadcrumb="Barcha murojaatlar">
      {isLoading ? (
        <TableSkeleton rows={6} cols={10} />
      ) : (
        <>
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
          {error && <p className="form-error">{error}</p>}

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
                    <th>Yopilish vaqti</th>
                    <th>Yaratildi</th>
                    {isSuperadmin && <th></th>}
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
                          <div className="cell-user-info">
                            <span>{t.createdBy?.fullname ?? '—'}</span>
                            {t.createdBy?.phoneNumber && (
                              <span className="cell-muted cell-user-phone">{t.createdBy.phoneNumber}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="cell-muted">{t.categoryEntity?.name ?? '—'}</td>
                      <td>
                        <span className={`priority priority--${t.priority}`}>{t.priority}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`status-select status-select--${t.status}`}
                          value={t.status}
                          onChange={(e) => handleStatusChange(t, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className="assign-select"
                          value={t.assignedTo?.id ?? ''}
                          onChange={(e) => handleAssign(t, e.target.value)}
                        >
                          <option value="">Tayinlanmagan</option>
                          {admins.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.fullname ?? a.id}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="cell-muted">{closingDuration(t)}</td>
                      <td className="cell-muted">{new Date(t.createdAt).toLocaleString('uz-UZ')}</td>
                      {isSuperadmin && (
                        <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="danger" onClick={() => handleDelete(t)}>
                            <IconTrash width={13} height={13} />
                            O'chirish
                          </button>
                        </td>
                      )}
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
