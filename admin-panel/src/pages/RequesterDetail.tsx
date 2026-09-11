import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconChevronLeft, IconInbox, IconUser } from '../components/icons';
import { Avatar, EmptyState, TableSkeleton } from '../components/ui';

interface RequesterTicket {
  id: string;
  number: string;
  title: string;
  organization?: { id: string; name: string } | null;
  categoryEntity?: { id: string; name: string } | null;
  priority: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  resolutionMinutes: number | null;
  assignedTo?: { id: string; fullname: string | null } | null;
}

interface RequesterSummary {
  key: string;
  name: string | null;
  phone: string | null;
  organizationId: string | null;
  organizationName: string | null;
  ticketsCount: number;
  lastTicketAt: string;
}

interface RequesterDetailResponse {
  requester: RequesterSummary;
  tickets: RequesterTicket[];
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Yangi' },
  { value: 'in_progress', label: 'Jarayonda' },
  { value: 'waiting_user', label: 'Foydalanuvchi javobi kutilmoqda' },
  { value: 'resolved', label: 'Yechilgan' },
  { value: 'closed', label: 'Yopilgan' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Past' },
  { value: 'medium', label: "O'rta" },
  { value: 'high', label: 'Yuqori' },
  { value: 'critical', label: 'Kritik' },
];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} daq.`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} soat ${mins} daq.` : `${hours} soat`;
}

export function RequesterDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<RequesterDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    setIsLoading(true);
    setError(null);
    api
      .get(`/admin/requesters/${encodeURIComponent(key)}`)
      .then((res) => setDetail(res.data.data))
      .catch(() => setError("Murojaatchi ma'lumotini yuklab bo'lmadi."))
      .finally(() => setIsLoading(false));
  }, [key]);

  if (isLoading) {
    return (
      <AppShell title="Yuklanmoqda…" breadcrumb="Dashboard / Murojaatchilar">
        <TableSkeleton rows={6} cols={7} />
      </AppShell>
    );
  }

  if (error || !detail) {
    return (
      <AppShell title="Murojaatchi" breadcrumb="Dashboard / Murojaatchilar">
        <EmptyState
          icon={<IconUser width={24} height={24} />}
          title="Murojaatchi topilmadi"
          description={error ?? "Bu murojaatchi mavjud emas bo'lishi mumkin."}
        />
      </AppShell>
    );
  }

  const { requester, tickets } = detail;

  return (
    <AppShell title={requester.name ?? 'Murojaatchi'} breadcrumb="Dashboard / Murojaatchilar">
      <div className="ticket-detail-page">
        <button className="btn btn-ghost btn-sm page-back-btn" onClick={() => navigate('/requesters')}>
          <IconChevronLeft width={15} height={15} />
          Murojaatchilar
        </button>

        <div className="ticket-summary-card">
          <div className="ticket-summary-top">
            <div className="ticket-summary-heading">
              <Avatar name={requester.name} size="md" />
              <h2 className="ticket-summary-title">{requester.name ?? '—'}</h2>
            </div>
          </div>

          <div className="ticket-summary-meta">
            <div className="ticket-summary-meta-item">
              <span className="ticket-summary-meta-label">Telefon</span>
              <span className="ticket-summary-meta-value">{requester.phone ?? '—'}</span>
            </div>
            <div className="ticket-summary-meta-item">
              <span className="ticket-summary-meta-label">Tashkilot</span>
              <span className="ticket-summary-meta-value">{requester.organizationName ?? '—'}</span>
            </div>
            <div className="ticket-summary-meta-item">
              <span className="ticket-summary-meta-label">Jami murojaatlar</span>
              <span className="ticket-summary-meta-value">{requester.ticketsCount}</span>
            </div>
            <div className="ticket-summary-meta-item">
              <span className="ticket-summary-meta-label">Oxirgi murojaat</span>
              <span className="ticket-summary-meta-value">
                {new Date(requester.lastTicketAt).toLocaleString('uz-UZ')}
              </span>
            </div>
          </div>
        </div>

        {tickets.length === 0 ? (
          <EmptyState
            icon={<IconInbox width={22} height={22} />}
            title="Murojaatlar topilmadi"
            description="Bu murojaatchining hali murojaatlari yo'q."
          />
        ) : (
          <div className="table-wrap">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Mavzu</th>
                  <th>Tashkilot</th>
                  <th>Kategoriya</th>
                  <th>Muhimlik</th>
                  <th>Holat</th>
                  <th>Mas'ul</th>
                  <th>Tushgan sana</th>
                  <th>Yopilgan sana</th>
                  <th>Tushish vaqti</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="clickable-row"
                    onClick={() => navigate(`/dashboard/tickets/${t.id}`)}
                  >
                    <td className="cell-primary">{t.number}</td>
                    <td>{t.title}</td>
                    <td className="cell-nowrap">{t.organization?.name ?? '—'}</td>
                    <td className="cell-muted">{t.categoryEntity?.name ?? '—'}</td>
                    <td>
                      <span className={`priority priority--${t.priority}`}>
                        {PRIORITY_OPTIONS.find((o) => o.value === t.priority)?.label ?? t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status status--${t.status}`}>
                        {STATUS_OPTIONS.find((o) => o.value === t.status)?.label ?? t.status}
                      </span>
                    </td>
                    <td className="cell-nowrap">{t.assignedTo?.fullname ?? 'Tayinlanmagan'}</td>
                    <td className="cell-muted">
                      <div className="cell-datetime">
                        <span>{new Date(t.createdAt).toLocaleDateString('uz-UZ')}</span>
                        <span className="cell-datetime-time">
                          {new Date(t.createdAt).toLocaleTimeString('uz-UZ')}
                        </span>
                      </div>
                    </td>
                    <td className="cell-muted">
                      {t.closedAt ? (
                        <div className="cell-datetime">
                          <span>{new Date(t.closedAt).toLocaleDateString('uz-UZ')}</span>
                          <span className="cell-datetime-time">
                            {new Date(t.closedAt).toLocaleTimeString('uz-UZ')}
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="cell-muted">
                      {t.resolutionMinutes != null ? formatDuration(t.resolutionMinutes) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
