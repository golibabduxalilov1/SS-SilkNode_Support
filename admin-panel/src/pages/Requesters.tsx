import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconSearch, IconUser } from '../components/icons';
import { Avatar, EmptyState, Pagination, TableSkeleton } from '../components/ui';
import { usePageSize } from '../utils/usePageSize';
import { LIST_POLL_INTERVAL_MS } from '../utils/pollInterval';

interface Requester {
  key: string;
  name: string | null;
  phone: string | null;
  organizationId: string | null;
  organizationName: string | null;
  ticketsCount: number;
  lastTicketAt: string;
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
    const matchesName = !nameTerm || (r.name ?? '').toLowerCase().includes(nameTerm);
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

/** ТЗ band 8: alohida "Requester" jadvali yo'q — ro'yxat tickets jadvalidan hosil qilinadi (backend/src/requesters). */
export function RequestersPage() {
  const navigate = useNavigate();
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize();

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
        if (!background) setError("Murojaatchilar ro'yxatini yuklab bo'lmadi.");
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

  const totalPages = Math.max(1, Math.ceil(sortedRequesters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRequesters = sortedRequesters.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const hasActiveFilters = Boolean(nameSearch || phoneSearch || organizationFilter || minTickets || maxTickets);

  return (
    <AppShell title="Murojaatchilar" breadcrumb="Dashboard / Murojaatchilar" contentClassName="app-content--table-scroll">
      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <>
          <div className="toolbar">
            <div className="toolbar-search">
              <IconSearch width={15} height={15} />
              <input
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                placeholder="Ism yoki F.I.O. bo'yicha qidirish"
              />
            </div>
            <div className="toolbar-search">
              <IconSearch width={15} height={15} />
              <input
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Telefon raqami bo'yicha qidirish"
              />
            </div>
          </div>

          <div className="filters">
            <label>
              Tashkilot
              <select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
                <option value="">Barchasi</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Murojaatlar soni (dan)
              <input
                type="number"
                min={0}
                value={minTickets}
                onChange={(e) => setMinTickets(e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              Murojaatlar soni (gacha)
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
                  Filterlarni tozalash
                </button>
              </div>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <p className="filter-results">{sortedRequesters.length} ta murojaatchi topildi</p>

          {sortedRequesters.length === 0 ? (
            <EmptyState
              icon={<IconUser width={24} height={24} />}
              title="Hech narsa topilmadi"
              description={
                hasActiveFilters
                  ? 'Filtrlarni o\'zgartirib ko\'ring.'
                  : 'Murojaat kelib tushgach, murojaatchilar shu yerda ko\'rinadi.'
              }
              actionLabel={hasActiveFilters ? 'Filterlarni tozalash' : undefined}
              onAction={hasActiveFilters ? clearFilters : undefined}
            />
          ) : (
            <div className="table-wrap">
              <table className="tickets-table tickets-table--equal">
                <thead>
                  <tr>
                    <th>№</th>
                    <SortableTh label="F.I.O. / nomi" sortKey="name" current={sort} onSort={handleSort} />
                    <th>Telefon</th>
                    <th>Tashkilot</th>
                    <SortableTh label="Murojaatlar soni" sortKey="ticketsCount" current={sort} onSort={handleSort} />
                    <SortableTh label="Oxirgi murojaat" sortKey="lastTicketAt" current={sort} onSort={handleSort} />
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
                        </div>
                      </td>
                      <td className="cell-nowrap">{r.phone ?? '—'}</td>
                      <td className="cell-nowrap">{r.organizationName ?? '—'}</td>
                      <td>{r.ticketsCount}</td>
                      <td className="cell-muted">
                        <div className="cell-datetime">
                          <span>{new Date(r.lastTicketAt).toLocaleDateString('uz-UZ')}</span>
                          <span className="cell-datetime-time">
                            {new Date(r.lastTicketAt).toLocaleTimeString('uz-UZ')}
                          </span>
                        </div>
                      </td>
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
    </AppShell>
  );
}
