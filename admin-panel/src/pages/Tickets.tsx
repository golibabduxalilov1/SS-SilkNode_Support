import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconInbox, IconSearch } from '../components/icons';
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
  organization?: { id: string; name: string } | null;
  createdBy?: { fullname: string | null; phoneNumber: string | null } | null;
  assignedTo?: { fullname: string | null } | null;
  messages?: Message[];
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

function lastMessage(ticket: Ticket): string {
  if (!ticket.messages || ticket.messages.length === 0) return '—';
  const sorted = [...ticket.messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const text = sorted[0].text;
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/** Asosiy TZ bo'lim 6 dagi murojaatlar jadvali — endi Dashboard'dan ajratilgan alohida bo'lim. */
export function TicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/tickets'), api.get('/admin/organizations')])
      .then(([ticketsRes, orgsRes]) => {
        setTickets(ticketsRes.data.data);
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
