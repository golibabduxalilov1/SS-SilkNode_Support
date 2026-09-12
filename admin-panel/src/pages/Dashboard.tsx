import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import {
  IconAlert,
  IconCheck,
  IconClose,
  IconDownload,
  IconInbox,
  IconLock,
  IconSearch,
  IconSpinner,
  IconTicketNew,
  IconTrendDown,
  IconTrendFlat,
  IconTrendUp,
  IconUsers,
  IconWait,
} from '../components/icons';
import {
  Avatar,
  CategoryOptionGroups,
  ChartSkeleton,
  EmptyState,
  StatCardSkeleton,
  TableSkeleton,
} from '../components/ui';
import { AssigneeTrendChart, type AssigneeResolutionTrendPoint } from '../components/dashboard/AssigneeTrendChart';
import { ProductivityBadge } from '../components/dashboard/ProductivityBadge';
import { TrendChart, type DailyTrendPoint } from '../components/dashboard/TrendChart';
import { ResolutionFlowChart, type ResolutionFlowPoint } from '../components/dashboard/ResolutionFlowChart';
import { exportTableToExcel } from '../utils/tableExport';
import { formatDurationMinutes } from '../utils/formatDuration';
import { LIST_POLL_INTERVAL_MS } from '../utils/pollInterval';

interface ClosedByPriority {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface AssigneeStatusBreakdown {
  pending: number;
  inProgress: number;
  resolved: number;
}

interface AssigneeStats {
  userId: string;
  fullname: string | null;
  ticketsAssignedTotal: number;
  ticketsOpenNow: number;
  ticketsClosed: number;
  closedByPriority: ClosedByPriority;
  statusBreakdown: AssigneeStatusBreakdown;
  avgResolutionMinutes: number | null;
  totalResolutionMinutes: number;
  slaResolutionBreachCount: number;
  slaComplianceRate: number;
  productivityScore: number;
  closeRate: number;
  reopenedCount: number;
  reopenedRate: number;
  trendVsPreviousPeriod: {
    ticketsClosedCurr: number;
    ticketsClosedPrev: number;
    ticketsClosedDelta: number;
  };
}

interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  ticketsCount: number;
  closedCount: number;
  openCount: number;
  avgResolutionMinutes: number | null;
  sharePercent: number;
}

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  ticketsCount: number;
  closedCount: number;
  openCount: number;
}

interface WorkloadHeatmapEntry {
  userId: string;
  fullname: string | null;
  count: number;
}

interface WorkloadHeatmapPoint {
  date: string;
  byAssignee: WorkloadHeatmapEntry[];
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
  avgResolutionMinutes: number | null;
  avgProductivityScore: number | null;
  byAssignee: AssigneeStats[];
  byOrganization: OrganizationStats[];
  byCategory: CategoryStats[];
  dailyTrend: DailyTrendPoint[];
  assigneeResolutionTrend: AssigneeResolutionTrendPoint[];
  resolutionFlow: ResolutionFlowPoint[];
  workloadHeatmap: WorkloadHeatmapPoint[];
  slaThresholds: {
    resolution: number;
  };
}

/** "Kim, qaysi murojaatni, qaysi tashkilotdan, qancha vaqtda bajardi" — rahbar hisobot jadvali qatori. */
interface ProcessedTicketRow {
  ticketId: string;
  number: string;
  title: string;
  employeeId: string | null;
  employeeName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  requesterName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  priority: string;
  status: string;
  receivedAt: string;
  processingStartedAt: string;
  /** true bo'lsa — audit tarixida "ishga olingan" yozuvi topilmagan, tushgan vaqt taxminiy sifatida qo'yilgan. */
  processingStartedAtIsFallback: boolean;
  completedAt: string | null;
  durationMinutes: number | null;
}

interface EmployeeProcessingSummary {
  employeeId: string;
  employeeName: string | null;
  ticketsCompleted: number;
  avgDurationMinutes: number | null;
  totalDurationMinutes: number;
}

interface ProcessedTicketsReport {
  rows: ProcessedTicketRow[];
  byEmployee: EmployeeProcessingSummary[];
}

interface Organization {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  cluster?: string;
}

interface Assignee {
  id: string;
  fullname: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  waiting_user: 'Javob kutilmoqda',
  resolved: 'Yechilgan',
  closed: 'Yopilgan',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Past',
  medium: "O'rta",
  high: 'Yuqori',
  critical: 'Kritik',
};

const STATUS_ORDER: Array<keyof DashboardStats['statusCounts']> = [
  'new',
  'in_progress',
  'waiting_user',
  'resolved',
  'closed',
];

const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] }));

const TIER_COLOR: Record<'good' | 'warn' | 'bad', string> = {
  good: 'var(--success)',
  warn: 'var(--status-in_progress)',
  bad: 'var(--danger)',
};

interface AccentStyle extends CSSProperties {
  '--accent'?: string;
  '--accent-soft'?: string;
}

// "Ijrochilar bo'yicha" chuqur tahlil bloki uchun chegaralar.
const WORKLOAD_LOW_MAX = 3;
const WORKLOAD_MEDIUM_MAX = 7;
const SLA_GOOD_MIN = 90;
const SLA_WARN_MIN = 70;
// closeRate/productivityScore bir xil formuladan kelgani uchun bir xil chegaralarni ishlatadi.
const CLOSE_RATE_GOOD_MIN = 80;
const CLOSE_RATE_WARN_MIN = 50;
// reopenedRate uchun — bu yerda kichikroq qiymat yaxshiroq, shuning uchun "max" chegaralar.
const REOPENED_GOOD_MAX = 5;
const REOPENED_WARN_MAX = 15;

function getWorkloadTier(openCount: number): 'good' | 'warn' | 'bad' {
  if (openCount <= WORKLOAD_LOW_MAX) return 'good';
  if (openCount <= WORKLOAD_MEDIUM_MAX) return 'warn';
  return 'bad';
}

function getSlaTier(complianceRate: number): 'good' | 'warn' | 'bad' {
  if (complianceRate >= SLA_GOOD_MIN) return 'good';
  if (complianceRate >= SLA_WARN_MIN) return 'warn';
  return 'bad';
}

function getCloseRateTier(closeRate: number): 'good' | 'warn' | 'bad' {
  if (closeRate >= CLOSE_RATE_GOOD_MIN) return 'good';
  if (closeRate >= CLOSE_RATE_WARN_MIN) return 'warn';
  return 'bad';
}

function getReopenedTier(reopenedRate: number): 'good' | 'warn' | 'bad' {
  if (reopenedRate <= REOPENED_GOOD_MAX) return 'good';
  if (reopenedRate <= REOPENED_WARN_MAX) return 'warn';
  return 'bad';
}

export function formatDayLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}`;
}

function percentDelta(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * T07 — kichik bazada (masalan 1 -> 2) foiz o'zgarishi ("+100%") chalg'ituvchi bo'lgani uchun,
 * bazaviy son shu chegaradan kichik bo'lsa, xom farq ko'rsatiladi ("+1 ta").
 */
const KPI_RAW_COUNT_THRESHOLD = 10;

function formatProcessingDuration(minutes: number | null): string {
  return formatDurationMinutes(minutes, '—');
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('uz-UZ');
}

const PROCESSED_TICKETS_EXPORT_HEADERS = [
  '№',
  'Murojaat raqami',
  'Xodim',
  'Tashkilot',
  'Murojaatchi',
  'Murojaat mavzusi',
  'Kategoriya',
  'Muhimlik',
  'Holat',
  'Tushgan sana/vaqt',
  'Ishga olingan sana/vaqt',
  'Yakunlangan sana/vaqt',
  'Qayta ishlash vaqti',
];

function processedTicketsToExportRows(rows: ProcessedTicketRow[]): (string | number)[][] {
  return rows.map((row, index) => [
    index + 1,
    row.number,
    row.employeeName ?? row.employeeId ?? '—',
    row.organizationName ?? '—',
    row.requesterName ?? '—',
    row.title,
    row.categoryName ?? '—',
    PRIORITY_LABELS[row.priority] ?? row.priority,
    STATUS_LABELS[row.status] ?? row.status,
    formatDateTime(row.receivedAt),
    formatDateTime(row.processingStartedAt) + (row.processingStartedAtIsFallback ? ' *' : ''),
    formatDateTime(row.completedAt),
    formatProcessingDuration(row.durationMinutes),
  ]);
}

export function ChartTooltip({ active, payload, label, labelFormatter }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const displayLabel = labelFormatter ? labelFormatter(label) : label;
  return (
    <div className="chart-tooltip">
      {displayLabel && <div className="chart-tooltip-label">{displayLabel}</div>}
      {payload.map((entry: any, i: number) => (
        <div className="chart-tooltip-row" key={i}>
          <span className="chart-tooltip-swatch" style={{ background: entry.color ?? entry.payload?.fill }} />
          <span>{entry.name}</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

function TrendBadge({ curr, prev, title }: { curr: number; prev: number; title: string }) {
  const diff = curr - prev;
  const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  const Icon = tone === 'up' ? IconTrendUp : tone === 'down' ? IconTrendDown : IconTrendFlat;
  const sign = diff > 0 ? '+' : '';
  const useRawCount = prev < KPI_RAW_COUNT_THRESHOLD;
  return (
    <span className={`stat-card-trend stat-card-trend--${tone}`} title={title}>
      <Icon width={11} height={11} />
      {useRawCount ? `${sign}${diff} ta` : `${sign}${percentDelta(curr, prev)}%`}
    </span>
  );
}

function renderActiveDonutSlice(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 7}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

const PRIORITY_SEGMENTS: Array<{ key: keyof ClosedByPriority; label: string; color: string }> = [
  { key: 'critical', label: 'Critical', color: 'var(--priority-critical)' },
  { key: 'high', label: 'High', color: 'var(--priority-high)' },
  { key: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { key: 'low', label: 'Low', color: 'var(--priority-low)' },
];

function WorkloadBadge({ openCount }: { openCount: number }) {
  const tier = getWorkloadTier(openCount);
  return <span className={`workload-badge workload-badge--${tier}`}>{openCount}</span>;
}

function SlaBadge({ complianceRate }: { complianceRate: number }) {
  const tier = getSlaTier(complianceRate);
  return <span className={`sla-badge sla-badge--${tier}`}>{complianceRate}%</span>;
}

function ReopenedBadge({ reopenedRate }: { reopenedRate: number }) {
  const tier = getReopenedTier(reopenedRate);
  return <span className={`sla-badge sla-badge--${tier}`}>{reopenedRate}%</span>;
}

function PriorityStackedBar({ data }: { data: ClosedByPriority }) {
  const total = data.low + data.medium + data.high + data.critical;
  if (total === 0) {
    return <span className="priority-stack priority-stack--empty" title="Yopilgan murojaatlar yo'q" />;
  }
  const title = PRIORITY_SEGMENTS.map((s) => `${s.label}: ${data[s.key]}`).join(' · ');
  return (
    <span className="priority-stack" title={title}>
      {PRIORITY_SEGMENTS.filter((s) => data[s.key] > 0).map((s) => (
        <span
          key={s.key}
          className="priority-stack-segment"
          style={{ width: `${(data[s.key] / total) * 100}%`, background: s.color }}
        />
      ))}
    </span>
  );
}

function OrganizationRatioBar({ closedCount, openCount }: { closedCount: number; openCount: number }) {
  const total = closedCount + openCount;
  if (total === 0) {
    return <span className="priority-stack priority-stack--empty" title="Murojaatlar yo'q" />;
  }
  const title = `Yopilgan: ${closedCount} · Ochiq: ${openCount}`;
  return (
    <span className="priority-stack" title={title}>
      {closedCount > 0 && (
        <span className="priority-stack-segment" style={{ width: `${(closedCount / total) * 100}%`, background: 'var(--success)' }} />
      )}
      {openCount > 0 && (
        <span
          className="priority-stack-segment"
          style={{ width: `${(openCount / total) * 100}%`, background: 'var(--status-in_progress)' }}
        />
      )}
    </span>
  );
}

/**
 * Bo'lim sarlavhasi: barcha kartalar/jadvallar uchun bir xil naqsh — sarlavha + subtitle +
 * ixtiyoriy o'ng harakat. filterContext — "filtr bor = kesim" holatida qaysi filtr qo'llanganini
 * ko'rsatuvchi kichik matn (masalan "G'olibjon Abduhalil uchun"); filtr yo'qligida berilmaydi.
 */
function SectionHeader({
  title,
  subtitle,
  filterContext,
  action,
}: {
  title: string;
  subtitle?: string;
  filterContext?: string | null;
  action?: ReactNode;
}) {
  return (
    <div className="chart-card-head">
      <div>
        <h3>{title}</h3>
        {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        {filterContext && <p className="chart-card-filter-context">{filterContext}</p>}
      </div>
      {action && <div className="chart-card-head-action">{action}</div>}
    </div>
  );
}

interface KpiCardData {
  key: string;
  icon: ReactNode;
  value: number;
  suffix?: string;
  label: string;
  accent?: string | null;
  accentSoft?: string | null;
  trend?: { curr: number; prev: number; title: string } | null;
}

function KpiCard({ icon, value, suffix, label, accent, accentSoft, trend }: Omit<KpiCardData, 'key'>) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-icon" style={accent ? ({ '--accent': accent, '--accent-soft': accentSoft ?? undefined } as AccentStyle) : undefined}>
          {icon}
        </span>
        {trend && <TrendBadge curr={trend.curr} prev={trend.prev} title={trend.title} />}
      </div>
      <span className="stat-value">
        {value}
        {suffix}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function OrgHighlightCard({
  icon,
  accent,
  accentSoft,
  organizationName,
  detail,
}: {
  icon: ReactNode;
  accent: string;
  accentSoft: string;
  organizationName: string;
  detail: string;
}) {
  return (
    <div className="stat-card stat-card--mini">
      <div className="stat-card-top">
        <span className="stat-card-icon" style={{ '--accent': accent, '--accent-soft': accentSoft } as AccentStyle}>
          {icon}
        </span>
      </div>
      <span className="stat-value">{organizationName}</span>
      <span className="stat-label">{detail}</span>
    </div>
  );
}

interface FilterChipData {
  key: string;
  label: string;
  onClear: () => void;
}

type AssigneeSortKey =
  | 'name'
  | 'ticketsOpenNow'
  | 'ticketsClosed'
  | 'ticketsAssignedTotal'
  | 'avgResolutionMinutes'
  | 'totalResolutionMinutes'
  | 'slaComplianceRate'
  | 'productivityScore'
  | 'closeRate'
  | 'reopenedRate';

interface AssigneeSortState {
  key: AssigneeSortKey;
  dir: 'asc' | 'desc';
}

type EmployeeSummarySortKey = 'name' | 'ticketsCompleted' | 'avgDurationMinutes' | 'totalDurationMinutes';

interface EmployeeSummarySortState {
  key: EmployeeSummarySortKey;
  dir: 'asc' | 'desc';
}

type ProcessedRowSortKey = 'employeeName' | 'organizationName' | 'durationMinutes';

interface ProcessedRowSortState {
  key: ProcessedRowSortKey;
  dir: 'asc' | 'desc';
}

function SortableTh<K extends string>({
  label,
  sortKey,
  current,
  onSort,
}: {
  label: string;
  sortKey: K;
  current: { key: K; dir: 'asc' | 'desc' };
  onSort: (key: K) => void;
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

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" className="filter-chip" onClick={onClear}>
      <span>{label}</span>
      <IconClose width={11} height={11} />
    </button>
  );
}

function FilterBar({
  assignees,
  assigneeFilter,
  onAssigneeChange,
  organizations,
  categories,
  organizationFilter,
  onOrganizationChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  chips,
  hasActiveFilters,
  onClearAll,
  isRefreshing,
}: {
  assignees: Assignee[];
  assigneeFilter: string;
  onAssigneeChange: (value: string) => void;
  organizations: Organization[];
  categories: Category[];
  organizationFilter: string;
  onOrganizationChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  chips: FilterChipData[];
  hasActiveFilters: boolean;
  onClearAll: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="filter-panel">
      <div className="filter-panel-row">
        <label className="filter-field">
          <span className="filter-field-label">Ijrochi</span>
          <select value={assigneeFilter} onChange={(e) => onAssigneeChange(e.target.value)}>
            <option value="">Barchasi</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullname ?? a.id}
              </option>
            ))}
          </select>
        </label>

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
            <CategoryOptionGroups categories={categories} />
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field-label">Holat</span>
          <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
            <option value="">Barchasi</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
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
          {isRefreshing && (
            <span className="filter-panel-refresh">
              <IconSpinner width={13} height={13} className="filter-panel-refresh-icon" />
              Yangilanmoqda…
            </span>
          )}
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [assigneeSort, setAssigneeSort] = useState<AssigneeSortState>({ key: 'name', dir: 'asc' });
  const [employeeSummarySort, setEmployeeSummarySort] = useState<EmployeeSummarySortState>({ key: 'name', dir: 'asc' });
  const [processedRowSort, setProcessedRowSort] = useState<ProcessedRowSortState>({ key: 'employeeName', dir: 'asc' });
  const [isExportingProcessed, setIsExportingProcessed] = useState(false);

  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [processedReport, setProcessedReport] = useState<ProcessedTicketsReport | null>(null);
  const [isProcessedLoading, setIsProcessedLoading] = useState(true);
  const [hasProcessedError, setHasProcessedError] = useState(false);

  const hasLoadedOnce = useRef(false);
  const hasLoadedProcessedOnce = useRef(false);

  useEffect(() => {
    api
      .get('/admin/users')
      .then((res) => setAssignees(res.data.data))
      .catch(() => {});
    api
      .get('/admin/organizations')
      .then((res) => setOrganizations(res.data.data))
      .catch(() => {});
    api
      .get('/admin/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => {});
  }, []);

  // Dashboard stats va "xodimlar bo'yicha bajarilgan murojaatlar" hisobotining ikkalasi ham
  // bir xil filtrlardan foydalanadi — shu sababli params bitta joyda quriladi.
  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (organizationFilter) params.organizationId = organizationFilter;
    if (categoryFilter) params.categoryId = categoryFilter;
    if (statusFilter) params.status = statusFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (selectedAssigneeId) params.assignedToId = selectedAssigneeId;
    return params;
  }, [organizationFilter, categoryFilter, statusFilter, dateFrom, dateTo, selectedAssigneeId]);

  useEffect(() => {
    let cancelled = false;

    function loadStats() {
      if (hasLoadedOnce.current) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setHasError(false);

      api
        .get('/admin/dashboard/stats', { params: Object.keys(filterParams).length > 0 ? filterParams : undefined })
        .then((res) => {
          if (!cancelled) setStats(res.data.data);
        })
        .catch(() => {
          if (!cancelled) setHasError(true);
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
            setIsRefreshing(false);
            hasLoadedOnce.current = true;
          }
        });
    }

    loadStats();
    // Yangi murojaatlar kelganda (masalan tashkilotlar bo'yicha ulush/reyting) sahifani qo'lda
    // yangilamasdan ham ma'lumot yangi holatga ega bo'lib tursin — fonda davriy so'rov.
    const intervalId = window.setInterval(() => {
      if (!document.hidden) loadStats();
    }, LIST_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [filterParams]);

  // Alohida so'rov va holat — bu bo'lim yuklanmasa ham asosiy Dashboard funksionalligi buzilmaydi.
  useEffect(() => {
    let cancelled = false;

    function loadProcessed() {
      if (!hasLoadedProcessedOnce.current) {
        setIsProcessedLoading(true);
      }
      setHasProcessedError(false);

      api
        .get('/admin/dashboard/processed-tickets', {
          params: Object.keys(filterParams).length > 0 ? filterParams : undefined,
        })
        .then((res) => {
          if (!cancelled) setProcessedReport(res.data.data);
        })
        .catch(() => {
          if (!cancelled) setHasProcessedError(true);
        })
        .finally(() => {
          if (!cancelled) {
            setIsProcessedLoading(false);
            hasLoadedProcessedOnce.current = true;
          }
        });
    }

    loadProcessed();
    const intervalId = window.setInterval(() => {
      if (!document.hidden) loadProcessed();
    }, LIST_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [filterParams]);

  const hasPanelFilters = Boolean(
    selectedAssigneeId || organizationFilter || categoryFilter || statusFilter || dateFrom || dateTo,
  );

  // Dropdown va jadval qatoriga bosish BITTA state'ni (selectedAssigneeId) o'qib-yozadi,
  // shuning uchun ikkalasi har doim to'liq sinxron.
  const selectedAssigneeName = useMemo(() => {
    if (!selectedAssigneeId) return null;
    const fromList = assignees.find((a) => a.id === selectedAssigneeId)?.fullname;
    if (fromList) return fromList;
    return stats?.byAssignee.find((a) => a.userId === selectedAssigneeId)?.fullname ?? selectedAssigneeId;
  }, [selectedAssigneeId, assignees, stats]);

  const filterChips = useMemo(() => {
    const chips: FilterChipData[] = [];
    if (selectedAssigneeId) {
      chips.push({
        key: 'assignee',
        label: `Ijrochi: ${selectedAssigneeName}`,
        onClear: () => setSelectedAssigneeId(null),
      });
    }
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
    if (statusFilter) {
      chips.push({
        key: 'status',
        label: `Holat: ${STATUS_LABELS[statusFilter] ?? statusFilter}`,
        onClear: () => setStatusFilter(''),
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
  }, [
    selectedAssigneeId,
    selectedAssigneeName,
    organizationFilter,
    categoryFilter,
    statusFilter,
    dateFrom,
    dateTo,
    organizations,
    categories,
  ]);

  const clearAllFilters = () => {
    setSelectedAssigneeId(null);
    setOrganizationFilter('');
    setCategoryFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const pieData = useMemo(() => {
    if (!stats) return [];
    return STATUS_ORDER.map((key) => ({
      key,
      name: STATUS_LABELS[key],
      value: stats.statusCounts[key],
      fill: `var(--status-${key})`,
    })).filter((d) => d.value > 0);
  }, [stats]);

  const statusTotal = useMemo(
    () => (stats ? Object.values(stats.statusCounts).reduce((a, b) => a + b, 0) : 0),
    [stats],
  );

  const noFilteredData = hasPanelFilters && !!stats && statusTotal === 0 && stats.allOpen === 0;

  const donutData = pieData.length > 0 ? pieData : [{ key: 'empty', name: 'Maʼlumot yoʻq', value: 1, fill: 'var(--border-strong)' }];

  const assigneeSummary = useMemo(() => {
    if (!stats || stats.byAssignee.length === 0) return null;
    const activeCount = stats.byAssignee.length;
    const totalOpen = stats.byAssignee.reduce((sum, a) => sum + a.ticketsOpenNow, 0);
    const withClosed = stats.byAssignee.filter((a) => a.ticketsClosed > 0);
    const bestSla = withClosed.length
      ? withClosed.reduce((best, a) => (a.slaComplianceRate > best.slaComplianceRate ? a : best))
      : null;
    const worstSla = withClosed.length
      ? withClosed.reduce((worst, a) => (a.slaComplianceRate < worst.slaComplianceRate ? a : worst))
      : null;
    return {
      activeCount,
      avgWorkload: activeCount > 0 ? Math.round(totalOpen / activeCount) : 0,
      bestSla,
      worstSla,
    };
  }, [stats]);

  const sortedByAssignee = useMemo(() => {
    if (!stats) return [];
    const { key, dir } = assigneeSort;
    const factor = dir === 'asc' ? 1 : -1;
    return [...stats.byAssignee].sort((a, b) => {
      if (key === 'name') return factor * (a.fullname ?? a.userId).localeCompare(b.fullname ?? b.userId);
      if (key === 'avgResolutionMinutes') return factor * ((a.avgResolutionMinutes ?? -1) - (b.avgResolutionMinutes ?? -1));
      return factor * (a[key] - b[key]);
    });
  }, [stats, assigneeSort]);

  function handleAssigneeSort(key: AssigneeSortKey) {
    setAssigneeSort((curr) => (curr.key === key ? { key, dir: curr.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));
  }

  const sortedByEmployee = useMemo(() => {
    if (!processedReport) return [];
    const { key, dir } = employeeSummarySort;
    const factor = dir === 'asc' ? 1 : -1;
    return [...processedReport.byEmployee].sort((a, b) => {
      if (key === 'name') return factor * (a.employeeName ?? a.employeeId).localeCompare(b.employeeName ?? b.employeeId);
      if (key === 'avgDurationMinutes') return factor * ((a.avgDurationMinutes ?? -1) - (b.avgDurationMinutes ?? -1));
      return factor * (a[key] - b[key]);
    });
  }, [processedReport, employeeSummarySort]);

  function handleEmployeeSummarySort(key: EmployeeSummarySortKey) {
    setEmployeeSummarySort((curr) =>
      curr.key === key ? { key, dir: curr.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' },
    );
  }

  const sortedProcessedRows = useMemo(() => {
    if (!processedReport) return [];
    const { key, dir } = processedRowSort;
    const factor = dir === 'asc' ? 1 : -1;
    return [...processedReport.rows].sort((a, b) => {
      if (key === 'employeeName') {
        return factor * (a.employeeName ?? a.employeeId ?? '').localeCompare(b.employeeName ?? b.employeeId ?? '');
      }
      if (key === 'organizationName') {
        return factor * (a.organizationName ?? '').localeCompare(b.organizationName ?? '');
      }
      return factor * ((a.durationMinutes ?? -1) - (b.durationMinutes ?? -1));
    });
  }, [processedReport, processedRowSort]);

  function handleProcessedRowSort(key: ProcessedRowSortKey) {
    setProcessedRowSort((curr) => (curr.key === key ? { key, dir: curr.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  const assigneeSlaChartData = useMemo(() => {
    if (!stats) return [];
    return [...stats.byAssignee]
      .sort((a, b) => b.slaComplianceRate - a.slaComplianceRate)
      .map((a) => ({ userId: a.userId, name: a.fullname ?? a.userId, value: a.slaComplianceRate }))
      .reverse();
  }, [stats]);

  const assigneeWorkloadChartData = useMemo(() => {
    if (!stats) return [];
    return [...stats.byAssignee]
      .sort((a, b) => b.ticketsOpenNow - a.ticketsOpenNow)
      .map((a) => ({ userId: a.userId, name: a.fullname ?? a.userId, value: a.ticketsOpenNow }));
  }, [stats]);

  const assigneeStatusStackedData = useMemo(() => {
    if (!stats) return [];
    return [...stats.byAssignee]
      .sort((a, b) => a.ticketsAssignedTotal - b.ticketsAssignedTotal)
      .map((a) => ({
        userId: a.userId,
        name: a.fullname ?? a.userId,
        pending: a.statusBreakdown.pending,
        inProgress: a.statusBreakdown.inProgress,
        resolved: a.statusBreakdown.resolved,
      }));
  }, [stats]);

  const assigneeCloseRateChartData = useMemo(() => {
    if (!stats) return [];
    return [...stats.byAssignee]
      .sort((a, b) => b.ticketsClosed - a.ticketsClosed)
      .map((a) => ({ userId: a.userId, name: a.fullname ?? a.userId, value: a.ticketsClosed, closeRate: a.closeRate }))
      .reverse();
  }, [stats]);

  // "Filtr yo'q = umumiy, filtr bor = kesim": faol filtrlarni o'qiladigan matnga aylantiradi.
  // null bo'lsa — hech qanday filtr faol emas, sahifa "Umumiy ko'rinish" holatida.
  const scopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedAssigneeId) {
      parts.push(`${selectedAssigneeName} uchun`);
    }
    if (organizationFilter) {
      const org = organizations.find((o) => o.id === organizationFilter);
      parts.push(org?.name ?? organizationFilter);
    }
    if (categoryFilter) {
      const category = categories.find((c) => c.id === categoryFilter);
      parts.push(category?.name ?? categoryFilter);
    }
    if (statusFilter) {
      parts.push(STATUS_LABELS[statusFilter] ?? statusFilter);
    }
    if (dateFrom || dateTo) {
      parts.push(dateFrom && dateTo ? `${dateFrom}–${dateTo}` : dateFrom ? `${dateFrom} dan` : `${dateTo} gacha`);
    }
    return parts.length > 0 ? parts.join(', ') : null;
  }, [
    selectedAssigneeId,
    selectedAssigneeName,
    organizationFilter,
    categoryFilter,
    statusFilter,
    dateFrom,
    dateTo,
    organizations,
    categories,
  ]);

  const periodLabel = dateFrom || dateTo ? 'Tanlangan davrda' : 'Oxirgi 30 kunda';

  async function handleExportProcessedTickets() {
    setIsExportingProcessed(true);
    try {
      const filterSummary = scopeLabel ? `Kesim: ${scopeLabel}` : "Umumiy ko'rinish";
      await exportTableToExcel({
        title: 'Xodimlar va bajarilgan murojaatlar',
        subtitle: `Yaratildi: ${new Date().toLocaleString('uz-UZ')} • Jami: ${sortedProcessedRows.length} ta • ${filterSummary}`,
        headers: PROCESSED_TICKETS_EXPORT_HEADERS,
        rows: processedTicketsToExportRows(sortedProcessedRows),
        fileName: `obrabotannye_zayavki_${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
    } finally {
      setIsExportingProcessed(false);
    }
  }

  const assigneeSectionRef = useRef<HTMLDivElement | null>(null);

  function handleSelectAssignee(userId: string) {
    setSelectedAssigneeId((curr) => (curr === userId ? null : userId));
    requestAnimationFrame(() => {
      assigneeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const topOrganizations = useMemo(() => {
    if (!stats) return [];
    return [...stats.byOrganization]
      .sort((a, b) => b.ticketsCount - a.ticketsCount)
      .slice(0, 5)
      .map((o) => ({ name: o.organizationName, value: o.ticketsCount }))
      .reverse();
  }, [stats]);

  // Ikkitadan ko'p tashkilot bo'lgandagina "eng faol / eng kam faol" ajratib ko'rsatiladi —
  // aks holda ikkalasi bir xil (yoki yagona) tashkilotni ko'rsatib, karta ma'nosiz bo'ladi.
  const mostActiveOrganization = useMemo(() => {
    if (!stats || stats.byOrganization.length < 2) return null;
    return stats.byOrganization.reduce((max, o) => (o.ticketsCount > max.ticketsCount ? o : max));
  }, [stats]);

  const leastActiveOrganization = useMemo(() => {
    if (!stats || stats.byOrganization.length < 2) return null;
    return stats.byOrganization.reduce((min, o) => (o.ticketsCount < min.ticketsCount ? o : min));
  }, [stats]);

  const categoryChartData = useMemo(() => {
    if (!stats) return [];
    return [...stats.byCategory]
      .sort((a, b) => b.ticketsCount - a.ticketsCount)
      .slice(0, 8)
      .map((c) => ({ key: c.categoryId, name: c.categoryName, value: c.ticketsCount }))
      .reverse();
  }, [stats]);

  const trendDelta = useMemo(() => {
    if (!stats || stats.dailyTrend.length < 2) return null;
    const today = stats.dailyTrend[stats.dailyTrend.length - 1];
    const yesterday = stats.dailyTrend[stats.dailyTrend.length - 2];
    return {
      createdCurr: today.created,
      createdPrev: yesterday.created,
      closedCurr: today.closed,
      closedPrev: yesterday.closed,
      // Ikkala kun ham 0 bo'lsa, o'zgarish ma'nosiz — badge butunlay yashiriladi.
      hasCreatedData: today.created !== 0 || yesterday.created !== 0,
      hasClosedData: today.closed !== 0 || yesterday.closed !== 0,
    };
  }, [stats]);

  const kpiCards: KpiCardData[] = stats
    ? [
        {
          key: 'total',
          icon: <IconInbox width={17} height={17} />,
          value: statusTotal,
          label: 'Jami murojaatlar',
          accent: 'var(--primary)',
          accentSoft: 'var(--primary-soft)',
          trend: null,
        },
        {
          key: 'resolved',
          icon: <IconCheck width={17} height={17} />,
          value: stats.statusCounts.resolved,
          label: 'Yechilgan',
          accent: 'var(--status-resolved)',
          accentSoft: 'var(--status-resolved-soft)',
          trend: null,
        },
        {
          key: 'in_progress',
          icon: <IconSpinner width={17} height={17} />,
          value: stats.statusCounts.in_progress,
          label: 'Jarayonda',
          accent: 'var(--status-in_progress)',
          accentSoft: 'var(--status-in_progress-soft)',
          trend: null,
        },
        {
          key: 'closed',
          icon: <IconLock width={17} height={17} />,
          value: stats.statusCounts.closed,
          label: 'Yopilgan',
          accent: 'var(--status-closed)',
          accentSoft: 'var(--status-closed-soft)',
          trend: null,
        },
        {
          key: 'new',
          icon: <IconTicketNew width={17} height={17} />,
          value: stats.statusCounts.new,
          label: 'Yangi',
          accent: 'var(--status-new)',
          accentSoft: 'var(--status-new-soft)',
          trend:
            trendDelta && trendDelta.hasCreatedData
              ? {
                  curr: trendDelta.createdCurr,
                  prev: trendDelta.createdPrev,
                  title: 'Bugun yasalgan murojaatlar, kechaga nisbatan',
                }
              : null,
        },
        {
          key: 'waiting_user',
          icon: <IconWait width={17} height={17} />,
          value: stats.statusCounts.waiting_user,
          label: 'Foydalanuvchi javobi kutilmoqda',
          accent: 'var(--status-waiting_user)',
          accentSoft: 'var(--status-waiting_user-soft)',
          trend: null,
        },
        {
          key: 'closedToday',
          icon: <IconCheck width={17} height={17} />,
          value: stats.closedToday,
          label: 'Bugun yopilgan',
          accent: 'var(--status-closed)',
          accentSoft: 'var(--status-closed-soft)',
          trend:
            trendDelta && trendDelta.hasClosedData
              ? {
                  curr: trendDelta.closedCurr,
                  prev: trendDelta.closedPrev,
                  title: 'Bugun yopilgan murojaatlar, kechaga nisbatan',
                }
              : null,
        },
      ]
    : [];

  return (
    <AppShell title="Dashboard" breadcrumb={scopeLabel ? `Kesim: ${scopeLabel}` : "Umumiy ko'rinish — barcha vaqt"}>
      <FilterBar
        assignees={assignees}
        assigneeFilter={selectedAssigneeId ?? ''}
        onAssigneeChange={(value) => setSelectedAssigneeId(value || null)}
        organizations={organizations}
        categories={categories}
        organizationFilter={organizationFilter}
        onOrganizationChange={setOrganizationFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        chips={filterChips}
        hasActiveFilters={hasPanelFilters}
        onClearAll={clearAllFilters}
        isRefreshing={isRefreshing}
      />

      <div className={`scope-banner ${scopeLabel ? 'scope-banner--active' : 'scope-banner--neutral'}`}>
        {scopeLabel ? (
          <>
            Kesim: <strong>{scopeLabel}</strong>
          </>
        ) : (
          "Umumiy ko'rinish — barcha tashkilot, kategoriya va ijrochilar, barcha vaqt"
        )}
      </div>

      {isLoading ? (
        <>
          <div className="stat-cards">
            {Array.from({ length: 7 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="bento-grid">
            <div className="chart-card span-12">
              <ChartSkeleton height={300} />
            </div>
            <div className="chart-card span-6">
              <ChartSkeleton height={220} />
            </div>
            <div className="chart-card span-6">
              <ChartSkeleton height={220} />
            </div>
          </div>
          <TableSkeleton rows={6} cols={9} />
        </>
      ) : hasError ? (
        <EmptyState
          icon={<IconAlert width={24} height={24} />}
          title="Statistikani yuklab bo'lmadi"
          description="Server bilan bog'lanishda xatolik yuz berdi. Sahifani qayta yuklab ko'ring."
        />
      ) : (
        stats &&
        (noFilteredData ? (
          <EmptyState
            icon={<IconSearch width={24} height={24} />}
            title="Ushbu filtr bo'yicha ma'lumot topilmadi"
            description="Tanlangan ijrochi, tashkilot, kategoriya, holat yoki sana oralig'ida murojaatlar mavjud emas. Filtrlarni tozalab ko'ring."
          />
        ) : (
          <div className={`dashboard-content${isRefreshing ? ' is-refreshing' : ''}`}>
            <div className="stat-cards">
              {kpiCards.map((card) => (
                <KpiCard
                  key={card.key}
                  icon={card.icon}
                  value={card.value}
                  suffix={card.suffix}
                  label={card.label}
                  accent={card.accent}
                  accentSoft={card.accentSoft}
                  trend={card.trend}
                />
              ))}
            </div>

            <div className="bento-grid">
              <div className="chart-card span-12 trend-chart-card">
                <SectionHeader
                  title="Murojaatlarni yasash va hal qilish dinamikasi"
                  subtitle="Yasalgan, yopilgan va ochiq qolganlar (kumulyativ) — davr filtrga mos"
                  filterContext={scopeLabel}
                />
                <TrendChart data={stats.dailyTrend} periodLabel={periodLabel} />
              </div>

              <div className="chart-card span-5">
                <SectionHeader
                  title="Holat bo'yicha taqsimot"
                  subtitle="Barcha murojaatlar joriy holat kesimida"
                  filterContext={scopeLabel}
                />
                <div className="donut-layout">
                  <div className="donut-chart-wrap">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={90}
                          paddingAngle={pieData.length > 0 ? 2 : 0}
                          stroke="var(--surface)"
                          strokeWidth={2}
                          activeIndex={pieData.length > 0 ? activeSlice : undefined}
                          activeShape={renderActiveDonutSlice}
                          onMouseEnter={(_, index) => setActiveSlice(index)}
                          onMouseLeave={() => setActiveSlice(undefined)}
                        >
                          {donutData.map((entry) => (
                            <Cell key={entry.key} fill={entry.fill} />
                          ))}
                        </Pie>
                        {pieData.length > 0 && <Tooltip content={<ChartTooltip />} />}
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <span className="donut-center-value">{statusTotal}</span>
                      <span className="donut-center-label">Jami</span>
                    </div>
                  </div>
                  {pieData.length > 0 ? (
                    <ul className="chart-legend">
                      {pieData.map((entry) => (
                        <li key={entry.key} className="chart-legend-item">
                          <span className="chart-legend-swatch" style={{ background: entry.fill }} />
                          <span className="chart-legend-name">{entry.name}</span>
                          <span className="chart-legend-value">{entry.value}</span>
                          <span className="chart-legend-pct">
                            {statusTotal > 0 ? Math.round((entry.value / statusTotal) * 100) : 0}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="chart-empty-note chart-empty-note--inline">Hozircha murojaatlar yo'q.</p>
                  )}
                </div>
                <p className="chart-summary-note">
                  <strong>{statusTotal}</strong> ta murojaat asosida hisoblangan
                  {scopeLabel && " — joriy kesim bo'yicha"}
                </p>
              </div>

              <div className="chart-card span-7">
                <SectionHeader
                  title="Kategoriya bo'yicha taqsimot"
                  subtitle="Murojaatlar eng ko'p tushgan top kategoriyalar"
                  filterContext={scopeLabel}
                />
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(220, categoryChartData.length * 38)}>
                    <BarChart data={categoryChartData} layout="vertical" margin={{ left: 8, right: 40 }}>
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                      <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} />
                      <YAxis type="category" dataKey="name" width={140} stroke="var(--text-tertiary)" fontSize={11} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                      <Bar dataKey="value" name="Murojaatlar soni" fill="var(--indigo-600)" radius={[0, 6, 6, 0]} barSize={28}>
                        <LabelList dataKey="value" position="right" className="bar-value-label" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="chart-empty-note">Hozircha kategoriya bo'yicha ma'lumot yo'q.</p>
                )}
              </div>

              <div className="chart-card span-12 trend-chart-card">
                <SectionHeader
                  title="Murojaatlarni ochilishi va hal qilinishi"
                  subtitle="Doim so'nggi 14 kunlik oyna — sana filtridagi boshlanish sanasiga bog'liq emas, faqat 'gacha' sanasi hisobga olinadi"
                  filterContext={scopeLabel}
                />
                <ResolutionFlowChart data={stats.resolutionFlow} />
              </div>

              <div className="chart-card span-12">
                <SectionHeader
                  title="Ijrochilar bo'yicha hal qilish dinamikasi"
                  subtitle={
                    selectedAssigneeId
                      ? 'Tanlangan ijrochi vs boshqalar (jami), vaqt bo\'yicha yopilgan tiketlar'
                      : "Eng faol 5 ijrochi, qolganlari 'Boshqalar' sifatida yig'ilgan"
                  }
                  filterContext={scopeLabel}
                />
                <AssigneeTrendChart
                  data={stats.assigneeResolutionTrend}
                  selectedAssigneeId={selectedAssigneeId}
                  selectedAssigneeName={selectedAssigneeName}
                />
              </div>
            </div>

            <div className="section-card assignee-analytics" ref={assigneeSectionRef}>
              <SectionHeader
                title="Ijrochilar bo'yicha"
                subtitle={
                  selectedAssigneeId
                    ? "Tanlangan ijrochining batafsil profili"
                    : "Har bir xodimning ish sifati va yuklamasi bo'yicha chuqur tahlil"
                }
                filterContext={hasPanelFilters ? scopeLabel : null}
                action={
                  selectedAssigneeId ? (
                    <span className="dashboard-filter-banner">
                      Filtr: <strong>{selectedAssigneeName}</strong>
                      <button
                        type="button"
                        className="dashboard-filter-banner-clear"
                        onClick={() => setSelectedAssigneeId(null)}
                      >
                        <IconClose width={12} height={12} />
                        Tozalash
                      </button>
                    </span>
                  ) : undefined
                }
              />

              {stats.byAssignee.length === 0 ? (
                <EmptyState
                  icon={<IconUsers width={24} height={24} />}
                  title="Hali hech kimga murojaat tayinlanmagan"
                  description="Xodimlar bo'yicha tahlil murojaatlar tayinlangach shu yerda paydo bo'ladi."
                />
              ) : (
                <>
                  <div className="table-wrap assignee-table-wrap">
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <SortableTh label="Xodim" sortKey="name" current={assigneeSort} onSort={handleAssigneeSort} />
                          <SortableTh label="Joriy yuklama" sortKey="ticketsOpenNow" current={assigneeSort} onSort={handleAssigneeSort} />
                          <SortableTh label="Yopilgan" sortKey="ticketsClosed" current={assigneeSort} onSort={handleAssigneeSort} />
                          <th>Muhimlik taqsimoti</th>
                          <SortableTh
                            label="Jami tayinlangan"
                            sortKey="ticketsAssignedTotal"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label="O'rtacha qayta ishlash vaqti"
                            sortKey="avgResolutionMinutes"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label="Umumiy qayta ishlash vaqti"
                            sortKey="totalResolutionMinutes"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label="Muddat muvofiqligi"
                            sortKey="slaComplianceRate"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label="Samaradorlik"
                            sortKey="productivityScore"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh label="Foydali ish %" sortKey="closeRate" current={assigneeSort} onSort={handleAssigneeSort} />
                          <SortableTh
                            label="Qayta ochilgan %"
                            sortKey="reopenedRate"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedByAssignee.map((a) => {
                          const hasClosedTrendSignal = !(a.ticketsClosed === 0 && a.trendVsPreviousPeriod.ticketsClosedDelta === 0);
                          return (
                            <tr
                              key={a.userId}
                              className={`clickable-row${a.userId === selectedAssigneeId ? ' assignee-row--selected' : ''}`}
                              onClick={() => handleSelectAssignee(a.userId)}
                            >
                              <td>
                                <div className="cell-user">
                                  <Avatar name={a.fullname} />
                                  <span className="cell-primary">{a.fullname ?? a.userId}</span>
                                </div>
                              </td>
                              <td>
                                <WorkloadBadge openCount={a.ticketsOpenNow} />
                              </td>
                              <td>
                                <span className="assignee-closed-cell">
                                  {a.ticketsClosed}
                                  {hasClosedTrendSignal && (
                                    <TrendBadge
                                      curr={a.trendVsPreviousPeriod.ticketsClosedCurr}
                                      prev={a.trendVsPreviousPeriod.ticketsClosedPrev}
                                      title="Oldingi teng davrga nisbatan yopilgan murojaatlar"
                                    />
                                  )}
                                </span>
                              </td>
                              <td>
                                <PriorityStackedBar data={a.closedByPriority} />
                              </td>
                              <td>{a.ticketsAssignedTotal}</td>
                              <td>{formatProcessingDuration(a.avgResolutionMinutes)}</td>
                              <td>{formatProcessingDuration(a.totalResolutionMinutes)}</td>
                              <td>
                                <SlaBadge complianceRate={a.slaComplianceRate} />
                              </td>
                              <td>
                                <ProductivityBadge score={a.productivityScore} />
                              </td>
                              <td>
                                <ProductivityBadge score={a.closeRate} />
                              </td>
                              <td>
                                <ReopenedBadge reopenedRate={a.reopenedRate} />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="assignee-detail-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectAssignee(a.userId);
                                  }}
                                >
                                  Batafsil
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bento-grid assignee-charts">
                    <div className="chart-card span-6">
                      <SectionHeader title="Muddat muvofiqligi reytingi" subtitle="Yopilgan tiketlar nisbatida, pastdan yuqoriga saralangan" />
                      <ResponsiveContainer width="100%" height={Math.max(160, assigneeSlaChartData.length * 38)}>
                        <BarChart data={assigneeSlaChartData} layout="vertical" margin={{ left: 8, right: 40 }}>
                          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                            stroke="var(--text-tertiary)"
                            fontSize={11}
                          />
                          <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={11} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                          <Bar dataKey="value" name="Muddat muvofiqligi" radius={[0, 6, 6, 0]} barSize={28}>
                            {assigneeSlaChartData.map((entry) => (
                              <Cell key={entry.userId} fill={TIER_COLOR[getSlaTier(entry.value)]} />
                            ))}
                            <LabelList
                              dataKey="value"
                              position="right"
                              className="bar-value-label"
                              formatter={(v: number) => `${v}%`}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card span-6">
                      <SectionHeader title="Ish yuki taqsimoti" subtitle="Hozirgi ochiq tiketlar, o'rtacha chiziqqa nisbatan" />
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(200, 40 + assigneeWorkloadChartData.length * 34)}
                      >
                        <BarChart data={assigneeWorkloadChartData} margin={{ top: 16, right: 16, left: -16, bottom: 8 }}>
                          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                          <XAxis
                            dataKey="name"
                            stroke="var(--text-tertiary)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            allowDecimals={false}
                            stroke="var(--text-tertiary)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={32}
                          />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                          <ReferenceLine
                            y={assigneeSummary?.avgWorkload ?? 0}
                            stroke="var(--text-muted)"
                            strokeDasharray="4 4"
                            label={{ value: "O'rtacha", position: 'insideTopRight', fill: 'var(--text-muted)', fontSize: 11 }}
                          />
                          <Bar dataKey="value" name="Ochiq tiketlar" radius={[6, 6, 0, 0]} barSize={32}>
                            {assigneeWorkloadChartData.map((entry) => (
                              <Cell key={entry.userId} fill={TIER_COLOR[getWorkloadTier(entry.value)]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card span-12">
                      <SectionHeader
                        title="Ijrochi bo'yicha umumiy yuklama"
                        subtitle="Tayinlangan tiketlar joriy holati bo'yicha: biriktirilgan, jarayonda, yechilgan"
                      />
                      <ResponsiveContainer width="100%" height={Math.max(180, assigneeStatusStackedData.length * 38)}>
                        <BarChart data={assigneeStatusStackedData} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                          <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} />
                          <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={11} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="pending" name="Biriktirilgan" stackId="status" fill="var(--status-new)" barSize={28} />
                          <Bar
                            dataKey="inProgress"
                            name="Jarayonda"
                            stackId="status"
                            fill="var(--status-in_progress)"
                            barSize={28}
                          />
                          <Bar
                            dataKey="resolved"
                            name="Yechilgan"
                            stackId="status"
                            fill="var(--status-resolved)"
                            radius={[0, 6, 6, 0]}
                            barSize={28}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card span-12">
                      <SectionHeader
                        title="Ijrochilar bo'yicha hal qilish"
                        subtitle={
                          selectedAssigneeId
                            ? 'Tanlangan ijrochi uchun yopilgan tiketlar soni va foydali ish %'
                            : "Har bir ijrochi yopgan tiketlar soni — ustun yonida foydali ish % ko'rsatilgan"
                        }
                      />
                      <ResponsiveContainer width="100%" height={Math.max(160, assigneeCloseRateChartData.length * 38)}>
                        <BarChart data={assigneeCloseRateChartData} layout="vertical" margin={{ left: 8, right: 48 }}>
                          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                          <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} />
                          <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={11} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                          <Bar dataKey="value" name="Yopilgan tiketlar" radius={[0, 6, 6, 0]} barSize={28}>
                            {assigneeCloseRateChartData.map((entry) => (
                              <Cell key={entry.userId} fill={TIER_COLOR[getCloseRateTier(entry.closeRate)]} />
                            ))}
                            <LabelList
                              dataKey="closeRate"
                              position="right"
                              className="bar-value-label"
                              formatter={(v: number) => `${v}%`}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>

            {stats.byOrganization.length > 0 && (
              <div className="section-card">
                <SectionHeader
                  title="Tashkilotlar bo'yicha"
                  subtitle="Eng ko'p murojaat tushirgan top 5 tashkilot"
                  filterContext={scopeLabel}
                />
                {mostActiveOrganization && leastActiveOrganization && (
                  <div className="stat-cards">
                    <OrgHighlightCard
                      icon={<IconTrendUp width={15} height={15} />}
                      accent="var(--success)"
                      accentSoft="var(--success-tint)"
                      organizationName={mostActiveOrganization.organizationName}
                      detail={`Eng faol tashkilot — ${mostActiveOrganization.ticketsCount} ta murojaat (${mostActiveOrganization.sharePercent}%)`}
                    />
                    <OrgHighlightCard
                      icon={<IconTrendDown width={15} height={15} />}
                      accent="var(--text-tertiary)"
                      accentSoft="var(--veil)"
                      organizationName={leastActiveOrganization.organizationName}
                      detail={`Eng kam faol tashkilot — ${leastActiveOrganization.ticketsCount} ta murojaat (${leastActiveOrganization.sharePercent}%)`}
                    />
                  </div>
                )}
                <div className="split-panel">
                  <ResponsiveContainer width="100%" height={Math.max(160, topOrganizations.length * 42)}>
                    <BarChart data={topOrganizations} layout="vertical" margin={{ left: 8, right: 40 }}>
                      <defs>
                        <linearGradient id="orgBarGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="var(--success)" />
                          <stop offset="100%" stopColor="var(--status-resolved)" />
                        </linearGradient>
                        <filter id="orgBarSoftShadow" x="-20%" y="-40%" width="140%" height="180%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(15, 23, 42, 0.22)" />
                        </filter>
                      </defs>
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                      <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} />
                      <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={11} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                      <Bar
                        dataKey="value"
                        name="Murojaatlar soni"
                        fill="url(#orgBarGradient)"
                        filter="url(#orgBarSoftShadow)"
                        radius={[0, 6, 6, 0]}
                        barSize={32}
                      >
                        <LabelList dataKey="value" position="right" className="bar-value-label" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="table-wrap">
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <th>Tashkilot</th>
                          <th>Murojaatlar soni</th>
                          <th>Ulush</th>
                          <th>Yopilgan / Ochiq</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byOrganization.map((o) => (
                          <tr
                            key={o.organizationId}
                            className={o.organizationId === organizationFilter ? 'row--highlighted' : undefined}
                          >
                            <td className="cell-primary">{o.organizationName}</td>
                            <td>{o.ticketsCount}</td>
                            <td>{o.sharePercent}%</td>
                            <td>
                              <OrganizationRatioBar closedCount={o.closedCount} openCount={o.openCount} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="section-card">
              <SectionHeader
                title="Xodimlar va bajarilgan murojaatlar"
                subtitle="Har bir murojaat: qaysi xodim, qaysi tashkilotdan, qachon oldi va qancha vaqtda yakunladi"
                filterContext={scopeLabel}
                action={
                  !isProcessedLoading && !hasProcessedError && sortedProcessedRows.length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleExportProcessedTickets}
                      disabled={isExportingProcessed}
                    >
                      <IconDownload width={14} height={14} />
                      {isExportingProcessed ? 'Tayyorlanmoqda...' : "Excel'ga yuklab olish"}
                    </button>
                  ) : undefined
                }
              />

              {isProcessedLoading ? (
                <TableSkeleton rows={6} cols={9} />
              ) : hasProcessedError ? (
                <EmptyState
                  icon={<IconAlert width={24} height={24} />}
                  title="Ma'lumotni yuklab bo'lmadi"
                  description="Server bilan bog'lanishda xatolik yuz berdi. Sahifani qayta yuklab ko'ring."
                />
              ) : !processedReport || processedReport.rows.length === 0 ? (
                <EmptyState
                  icon={<IconUsers width={24} height={24} />}
                  title="Hozircha bajarilgan yoki jarayondagi murojaatlar yo'q"
                  description="Murojaat ijrochiga tayinlanib ishga olingach, shu yerda ko'rinadi."
                />
              ) : (
                <>
                  {processedReport.byEmployee.length > 0 && (
                    <div className="table-wrap">
                      <table className="tickets-table">
                        <thead>
                          <tr>
                            <SortableTh label="Xodim" sortKey="name" current={employeeSummarySort} onSort={handleEmployeeSummarySort} />
                            <SortableTh
                              label="Jami bajarilgan"
                              sortKey="ticketsCompleted"
                              current={employeeSummarySort}
                              onSort={handleEmployeeSummarySort}
                            />
                            <SortableTh
                              label="O'rtacha qayta ishlash vaqti"
                              sortKey="avgDurationMinutes"
                              current={employeeSummarySort}
                              onSort={handleEmployeeSummarySort}
                            />
                            <SortableTh
                              label="Umumiy sarflangan vaqt"
                              sortKey="totalDurationMinutes"
                              current={employeeSummarySort}
                              onSort={handleEmployeeSummarySort}
                            />
                          </tr>
                        </thead>
                        <tbody>
                          {sortedByEmployee.map((e) => (
                            <tr key={e.employeeId}>
                              <td className="cell-primary">{e.employeeName ?? e.employeeId}</td>
                              <td>{e.ticketsCompleted}</td>
                              <td>{formatProcessingDuration(e.avgDurationMinutes)}</td>
                              <td>{formatProcessingDuration(e.totalDurationMinutes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="table-wrap" style={{ marginTop: 20 }}>
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <th>№</th>
                          <SortableTh
                            label="Xodim"
                            sortKey="employeeName"
                            current={processedRowSort}
                            onSort={handleProcessedRowSort}
                          />
                          <SortableTh
                            label="Tashkilot"
                            sortKey="organizationName"
                            current={processedRowSort}
                            onSort={handleProcessedRowSort}
                          />
                          <th>Murojaat</th>
                          <th>Holat</th>
                          <th>Tushgan sana/vaqt</th>
                          <th>Ishga olingan sana/vaqt</th>
                          <th>Yakunlangan sana/vaqt</th>
                          <SortableTh
                            label="Qayta ishlash vaqti"
                            sortKey="durationMinutes"
                            current={processedRowSort}
                            onSort={handleProcessedRowSort}
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedProcessedRows.map((row, index) => (
                          <tr key={row.ticketId}>
                            <td className="cell-muted">{index + 1}</td>
                            <td className="cell-primary">{row.employeeName ?? row.employeeId ?? '—'}</td>
                            <td>{row.organizationName ?? '—'}</td>
                            <td>
                              <span className="cell-primary">{row.number}</span>
                              <br />
                              <span className="cell-muted">{row.title}</span>
                            </td>
                            <td>{STATUS_LABELS[row.status] ?? row.status}</td>
                            <td>{formatDateTime(row.receivedAt)}</td>
                            <td
                              title={
                                row.processingStartedAtIsFallback
                                  ? "Audit tarixida \"ishga olingan\" belgisi topilmadi — tushgan vaqt asosida taxminiy ko'rsatilgan"
                                  : undefined
                              }
                            >
                              {formatDateTime(row.processingStartedAt)}
                              {row.processingStartedAtIsFallback && ' *'}
                            </td>
                            <td>{formatDateTime(row.completedAt)}</td>
                            <td>{formatProcessingDuration(row.durationMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="chart-summary-note">
                    * — audit tarixida "ishga olingan" belgisi topilmagan murojaatlar uchun tushgan vaqt taxminiy sifatida ko'rsatilgan.
                  </p>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </AppShell>
  );
}
