import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconChevronLeft, IconInbox, IconUser } from '../components/icons';
import { Avatar, EmptyState, TableSkeleton } from '../components/ui';
import { formatDurationMinutes } from '../utils/formatDuration';
import { LIST_POLL_INTERVAL_MS } from '../utils/pollInterval';
import { TranslationKey, useLanguage } from '../i18n/LanguageContext';

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
  processingResolutionMinutes: number | null;
  assignedTo?: { id: string; fullname: string | null } | null;
  requesterName: string | null;
  createdBy?: { fullname: string | null } | null;
}

interface RequesterSummary {
  key: string;
  name: string | null;
  phone: string | null;
  organizationId: string | null;
  organizationName: string | null;
  ticketsCount: number;
  lastTicketAt: string;
  /** T27 — shu telefon raqami bo'yicha qayd etilgan barcha turli ismlar (guruh-murojaatchilar). */
  contactNames: string[];
}

/** Har bir murojaat qaysi ism bilan yozilganini ko'rsatish uchun — requesterName yo'q bo'lsa, uni yozgan xodim (createdBy) ismiga tushadi. */
function ticketRequesterName(t: RequesterTicket): string | null {
  return t.requesterName ?? t.createdBy?.fullname ?? null;
}

interface RequesterDetailResponse {
  requester: RequesterSummary;
  tickets: RequesterTicket[];
}

function getStatusOptions(t: (key: TranslationKey) => string) {
  return [
    { value: 'new', label: t('ticketFields.statusNew') },
    { value: 'in_progress', label: t('ticketFields.statusInProgress') },
    { value: 'waiting_user', label: t('ticketFields.statusWaitingUserLong') },
    { value: 'resolved', label: t('ticketFields.statusResolved') },
    { value: 'closed', label: t('ticketFields.statusClosed') },
  ];
}

function getPriorityOptions(t: (key: TranslationKey) => string) {
  return [
    { value: 'low', label: t('ticketFields.priorityLow') },
    { value: 'medium', label: t('ticketFields.priorityMedium') },
    { value: 'high', label: t('ticketFields.priorityHigh') },
    { value: 'critical', label: t('ticketFields.priorityCritical') },
  ];
}

export function RequesterDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const STATUS_OPTIONS = getStatusOptions(t);
  const PRIORITY_OPTIONS = getPriorityOptions(t);

  const [detail, setDetail] = useState<RequesterDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;

    // background=true — bu murojaatchining murojaatlar tarixi yangi murojaat qo'shilganda yoki
    // holati o'zgarganda ekranni qo'lda yangilamasdan ham yangilanib tursin.
    function load(background = false) {
      if (!background) setIsLoading(true);
      setError(null);
      api
        .get(`/admin/requesters/${encodeURIComponent(key!)}`)
        .then((res) => setDetail(res.data.data))
        .catch(() => {
          if (!background) setError(t('requesterDetail.loadError'));
        })
        .finally(() => {
          if (!background) setIsLoading(false);
        });
    }

    load();
    const intervalId = window.setInterval(() => {
      if (!document.hidden) load(true);
    }, LIST_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (isLoading) {
    return (
      <AppShell title={t('requesterDetail.loading')} breadcrumb={t('requesterDetail.breadcrumb')}>
        <TableSkeleton rows={6} cols={7} />
      </AppShell>
    );
  }

  if (error || !detail) {
    return (
      <AppShell title={t('requesterDetail.title')} breadcrumb={t('requesterDetail.breadcrumb')}>
        <EmptyState
          icon={<IconUser width={24} height={24} />}
          title={t('requesterDetail.notFound')}
          description={error ?? t('requesterDetail.notFoundDescription')}
        />
      </AppShell>
    );
  }

  const { requester, tickets } = detail;

  return (
    <AppShell title={requester.name ?? t('requesterDetail.title')} breadcrumb={t('requesterDetail.breadcrumb')}>
      <div className="ticket-detail-page">
        <button className="btn btn-ghost btn-sm page-back-btn" onClick={() => navigate('/requesters')}>
          <IconChevronLeft width={15} height={15} />
          {t('requesterDetail.backToList')}
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
              <span className="ticket-summary-meta-label">{t('requesterDetail.phone')}</span>
              <span className="ticket-summary-meta-value">{requester.phone ?? '—'}</span>
            </div>
            <div className="ticket-summary-meta-item">
              <span className="ticket-summary-meta-label">{t('requesterDetail.organization')}</span>
              <span className="ticket-summary-meta-value">{requester.organizationName ?? '—'}</span>
            </div>
            <div className="ticket-summary-meta-item">
              <span className="ticket-summary-meta-label">{t('requesterDetail.totalTickets')}</span>
              <span className="ticket-summary-meta-value">{requester.ticketsCount}</span>
            </div>
            <div className="ticket-summary-meta-item">
              <span className="ticket-summary-meta-label">{t('requesterDetail.lastTicket')}</span>
              <span className="ticket-summary-meta-value">
                {new Date(requester.lastTicketAt).toLocaleString(dateLocale)}
              </span>
            </div>
          </div>

          {requester.contactNames.length > 1 && (
            <div className="requester-contact-names">
              <span className="ticket-summary-meta-label">{t('requesterDetail.contactNamesLabel')}</span>
              <div className="requester-contact-names-list">
                {requester.contactNames.map((name) => (
                  <span key={name} className="requester-contact-name-chip">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {tickets.length === 0 ? (
          <EmptyState
            icon={<IconInbox width={22} height={22} />}
            title={t('requesterDetail.ticketsNotFound')}
            description={t('requesterDetail.ticketsNotFoundDescription')}
          />
        ) : (
          <div className="table-wrap">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>{t('requesterDetail.colNumber')}</th>
                  <th>{t('requesterDetail.colSubject')}</th>
                  {requester.contactNames.length > 1 && <th>{t('requesterDetail.colRequester')}</th>}
                  <th>{t('requesterDetail.colOrganization')}</th>
                  <th>{t('requesterDetail.colCategory')}</th>
                  <th>{t('requesterDetail.colPriority')}</th>
                  <th>{t('requesterDetail.colStatus')}</th>
                  <th>{t('requesterDetail.colAssignee')}</th>
                  <th>{t('requesterDetail.colCreatedAt')}</th>
                  <th>{t('requesterDetail.colClosedAt')}</th>
                  <th>{t('requesterDetail.colResolutionTime')}</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((tk) => (
                  <tr
                    key={tk.id}
                    className="clickable-row"
                    onClick={() => navigate(`/dashboard/tickets/${tk.id}`)}
                  >
                    <td className="cell-primary">{tk.number}</td>
                    <td>{tk.title}</td>
                    {requester.contactNames.length > 1 && (
                      <td className="cell-nowrap">{ticketRequesterName(tk) ?? '—'}</td>
                    )}
                    <td className="cell-nowrap">{tk.organization?.name ?? '—'}</td>
                    <td className="cell-muted">{tk.categoryEntity?.name ?? '—'}</td>
                    <td>
                      <span className={`priority priority--${tk.priority}`}>
                        {PRIORITY_OPTIONS.find((o) => o.value === tk.priority)?.label ?? tk.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status status--${tk.status}`}>
                        {STATUS_OPTIONS.find((o) => o.value === tk.status)?.label ?? tk.status}
                      </span>
                    </td>
                    <td className="cell-nowrap">{tk.assignedTo?.fullname ?? t('ticketFields.unassigned')}</td>
                    <td className="cell-muted">
                      <div className="cell-datetime">
                        <span>{new Date(tk.createdAt).toLocaleDateString(dateLocale)}</span>
                        <span className="cell-datetime-time">
                          {new Date(tk.createdAt).toLocaleTimeString(dateLocale)}
                        </span>
                      </div>
                    </td>
                    <td className="cell-muted">
                      {tk.closedAt ? (
                        <div className="cell-datetime">
                          <span>{new Date(tk.closedAt).toLocaleDateString(dateLocale)}</span>
                          <span className="cell-datetime-time">
                            {new Date(tk.closedAt).toLocaleTimeString(dateLocale)}
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="cell-muted">{formatDurationMinutes(tk.resolutionMinutes, '—')}</td>
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
