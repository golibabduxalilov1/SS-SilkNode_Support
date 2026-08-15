import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconHistory } from '../components/icons';
import { EmptyState, Pagination, TableSkeleton } from '../components/ui';
import { AuditLogEntry, fetchAuditLogs } from '../api/auditLogs';

interface AdminUser {
  id: string;
  fullname: string | null;
  role: string;
}

const ACTION_LABELS: Record<string, string> = {
  ticket_status_changed: "Murojaat holati o'zgartirildi",
  ticket_assigned: 'Murojaat tayinlandi',
  employee_created: "Xodim qo'shildi",
  employee_updated: 'Xodim tahrirlandi',
  employee_role_changed: "Xodim roli o'zgartirildi",
  employee_deleted: "Xodim o'chirildi",
  organization_created: "Tashkilot qo'shildi",
  organization_updated: 'Tashkilot tahrirlandi',
  organization_deleted: "Tashkilot o'chirildi",
  category_created: "Kategoriya qo'shildi",
  category_updated: 'Kategoriya tahrirlandi',
  category_deleted: "Kategoriya o'chirildi",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  ticket: 'Murojaat',
  user: 'Xodim',
  organization: 'Tashkilot',
  category: 'Kategoriya',
};

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
      .catch(() => setError("Loglarni yuklab bo'lmadi."))
      .finally(() => setIsLoading(false));
  }, [page, actionFilter, actorFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setActionFilter('');
    setActorFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell title="Loglar" breadcrumb="Dashboard / Loglar">
      <div className="filters">
        <label>
          Amal turi
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">Barchasi</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Admin
          <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}>
            <option value="">Barchasi</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullname ?? a.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sanadan
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          Sanagacha
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <div className="filters-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
            Filterlarni tozalash
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<IconHistory width={24} height={24} />}
          title="Loglar topilmadi"
          description="Filtrni o'zgartirib ko'ring."
        />
      ) : (
        <>
          <p className="filter-results">{total} ta yozuv topildi</p>
          <div className="table-wrap">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Kim</th>
                  <th>Amal</th>
                  <th>Nimaga tegishli</th>
                  <th>Tafsilot</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="cell-muted">{new Date(log.createdAt).toLocaleString('uz-UZ')}</td>
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
