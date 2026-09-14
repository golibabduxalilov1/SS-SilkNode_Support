import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconHistory } from '../components/icons';
import { EmptyState, Pagination, TableSkeleton } from '../components/ui';
import { AuditLogEntry, fetchAuditLogs } from '../api/auditLogs';
import { TranslationKey, useLanguage } from '../i18n/LanguageContext';

interface AdminUser {
  id: string;
  fullname: string | null;
  role: string;
}

function getActionLabels(t: (key: TranslationKey) => string): Record<string, string> {
  return {
    ticket_status_changed: t('logs.actionTicketStatusChanged'),
    ticket_assigned: t('logs.actionTicketAssigned'),
    ticket_priority_changed: t('logs.actionTicketPriorityChanged'),
    employee_created: t('logs.actionEmployeeCreated'),
    employee_updated: t('logs.actionEmployeeUpdated'),
    employee_role_changed: t('logs.actionEmployeeRoleChanged'),
    employee_deleted: t('logs.actionEmployeeDeleted'),
    organization_created: t('logs.actionOrganizationCreated'),
    organization_updated: t('logs.actionOrganizationUpdated'),
    organization_deleted: t('logs.actionOrganizationDeleted'),
    category_created: t('logs.actionCategoryCreated'),
    category_updated: t('logs.actionCategoryUpdated'),
    category_deleted: t('logs.actionCategoryDeleted'),
  };
}

function getEntityTypeLabels(t: (key: TranslationKey) => string): Record<string, string> {
  return {
    ticket: t('logs.entityTicket'),
    user: t('logs.entityUser'),
    organization: t('logs.entityOrganization'),
    category: t('logs.entityCategory'),
  };
}

const PAGE_SIZE = 20;

function formatMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '—';
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '—';
  if ('from' in metadata || 'to' in metadata) {
    return `${metadata.from ?? '—'} → ${metadata.to ?? '—'}`;
  }
  return entries.map(([key, value]) => `${key}: ${value ?? '—'}`).join(', ');
}

/** Admin panel "Loglar" bo'limi — faqat superadmin uchun (AppShell/route darajasida cheklanadi). */
export function LogsPage() {
  const { language, t } = useLanguage();
  const ACTION_LABELS = getActionLabels(t);
  const ENTITY_TYPE_LABELS = getEntityTypeLabels(t);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/admin/users')
      .then((res) => setAdmins(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, actorFilter, dateFrom, dateTo]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchAuditLogs({
      page,
      limit: PAGE_SIZE,
      action: actionFilter || undefined,
      actorId: actorFilter || undefined,
      dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
      dateTo: dateTo ? `${dateTo}T23:59:59.999` : undefined,
    })
      .then((result) => {
        setLogs(result.data);
        setTotal(result.total);
      })
      .catch(() => setError(t('logs.loadError')))
      .finally(() => setIsLoading(false));
  }, [page, actionFilter, actorFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setActionFilter('');
    setActorFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dateLocale = language === 'ru' ? 'ru-RU' : 'uz-UZ';

  return (
    <AppShell title={t('logs.title')} breadcrumb={t('logs.breadcrumb')}>
      <div className="filters">
        <label>
          {t('logs.actionType')}
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('logs.admin')}
          <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullname ?? a.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('logs.dateFrom')}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          {t('logs.dateTo')}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <div className="filters-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
            {t('logs.clearFilters')}
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<IconHistory width={24} height={24} />}
          title={t('logs.notFound')}
          description={t('logs.tryChangeFilter')}
        />
      ) : (
        <>
          <p className="filter-results">
            {total} {t('logs.resultsFound')}
          </p>
          <div className="table-wrap">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>{t('logs.colDate')}</th>
                  <th>{t('logs.colWho')}</th>
                  <th>{t('logs.colAction')}</th>
                  <th>{t('logs.colEntity')}</th>
                  <th>{t('logs.colDetail')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="cell-muted">{new Date(log.createdAt).toLocaleString(dateLocale)}</td>
                    <td className="cell-primary">{log.actorName}</td>
                    <td>{ACTION_LABELS[log.action] ?? log.action}</td>
                    <td className="cell-muted">
                      {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ''}
                    </td>
                    <td className="cell-muted">{formatMetadata(log.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </AppShell>
  );
}
