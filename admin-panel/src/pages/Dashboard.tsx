import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconClose } from '../components/icons';

interface Organization {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface FilterChipData {
  key: string;
  label: string;
  onClear: () => void;
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" className="filter-chip" onClick={onClear}>
      <span>{label}</span>
      <IconClose width={11} height={11} />
    </button>
  );
}

function FilterBar({
  organizations,
  categories,
  organizationFilter,
  onOrganizationChange,
  categoryFilter,
  onCategoryChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  chips,
  hasActiveFilters,
  onClearAll,
}: {
  organizations: Organization[];
  categories: Category[];
  organizationFilter: string;
  onOrganizationChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  chips: FilterChipData[];
  hasActiveFilters: boolean;
  onClearAll: () => void;
}) {
  return (
    <div className="filter-panel">
      <div className="filter-panel-row">
        <label className="filter-field">
          <span className="filter-field-label">Tashkilot</span>
          <select value={organizationFilter} onChange={(e) => onOrganizationChange(e.target.value)}>
            <option value="">Barchasi</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field-label">Kategoriya</span>
          <select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)}>
            <option value="">Barchasi</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="filter-field filter-field--range">
          <span className="filter-field-label">Sana oralig'i</span>
          <div className="filter-date-range">
            <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
            <span className="filter-date-range-sep">—</span>
            <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
          </div>
        </div>

        <div className="filter-panel-status">
          {hasActiveFilters && (
            <button type="button" className="btn btn-secondary btn-sm filter-clear-btn" onClick={onClearAll}>
              <IconClose width={13} height={13} />
              Filterlarni tozalash
            </button>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="filter-chips">
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} onClear={chip.onClear} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    api
      .get('/admin/organizations')
      .then((res) => setOrganizations(res.data.data))
      .catch(() => {});
    api
      .get('/admin/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => {});
  }, []);

  const hasPanelFilters = Boolean(organizationFilter || categoryFilter || dateFrom || dateTo);

  const filterChips = useMemo(() => {
    const chips: FilterChipData[] = [];
    if (organizationFilter) {
      const org = organizations.find((o) => o.id === organizationFilter);
      chips.push({
        key: 'org',
        label: `Tashkilot: ${org?.name ?? organizationFilter}`,
        onClear: () => setOrganizationFilter(''),
      });
    }
    if (categoryFilter) {
      const category = categories.find((c) => c.id === categoryFilter);
      chips.push({
        key: 'category',
        label: `Kategoriya: ${category?.name ?? categoryFilter}`,
        onClear: () => setCategoryFilter(''),
      });
    }
    if (dateFrom || dateTo) {
      const label = dateFrom && dateTo ? `Sana: ${dateFrom} — ${dateTo}` : dateFrom ? `Sana: ${dateFrom} dan` : `Sana: ${dateTo} gacha`;
      chips.push({
        key: 'date',
        label,
        onClear: () => {
          setDateFrom('');
          setDateTo('');
        },
      });
    }
    return chips;
  }, [organizationFilter, categoryFilter, dateFrom, dateTo, organizations, categories]);

  const clearAllFilters = () => {
    setOrganizationFilter('');
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <AppShell title="Dashboard" breadcrumb="Filtr">
      <FilterBar
        organizations={organizations}
        categories={categories}
        organizationFilter={organizationFilter}
        onOrganizationChange={setOrganizationFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        chips={filterChips}
        hasActiveFilters={hasPanelFilters}
        onClearAll={clearAllFilters}
      />
    </AppShell>
  );
}
