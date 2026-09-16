import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  IconChevronDown,
  IconClose,
  IconEdit,
  IconFilter,
  IconSearch,
  IconTrash,
  IconUser,
} from '../components/icons';
import { Avatar, EmptyState, Pagination, TableSkeleton } from '../components/ui';
import { usePageSize } from '../utils/usePageSize';
import { LIST_POLL_INTERVAL_MS } from '../utils/pollInterval';
import { useLanguage } from '../i18n/LanguageContext';

interface Requester {
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

interface Organization {
  id: string;
  name: string;
}

interface RequesterFilters {
  nameSearch: string;
  phoneSearch: string;
  organizationFilter: string;
  minTickets: string;
  maxTickets: string;
}

function filterRequesters(requesters: Requester[], filters: RequesterFilters): Requester[] {
  const nameTerm = filters.nameSearch.trim().toLowerCase();
  const phoneTerm = filters.phoneSearch.trim().toLowerCase();
  const min = filters.minTickets ? Number(filters.minTickets) : null;
  const max = filters.maxTickets ? Number(filters.maxTickets) : null;
  return requesters.filter((r) => {
    const matchesName =
      !nameTerm || r.contactNames.some((name) => name.toLowerCase().includes(nameTerm));
    const matchesPhone = !phoneTerm || (r.phone ?? '').toLowerCase().includes(phoneTerm);
    const matchesOrg = !filters.organizationFilter || r.organizationId === filters.organizationFilter;
    const matchesMin = min === null || r.ticketsCount >= min;
    const matchesMax = max === null || r.ticketsCount <= max;
    return matchesName && matchesPhone && matchesOrg && matchesMin && matchesMax;
  });
}

type RequesterSortKey = 'name' | 'ticketsCount' | 'lastTicketAt';

interface RequesterSortState {
  key: RequesterSortKey;
  dir: 'asc' | 'desc';
}

function sortRequesters(requesters: Requester[], sort: RequesterSortState): Requester[] {
  const factor = sort.dir === 'asc' ? 1 : -1;
  return [...requesters].sort((a, b) => {
    if (sort.key === 'name') return factor * (a.name ?? '').localeCompare(b.name ?? '');
    if (sort.key === 'ticketsCount') return factor * (a.ticketsCount - b.ticketsCount);
    return factor * (new Date(a.lastTicketAt).getTime() - new Date(b.lastTicketAt).getTime());
  });
}

function SortableTh({
  label,
  sortKey,
  current,
  onSort,
}: {
  label: string;
  sortKey: RequesterSortKey;
  current: RequesterSortState;
  onSort: (key: RequesterSortKey) => void;
}) {
  const active = current.key === sortKey;
  return (
    <th
      className={`sortable-th${active ? ' is-active' : ''}`}
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (current.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{label}</span>
      <span className="sort-indicator">{active ? (current.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </th>
  );
}

interface RequesterFormData {
  name: string;
  phone: string;
}

/** Alohida requester jadvali yo'qligi sababli telefon faqat "phone:"-key'li (admin qo'lda kiritgan) murojaatchilar uchun tahrirlanadi — bo'lim requesters.service.ts update(). */
function RequesterEditModal({
  isOpen,
  requester,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  isOpen: boolean;
  requester: Requester | null;
  onClose: () => void;
  onSubmit: (data: RequesterFormData) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<RequesterFormData>({ name: '', phone: '' });
  const isPhoneEditable = requester ? requester.key.startsWith('phone:') : false;

  useEffect(() => {
    if (isOpen && requester) {
      setForm({ name: requester.name ?? '', phone: requester.phone ?? '' });
    }
  }, [isOpen, requester]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !requester) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-header-icon">
            <IconUser width={18} height={18} />
          </span>
          <h3>{t('requesters.editTitle')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
            <IconClose width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}
            <label className="modal-field">
              <span>{t('requesters.fieldName')}</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('requesters.fieldName')}
                autoFocus
              />
            </label>
            <label className="modal-field">
              <span>{t('requesters.fieldPhone')}</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t('requesters.fieldPhone')}
                disabled={!isPhoneEditable}
              />
            </label>
            {!isPhoneEditable && <p className="field-hint">{t('requesters.phoneNotEditableHint')}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/** ТЗ band 8: alohida "Requester" jadvali yo'q — ro'yxat tickets jadvalidan hosil qilinadi (backend/src/requesters). */
export function RequestersPage() {
  const { language, t } = useLanguage();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameSearch, setNameSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [minTickets, setMinTickets] = useState('');
  const [maxTickets, setMaxTickets] = useState('');
  const [sort, setSort] = useState<RequesterSortState>({ key: 'lastTicketAt', dir: 'desc' });
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize();
  const [editingRequester, setEditingRequester] = useState<Requester | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [requesterToDelete, setRequesterToDelete] = useState<Requester | null>(null);

  // background=true — yangi murojaat kelganda ro'yxat qo'lda yangilamasdan ham yangilanadi;
  // joriy filtr/sahifaga tegmasdan, skeletonsiz fonda yangilanadi.
  const load = (background = false) => {
    if (!background) setIsLoading(true);
    setError(null);
    Promise.all([api.get('/admin/requesters'), api.get('/admin/organizations')])
      .then(([requestersRes, orgsRes]) => {
        setRequesters(requestersRes.data.data);
        setOrganizations(orgsRes.data.data);
      })
      .catch(() => {
        if (!background) setError(t('requesters.loadError'));
      })
      .finally(() => {
        if (!background) setIsLoading(false);
      });
  };

  useEffect(load, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!document.hidden) load(true);
    }, LIST_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const clearFilters = () => {
    setNameSearch('');
    setPhoneSearch('');
    setOrganizationFilter('');
    setMinTickets('');
    setMaxTickets('');
  };

  const filteredRequesters = useMemo(
    () =>
      filterRequesters(requesters, {
        nameSearch,
        phoneSearch,
        organizationFilter,
        minTickets,
        maxTickets,
      }),
    [requesters, nameSearch, phoneSearch, organizationFilter, minTickets, maxTickets],
  );

  const sortedRequesters = useMemo(() => sortRequesters(filteredRequesters, sort), [filteredRequesters, sort]);

  useEffect(() => {
    setPage(1);
  }, [nameSearch, phoneSearch, organizationFilter, minTickets, maxTickets, pageSize]);

  function handleSort(key: RequesterSortKey) {
    setSort((curr) => (curr.key === key ? { key, dir: curr.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));
  }

  function handleRowClick(requester: Requester) {
    navigate(`/requesters/${encodeURIComponent(requester.key)}`);
  }

  const closeEditModal = () => {
    if (isSaving) return;
    setEditingRequester(null);
  };

  const handleModalSubmit = async (data: RequesterFormData) => {
    if (!editingRequester) return;
    if (!data.name.trim()) {
      setModalError(t('requesters.validationNameRequired'));
      return;
    }
    setIsSaving(true);
    setModalError(null);
    try {
      const payload: Record<string, string> = { name: data.name.trim() };
      if (editingRequester.key.startsWith('phone:')) payload.phone = data.phone.trim();
      await api.patch(`/admin/requesters/${encodeURIComponent(editingRequester.key)}`, payload);
      setEditingRequester(null);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t('requesters.saveError');
      setModalError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!requesterToDelete) return;
    const requester = requesterToDelete;
    setRequesterToDelete(null);
    try {
      await api.delete(`/admin/requesters/${encodeURIComponent(requester.key)}`);
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t('requesters.deleteError');
      setError(message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(sortedRequesters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRequesters = sortedRequesters.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const hasActiveFilters = Boolean(nameSearch || phoneSearch || organizationFilter || minTickets || maxTickets);
  const activeFilterCount = [nameSearch, phoneSearch, organizationFilter, minTickets, maxTickets].filter(
    Boolean,
  ).length;

  return (
    <AppShell title={t('requesters.title')} breadcrumb={t('requesters.breadcrumb')} contentClassName="app-content--table-scroll">
      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <>
          <div className="toolbar-collapsible">
            <button
              type="button"
              className={`toolbar-toggle${isToolbarOpen ? ' toolbar-toggle--open' : ''}`}
              aria-expanded={isToolbarOpen}
              onClick={() => setIsToolbarOpen((open) => !open)}
            >
              <IconFilter width={15} height={15} />
              {t('requesters.toolbarToggle')}
              {activeFilterCount > 0 && (
                <span className="filter-active-chip">{activeFilterCount}</span>
              )}
              <IconChevronDown width={15} height={15} className="toolbar-toggle-chevron" />
            </button>

            {isToolbarOpen && (
              <>
                <div className="toolbar">
                  <div className="toolbar-search">
                    <IconSearch width={15} height={15} />
                    <input
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                      placeholder={t('requesters.searchByName')}
                    />
                  </div>
                  <div className="toolbar-search">
                    <IconSearch width={15} height={15} />
                    <input
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      placeholder={t('requesters.searchByPhone')}
                    />
                  </div>
                </div>

                <div className="filters">
                  <label>
                    {t('requesters.organization')}
                    <select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
                      <option value="">{t('common.all')}</option>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('requesters.minTickets')}
                    <input
                      type="number"
                      min={0}
                      value={minTickets}
                      onChange={(e) => setMinTickets(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <label>
                    {t('requesters.maxTickets')}
                    <input
                      type="number"
                      min={0}
                      value={maxTickets}
                      onChange={(e) => setMaxTickets(e.target.value)}
                      placeholder="∞"
                    />
                  </label>
                  {hasActiveFilters && (
                    <div className="filters-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                        {t('requesters.clearFilters')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <p className="filter-results">
            {sortedRequesters.length} {t('requesters.resultsFound')}
          </p>

          {sortedRequesters.length === 0 ? (
            <EmptyState
              icon={<IconUser width={24} height={24} />}
              title={t('requesters.notFound')}
              description={hasActiveFilters ? t('requesters.notFoundFiltered') : t('requesters.notFoundEmpty')}
              actionLabel={hasActiveFilters ? t('requesters.clearFilters') : undefined}
              onAction={hasActiveFilters ? clearFilters : undefined}
            />
          ) : (
            <div className="table-wrap">
              <table className="tickets-table tickets-table--equal requesters-table">
                <thead>
                  <tr>
                    <th>{t('requesters.colNumber')}</th>
                    <SortableTh label={t('requesters.colName')} sortKey="name" current={sort} onSort={handleSort} />
                    <th>{t('requesters.colPhone')}</th>
                    <th>{t('requesters.colOrganization')}</th>
                    <SortableTh
                      label={t('requesters.colTicketsCount')}
                      sortKey="ticketsCount"
                      current={sort}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label={t('requesters.colLastTicket')}
                      sortKey="lastTicketAt"
                      current={sort}
                      onSort={handleSort}
                    />
                    {isSuperadmin && <th>{t('requesters.colActions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequesters.map((r, i) => (
                    <tr key={r.key} className="clickable-row" onClick={() => handleRowClick(r)}>
                      <td className="cell-muted">{(currentPage - 1) * pageSize + i + 1}</td>
                      <td>
                        <div className="cell-user">
                          <Avatar name={r.name} />
                          <span className="cell-primary">{r.name ?? '—'}</span>
                          {r.contactNames.length > 1 && (
                            <span
                              className="requester-group-badge"
                              title={t('requesters.groupBadgeTitleTemplate').replace(
                                '{names}',
                                r.contactNames.slice(1).join(', '),
                              )}
                            >
                              +{r.contactNames.length - 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="cell-nowrap">{r.phone ?? '—'}</td>
                      <td className="cell-nowrap">{r.organizationName ?? '—'}</td>
                      <td>{r.ticketsCount}</td>
                      <td className="cell-muted">
                        <div className="cell-datetime">
                          <span>{new Date(r.lastTicketAt).toLocaleDateString(dateLocale)}</span>
                          <span className="cell-datetime-time">
                            {new Date(r.lastTicketAt).toLocaleTimeString(dateLocale)}
                          </span>
                        </div>
                      </td>
                      {isSuperadmin && (
                        <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setModalError(null);
                              setEditingRequester(r);
                            }}
                          >
                            <IconEdit width={13} height={13} />
                            {t('requesters.edit')}
                          </button>
                          <button className="danger" onClick={() => setRequesterToDelete(r)}>
                            <IconTrash width={13} height={13} />
                            {t('requesters.delete')}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            totalItems={sortedRequesters.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      <RequesterEditModal
        isOpen={!!editingRequester}
        requester={editingRequester}
        onClose={closeEditModal}
        onSubmit={handleModalSubmit}
        isSaving={isSaving}
        error={modalError}
      />

      <ConfirmModal
        isOpen={!!requesterToDelete}
        title={t('requesters.deleteTitle')}
        message={
          requesterToDelete
            ? t('requesters.deleteConfirmTemplate')
                .replace('{name}', requesterToDelete.name ?? requesterToDelete.phone ?? '')
                .replace('{count}', String(requesterToDelete.ticketsCount))
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setRequesterToDelete(null)}
      />
    </AppShell>
  );
}
