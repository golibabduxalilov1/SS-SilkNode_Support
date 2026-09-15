import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  IconChevronDown,
  IconClock,
  IconClose,
  IconDownload,
  IconFilter,
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
  MobileFilterDrawer,
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
import { TranslationKey, useLanguage } from '../i18n/LanguageContext';

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
  totalResolutionMinutes: number;
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

function getStatusLabels(t: (key: TranslationKey) => string): Record<string, string> {
  return {
    new: t('ticketFields.statusNew'),
    in_progress: t('ticketFields.statusInProgress'),
    waiting_user: t('ticketFields.statusWaitingUser'),
    resolved: t('ticketFields.statusResolved'),
    closed: t('ticketFields.statusClosed'),
  };
}

function getPriorityLabels(t: (key: TranslationKey) => string): Record<string, string> {
  return {
    low: t('ticketFields.priorityLow'),
    medium: t('ticketFields.priorityMedium'),
    high: t('ticketFields.priorityHigh'),
    critical: t('ticketFields.priorityCritical'),
  };
}

const STATUS_ORDER: Array<keyof DashboardStats['statusCounts']> = [
  'new',
  'in_progress',
  'waiting_user',
  'resolved',
  'closed',
];

function getStatusOptions(t: (key: TranslationKey) => string) {
  const labels = getStatusLabels(t);
  return STATUS_ORDER.map((value) => ({ value, label: labels[value] }));
}

/** T18 — Dashboard'ni 3 tabga bo'lish. Tanlangan tab ?tab= orqali URL'da saqlanadi. */
type DashboardTab = 'overview' | 'team' | 'orgs';

function getDashboardTabs(t: (key: TranslationKey) => string): { key: DashboardTab; label: string }[] {
  return [
    { key: 'overview', label: t('dashboard.tabOverview') },
    { key: 'team', label: t('dashboard.tabTeam') },
    { key: 'orgs', label: t('dashboard.tabOrgs') },
  ];
}

function parseDashboardTab(value: string | null): DashboardTab {
  return value === 'team' || value === 'orgs' ? value : 'overview';
}

function DashboardTabs({ active, onChange }: { active: DashboardTab; onChange: (tab: DashboardTab) => void }) {
  const { t } = useLanguage();
  const tabs = getDashboardTabs(t);
  return (
    <div className="dashboard-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={`dashboard-tab${active === tab.key ? ' dashboard-tab--active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

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

function formatDateTime(value: string | null, dateLocale: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(dateLocale);
}

function getProcessedTicketsExportHeaders(t: (key: TranslationKey) => string): string[] {
  return [
    t('dashboard.exportRowNumber'),
    t('dashboard.exportTicketNumber'),
    t('dashboard.exportEmployee'),
    t('dashboard.exportOrganization'),
    t('dashboard.exportRequester'),
    t('dashboard.exportSubject'),
    t('dashboard.exportCategory'),
    t('dashboard.exportPriority'),
    t('dashboard.exportStatus'),
    t('dashboard.exportReceivedAt'),
    t('dashboard.exportStartedAt'),
    t('dashboard.exportCompletedAt'),
    t('dashboard.exportResolutionTime'),
  ];
}

function processedTicketsToExportRows(
  rows: ProcessedTicketRow[],
  t: (key: TranslationKey) => string,
  dateLocale: string,
): (string | number)[][] {
  const priorityLabels = getPriorityLabels(t);
  const statusLabels = getStatusLabels(t);
  return rows.map((row, index) => [
    index + 1,
    row.number,
    row.employeeName ?? row.employeeId ?? '—',
    row.organizationName ?? '—',
    row.requesterName ?? '—',
    row.title,
    row.categoryName ?? '—',
    priorityLabels[row.priority] ?? row.priority,
    statusLabels[row.status] ?? row.status,
    formatDateTime(row.receivedAt, dateLocale),
    formatDateTime(row.processingStartedAt, dateLocale) + (row.processingStartedAtIsFallback ? ' *' : ''),
    formatDateTime(row.completedAt, dateLocale),
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
  const { t } = useLanguage();
  const total = data.low + data.medium + data.high + data.critical;
  if (total === 0) {
    return <span className="priority-stack priority-stack--empty" title={t('dashboard.emptyPriorityStack')} />;
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
  const { t } = useLanguage();
  const total = closedCount + openCount;
  if (total === 0) {
    return <span className="priority-stack priority-stack--empty" title={t('dashboard.emptyOrgRatio')} />;
  }
  const title = t('dashboard.orgRatioTitleTemplate')
    .replace('{closed}', String(closedCount))
    .replace('{open}', String(openCount));
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
  value: number | string;
  suffix?: string;
  label: string;
  accent?: string | null;
  accentSoft?: string | null;
  trend?: { curr: number; prev: number; title: string } | null;
  compact?: boolean;
}

function KpiCard({ icon, value, suffix, label, accent, accentSoft, trend, compact }: Omit<KpiCardData, 'key'>) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-icon" style={accent ? ({ '--accent': accent, '--accent-soft': accentSoft ?? undefined } as AccentStyle) : undefined}>
          {icon}
        </span>
        {trend && <TrendBadge curr={trend.curr} prev={trend.prev} title={trend.title} />}
      </div>
      <span className={`stat-value${compact ? ' stat-value--compact' : ''}`}>
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

/**
 * T19 — mobilda (<768px) 11-ustunli xodimlar jadvali o'rniga ko'rsatiladigan kartochka.
 * 4 ta asosiy metrika doim ko'rinadi; qolgan 6 tasi "Batafsil" bosilgach ochiladi — hech qanday
 * metrika mobilda butunlay yo'qolmaydi.
 */
function AssigneeMobileCard({
  a,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
}: {
  a: AssigneeStats;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}) {
  const { t } = useLanguage();
  const hasClosedTrendSignal = !(a.ticketsClosed === 0 && a.trendVsPreviousPeriod.ticketsClosedDelta === 0);
  return (
    <div className={`assignee-card${isSelected ? ' assignee-card--selected' : ''}`}>
      <button type="button" className="assignee-card-head" onClick={onSelect}>
        <Avatar name={a.fullname} />
        <span className="cell-primary">{a.fullname ?? a.userId}</span>
      </button>

      <div className="assignee-card-metrics">
        <div className="assignee-card-metric">
          <span className="assignee-card-metric-label">{t('dashboard.colCurrentWorkload')}</span>
          <WorkloadBadge openCount={a.ticketsOpenNow} />
        </div>
        <div className="assignee-card-metric">
          <span className="assignee-card-metric-label">{t('dashboard.colClosed')}</span>
          <span className="assignee-closed-cell">
            {a.ticketsClosed}
            {hasClosedTrendSignal && (
              <TrendBadge
                curr={a.trendVsPreviousPeriod.ticketsClosedCurr}
                prev={a.trendVsPreviousPeriod.ticketsClosedPrev}
                title={t('dashboard.closedTrendTitle')}
              />
            )}
          </span>
        </div>
        <div className="assignee-card-metric">
          <span className="assignee-card-metric-label">{t('dashboard.colSlaCompliance')}</span>
          <SlaBadge complianceRate={a.slaComplianceRate} />
        </div>
        <div className="assignee-card-metric">
          <span className="assignee-card-metric-label">{t('dashboard.colProductivity')}</span>
          <ProductivityBadge score={a.productivityScore} />
        </div>

        {isExpanded && (
          <>
            <div className="assignee-card-metric">
              <span className="assignee-card-metric-label">{t('dashboard.colPriorityBreakdown')}</span>
              <PriorityStackedBar data={a.closedByPriority} />
            </div>
            <div className="assignee-card-metric">
              <span className="assignee-card-metric-label">{t('dashboard.colTotalAssigned')}</span>
              <span>{a.ticketsAssignedTotal}</span>
            </div>
            <div className="assignee-card-metric">
              <span className="assignee-card-metric-label">{t('dashboard.colAvgResolutionTime')}</span>
              <span>{formatProcessingDuration(a.avgResolutionMinutes)}</span>
            </div>
            <div className="assignee-card-metric">
              <span className="assignee-card-metric-label">{t('dashboard.colTotalResolutionTime')}</span>
              <span>{formatProcessingDuration(a.totalResolutionMinutes)}</span>
            </div>
            <div className="assignee-card-metric">
              <span className="assignee-card-metric-label">{t('dashboard.colCloseRate')}</span>
              <ProductivityBadge score={a.closeRate} />
            </div>
            <div className="assignee-card-metric">
              <span className="assignee-card-metric-label">{t('dashboard.colReopenedRate')}</span>
              <ReopenedBadge reopenedRate={a.reopenedRate} />
            </div>
          </>
        )}
      </div>

      <button type="button" className="assignee-card-toggle" onClick={onToggleExpand}>
        {isExpanded ? t('dashboard.hideButton') : t('dashboard.detailsButton')}
      </button>
    </div>
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
  const { t } = useLanguage();
  const STATUS_OPTIONS = getStatusOptions(t);
  return (
    <div className="filter-panel">
      <div className="filter-panel-row">
        <label className="filter-field">
          <span className="filter-field-label">{t('dashboard.assigneeLabel')}</span>
          <select value={assigneeFilter} onChange={(e) => onAssigneeChange(e.target.value)}>
            <option value="">{t('dashboard.all')}</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullname ?? a.id}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field-label">{t('dashboard.organizationLabel')}</span>
          <select value={organizationFilter} onChange={(e) => onOrganizationChange(e.target.value)}>
            <option value="">{t('dashboard.all')}</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field-label">{t('dashboard.categoryLabel')}</span>
          <select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)}>
            <option value="">{t('dashboard.all')}</option>
            <CategoryOptionGroups categories={categories} />
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field-label">{t('dashboard.statusLabel')}</span>
          <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
            <option value="">{t('dashboard.all')}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="filter-field filter-field--range">
          <span className="filter-field-label">{t('dashboard.dateRangeLabel')}</span>
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
              {t('dashboard.updating')}
            </span>
          )}
          {hasActiveFilters && (
            <button type="button" className="btn btn-secondary btn-sm filter-clear-btn" onClick={onClearAll}>
              <IconClose width={13} height={13} />
              {t('dashboard.clearFilters')}
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
  const { language, t } = useLanguage();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const STATUS_LABELS = getStatusLabels(t);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseDashboardTab(searchParams.get('tab'));
  const handleTabChange = (tab: DashboardTab) => {
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  };

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [assigneeSort, setAssigneeSort] = useState<AssigneeSortState>({ key: 'name', dir: 'asc' });
  // T19 — mobilda xodimlar jadvali kartochkalarga aylanadi; har bir kartochka mustaqil ravishda
  // "Batafsil" orqali qolgan metrikalarni ochadi/yopadi.
  const [expandedAssigneeCards, setExpandedAssigneeCards] = useState<Set<string>>(new Set());
  const toggleAssigneeCard = (userId: string) => {
    setExpandedAssigneeCards((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };
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
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);

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
        label: `${t('dashboard.assigneeLabel')}: ${selectedAssigneeName}`,
        onClear: () => setSelectedAssigneeId(null),
      });
    }
    if (organizationFilter) {
      const org = organizations.find((o) => o.id === organizationFilter);
      chips.push({
        key: 'org',
        label: `${t('dashboard.organizationLabel')}: ${org?.name ?? organizationFilter}`,
        onClear: () => setOrganizationFilter(''),
      });
    }
    if (categoryFilter) {
      const category = categories.find((c) => c.id === categoryFilter);
      chips.push({
        key: 'category',
        label: `${t('dashboard.categoryLabel')}: ${category?.name ?? categoryFilter}`,
        onClear: () => setCategoryFilter(''),
      });
    }
    if (statusFilter) {
      chips.push({
        key: 'status',
        label: `${t('dashboard.statusLabel')}: ${STATUS_LABELS[statusFilter] ?? statusFilter}`,
        onClear: () => setStatusFilter(''),
      });
    }
    if (dateFrom || dateTo) {
      const label =
        dateFrom && dateTo
          ? `${t('dashboard.dateLabel')}: ${dateFrom} — ${dateTo}`
          : dateFrom
            ? `${t('dashboard.dateLabel')}: ${dateFrom} ${t('dashboard.dateFromSuffix')}`
            : `${t('dashboard.dateLabel')}: ${dateTo} ${t('dashboard.dateToSuffix')}`;
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
    STATUS_LABELS,
    t,
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
  }, [stats, STATUS_LABELS]);

  const statusTotal = useMemo(
    () => (stats ? Object.values(stats.statusCounts).reduce((a, b) => a + b, 0) : 0),
    [stats],
  );

  const noFilteredData = hasPanelFilters && !!stats && statusTotal === 0 && stats.allOpen === 0;

  const donutData =
    pieData.length > 0
      ? pieData
      : [{ key: 'empty', name: t('dashboard.noDataShort'), value: 1, fill: 'var(--border-strong)' }];

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
      parts.push(t('dashboard.assigneeForTemplate').replace('{name}', String(selectedAssigneeName)));
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
      parts.push(
        dateFrom && dateTo
          ? `${dateFrom}–${dateTo}`
          : dateFrom
            ? `${dateFrom} ${t('dashboard.dateFromSuffix')}`
            : `${dateTo} ${t('dashboard.dateToSuffix')}`,
      );
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
    STATUS_LABELS,
    t,
  ]);

  const periodLabel = dateFrom || dateTo ? t('dashboard.selectedPeriod') : t('dashboard.last30Days');

  async function handleExportProcessedTickets() {
    setIsExportingProcessed(true);
    try {
      const filterSummary = scopeLabel
        ? `${t('dashboard.exportScopePrefix')}: ${scopeLabel}`
        : t('dashboard.exportScopeOverview');
      await exportTableToExcel({
        title: t('dashboard.processedTicketsTitle'),
        subtitle: `${t('dashboard.exportCreatedLabel')}: ${new Date().toLocaleString(dateLocale)} • ${t(
          'dashboard.exportTotalLabel',
        )}: ${sortedProcessedRows.length} ${t('dashboard.exportUnit')} • ${filterSummary}`,
        headers: getProcessedTicketsExportHeaders(t),
        rows: processedTicketsToExportRows(sortedProcessedRows, t, dateLocale),
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
          label: t('dashboard.kpiTotal'),
          accent: 'var(--primary)',
          accentSoft: 'var(--primary-soft)',
          trend: null,
        },
        {
          key: 'resolved',
          icon: <IconCheck width={17} height={17} />,
          value: stats.statusCounts.resolved,
          label: t('dashboard.kpiResolved'),
          accent: 'var(--status-resolved)',
          accentSoft: 'var(--status-resolved-soft)',
          trend: null,
        },
        {
          key: 'in_progress',
          icon: <IconSpinner width={17} height={17} />,
          value: stats.statusCounts.in_progress,
          label: t('dashboard.kpiInProgress'),
          accent: 'var(--status-in_progress)',
          accentSoft: 'var(--status-in_progress-soft)',
          trend: null,
        },
        {
          key: 'closed',
          icon: <IconLock width={17} height={17} />,
          value: stats.statusCounts.closed,
          label: t('dashboard.kpiClosed'),
          accent: 'var(--status-closed)',
          accentSoft: 'var(--status-closed-soft)',
          trend: null,
        },
        {
          key: 'new',
          icon: <IconTicketNew width={17} height={17} />,
          value: stats.statusCounts.new,
          label: t('dashboard.kpiNew'),
          accent: 'var(--status-new)',
          accentSoft: 'var(--status-new-soft)',
          trend:
            trendDelta && trendDelta.hasCreatedData
              ? {
                  curr: trendDelta.createdCurr,
                  prev: trendDelta.createdPrev,
                  title: t('dashboard.trendCreatedTitle'),
                }
              : null,
        },
        {
          key: 'waiting_user',
          icon: <IconWait width={17} height={17} />,
          value: stats.statusCounts.waiting_user,
          label: t('dashboard.kpiWaitingUser'),
          accent: 'var(--status-waiting_user)',
          accentSoft: 'var(--status-waiting_user-soft)',
          trend: null,
        },
        {
          key: 'closedToday',
          icon: <IconCheck width={17} height={17} />,
          value: stats.closedToday,
          label: t('dashboard.kpiClosedToday'),
          accent: 'var(--status-closed)',
          accentSoft: 'var(--status-closed-soft)',
          trend:
            trendDelta && trendDelta.hasClosedData
              ? {
                  curr: trendDelta.closedCurr,
                  prev: trendDelta.closedPrev,
                  title: t('dashboard.trendClosedTitle'),
                }
              : null,
        },
        {
          key: 'totalTimeSpent',
          icon: <IconClock width={17} height={17} />,
          value: formatDurationMinutes(stats.totalResolutionMinutes),
          label: t('dashboard.kpiTotalTimeSpent'),
          accent: 'var(--primary)',
          accentSoft: 'var(--primary-soft)',
          trend: null,
          compact: true,
        },
      ]
    : [];

  return (
    <AppShell
      title={t('dashboard.title')}
      breadcrumb={scopeLabel ? `${t('dashboard.scopeCut')}: ${scopeLabel}` : t('dashboard.overviewAllTime')}
    >
      <div className="toolbar-collapsible">
        <button
          type="button"
          className={`toolbar-toggle${isToolbarOpen ? ' toolbar-toggle--open' : ''}`}
          aria-expanded={isToolbarOpen}
          onClick={() => setIsToolbarOpen((open) => !open)}
        >
          <IconFilter width={15} height={15} />
          {t('dashboard.toolbarToggle')}
          {filterChips.length > 0 && <span className="filter-active-chip">{filterChips.length}</span>}
          <IconChevronDown width={15} height={15} className="toolbar-toggle-chevron" />
        </button>

        {isToolbarOpen && (
          <MobileFilterDrawer activeCount={filterChips.length}>
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
          </MobileFilterDrawer>
        )}
      </div>

      <div className={`scope-banner ${scopeLabel ? 'scope-banner--active' : 'scope-banner--neutral'}`}>
        {scopeLabel ? (
          <>
            {t('dashboard.scopeCut')}: <strong>{scopeLabel}</strong>
          </>
        ) : (
          t('dashboard.scopeBannerNeutral')
        )}
      </div>

      {isLoading ? (
        <>
          <div className="stat-cards">
            {Array.from({ length: 8 }).map((_, i) => (
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
          title={t('dashboard.statsLoadError')}
          description={t('dashboard.serverErrorDescription')}
        />
      ) : (
        stats &&
        (noFilteredData ? (
          <EmptyState
            icon={<IconSearch width={24} height={24} />}
            title={t('dashboard.noFilteredDataTitle')}
            description={t('dashboard.noFilteredDataDescription')}
          />
        ) : (
          <div className={`dashboard-content${isRefreshing ? ' is-refreshing' : ''}`}>
            <DashboardTabs active={activeTab} onChange={handleTabChange} />

            {activeTab === 'overview' && (
              <>
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
                  compact={card.compact}
                />
              ))}
            </div>

            <div className="bento-grid">
              <div className="chart-card span-12 trend-chart-card">
                <SectionHeader
                  title={t('dashboard.trendDynamicsTitle')}
                  subtitle={t('dashboard.trendDynamicsSubtitle')}
                  filterContext={scopeLabel}
                />
                <TrendChart data={stats.dailyTrend} periodLabel={periodLabel} />
              </div>

              <div className="chart-card span-5">
                <SectionHeader
                  title={t('dashboard.statusDistributionTitle')}
                  subtitle={t('dashboard.statusDistributionSubtitle')}
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
                      <span className="donut-center-label">{t('dashboard.donutTotal')}</span>
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
                    <p className="chart-empty-note chart-empty-note--inline">{t('dashboard.noTicketsYet')}</p>
                  )}
                </div>
                <p className="chart-summary-note">
                  <strong>{statusTotal}</strong> {t('dashboard.basedOnTickets')}
                  {scopeLabel && t('dashboard.perCurrentScope')}
                </p>
              </div>

              <div className="chart-card span-7">
                <SectionHeader
                  title={t('dashboard.categoryDistributionTitle')}
                  subtitle={t('dashboard.categoryDistributionSubtitle')}
                  filterContext={scopeLabel}
                />
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(220, categoryChartData.length * 38)}>
                    <BarChart data={categoryChartData} layout="vertical" margin={{ left: 8, right: 40 }}>
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                      <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} />
                      <YAxis type="category" dataKey="name" width={140} stroke="var(--text-tertiary)" fontSize={11} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                      <Bar
                        dataKey="value"
                        name={t('dashboard.ticketsCountSeries')}
                        fill="var(--indigo-600)"
                        radius={[0, 6, 6, 0]}
                        barSize={28}
                      >
                        <LabelList dataKey="value" position="right" className="bar-value-label" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="chart-empty-note">{t('dashboard.noCategoryData')}</p>
                )}
              </div>

              <div className="chart-card span-12 trend-chart-card">
                <SectionHeader
                  title={t('dashboard.resolutionFlowTitle')}
                  subtitle={t('dashboard.resolutionFlowSubtitle')}
                  filterContext={scopeLabel}
                />
                <ResolutionFlowChart data={stats.resolutionFlow} />
              </div>
            </div>
              </>
            )}

            {activeTab === 'team' && (
              <div className="bento-grid">
              <div className="chart-card span-12">
                <SectionHeader
                  title={t('dashboard.assigneeTrendTitle')}
                  subtitle={
                    selectedAssigneeId
                      ? t('dashboard.assigneeTrendSubtitleSelected')
                      : t('dashboard.assigneeTrendSubtitleAll')
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
            )}

            {activeTab === 'team' && (
            <div className="section-card assignee-analytics" ref={assigneeSectionRef}>
              <SectionHeader
                title={t('dashboard.byAssigneeTitle')}
                subtitle={
                  selectedAssigneeId ? t('dashboard.byAssigneeSubtitleSelected') : t('dashboard.byAssigneeSubtitleAll')
                }
                filterContext={hasPanelFilters ? scopeLabel : null}
                action={
                  selectedAssigneeId ? (
                    <span className="dashboard-filter-banner">
                      {t('dashboard.filterPrefix')}: <strong>{selectedAssigneeName}</strong>
                      <button
                        type="button"
                        className="dashboard-filter-banner-clear"
                        onClick={() => setSelectedAssigneeId(null)}
                      >
                        <IconClose width={12} height={12} />
                        {t('dashboard.clear')}
                      </button>
                    </span>
                  ) : undefined
                }
              />

              {stats.byAssignee.length === 0 ? (
                <EmptyState
                  icon={<IconUsers width={24} height={24} />}
                  title={t('dashboard.noAssigneeDataTitle')}
                  description={t('dashboard.noAssigneeDataDescription')}
                />
              ) : (
                <>
                  <div className="table-wrap assignee-table-wrap">
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <SortableTh label={t('dashboard.colEmployee')} sortKey="name" current={assigneeSort} onSort={handleAssigneeSort} />
                          <SortableTh
                            label={t('dashboard.colCurrentWorkload')}
                            sortKey="ticketsOpenNow"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label={t('dashboard.colClosed')}
                            sortKey="ticketsClosed"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <th>{t('dashboard.colPriorityBreakdown')}</th>
                          <SortableTh
                            label={t('dashboard.colTotalAssigned')}
                            sortKey="ticketsAssignedTotal"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label={t('dashboard.colAvgResolutionTime')}
                            sortKey="avgResolutionMinutes"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label={t('dashboard.colTotalResolutionTime')}
                            sortKey="totalResolutionMinutes"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label={t('dashboard.colSlaCompliance')}
                            sortKey="slaComplianceRate"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label={t('dashboard.colProductivity')}
                            sortKey="productivityScore"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label={t('dashboard.colCloseRate')}
                            sortKey="closeRate"
                            current={assigneeSort}
                            onSort={handleAssigneeSort}
                          />
                          <SortableTh
                            label={t('dashboard.colReopenedRate')}
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
                                      title={t('dashboard.closedTrendTitle')}
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
                                  {t('dashboard.detailsButton')}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="assignee-cards">
                    {sortedByAssignee.map((a) => (
                      <AssigneeMobileCard
                        key={a.userId}
                        a={a}
                        isSelected={a.userId === selectedAssigneeId}
                        isExpanded={expandedAssigneeCards.has(a.userId)}
                        onSelect={() => handleSelectAssignee(a.userId)}
                        onToggleExpand={() => toggleAssigneeCard(a.userId)}
                      />
                    ))}
                  </div>

                  <div className="bento-grid assignee-charts">
                    <div className="chart-card span-6">
                      <SectionHeader title={t('dashboard.slaRankingTitle')} subtitle={t('dashboard.slaRankingSubtitle')} />
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
                          <Bar dataKey="value" name={t('dashboard.slaComplianceSeries')} radius={[0, 6, 6, 0]} barSize={28}>
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
                      <SectionHeader
                        title={t('dashboard.workloadDistributionTitle')}
                        subtitle={t('dashboard.workloadDistributionSubtitle')}
                      />
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
                            label={{ value: t('dashboard.average'), position: 'insideTopRight', fill: 'var(--text-muted)', fontSize: 11 }}
                          />
                          <Bar dataKey="value" name={t('dashboard.openTicketsSeries')} radius={[6, 6, 0, 0]} barSize={32}>
                            {assigneeWorkloadChartData.map((entry) => (
                              <Cell key={entry.userId} fill={TIER_COLOR[getWorkloadTier(entry.value)]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card span-12">
                      <SectionHeader
                        title={t('dashboard.overallWorkloadTitle')}
                        subtitle={t('dashboard.overallWorkloadSubtitle')}
                      />
                      <ResponsiveContainer width="100%" height={Math.max(180, assigneeStatusStackedData.length * 38)}>
                        <BarChart data={assigneeStatusStackedData} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                          <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} />
                          <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={11} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="pending" name={t('dashboard.seriesPending')} stackId="status" fill="var(--status-new)" barSize={28} />
                          <Bar
                            dataKey="inProgress"
                            name={t('dashboard.seriesInProgress')}
                            stackId="status"
                            fill="var(--status-in_progress)"
                            barSize={28}
                          />
                          <Bar
                            dataKey="resolved"
                            name={t('dashboard.seriesResolved')}
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
                        title={t('dashboard.resolutionByAssigneeTitle')}
                        subtitle={
                          selectedAssigneeId
                            ? t('dashboard.resolutionByAssigneeSubtitleSelected')
                            : t('dashboard.resolutionByAssigneeSubtitleAll')
                        }
                      />
                      <ResponsiveContainer width="100%" height={Math.max(160, assigneeCloseRateChartData.length * 38)}>
                        <BarChart data={assigneeCloseRateChartData} layout="vertical" margin={{ left: 8, right: 48 }}>
                          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                          <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} />
                          <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={11} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                          <Bar dataKey="value" name={t('dashboard.closedTicketsSeries')} radius={[0, 6, 6, 0]} barSize={28}>
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
            )}

            {activeTab === 'orgs' && stats.byOrganization.length === 0 && (
              <EmptyState
                icon={<IconUsers width={24} height={24} />}
                title={t('dashboard.noOrgDataTitle')}
                description={t('dashboard.noOrgDataDescription')}
              />
            )}

            {activeTab === 'orgs' && stats.byOrganization.length > 0 && (
              <div className="section-card">
                <SectionHeader
                  title={t('dashboard.byOrganizationTitle')}
                  subtitle={t('dashboard.byOrganizationSubtitle')}
                  filterContext={scopeLabel}
                />
                {mostActiveOrganization && leastActiveOrganization && (
                  <div className="stat-cards">
                    <OrgHighlightCard
                      icon={<IconTrendUp width={15} height={15} />}
                      accent="var(--success)"
                      accentSoft="var(--success-tint)"
                      organizationName={mostActiveOrganization.organizationName}
                      detail={t('dashboard.mostActiveOrgDetailTemplate')
                        .replace('{count}', String(mostActiveOrganization.ticketsCount))
                        .replace('{percent}', String(mostActiveOrganization.sharePercent))}
                    />
                    <OrgHighlightCard
                      icon={<IconTrendDown width={15} height={15} />}
                      accent="var(--text-tertiary)"
                      accentSoft="var(--veil)"
                      organizationName={leastActiveOrganization.organizationName}
                      detail={t('dashboard.leastActiveOrgDetailTemplate')
                        .replace('{count}', String(leastActiveOrganization.ticketsCount))
                        .replace('{percent}', String(leastActiveOrganization.sharePercent))}
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
                        name={t('dashboard.ticketsCountSeries')}
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
                          <th>{t('dashboard.colOrganization')}</th>
                          <th>{t('dashboard.colTicketsCount')}</th>
                          <th>{t('dashboard.colShare')}</th>
                          <th>{t('dashboard.colClosedOpen')}</th>
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

            {activeTab === 'team' && (
            <div className="section-card">
              <SectionHeader
                title={t('dashboard.processedTicketsTitle')}
                subtitle={t('dashboard.processedTicketsSubtitle')}
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
                      {isExportingProcessed ? t('dashboard.preparing') : t('dashboard.exportToExcel')}
                    </button>
                  ) : undefined
                }
              />

              {isProcessedLoading ? (
                <TableSkeleton rows={6} cols={9} />
              ) : hasProcessedError ? (
                <EmptyState
                  icon={<IconAlert width={24} height={24} />}
                  title={t('dashboard.processedLoadError')}
                  description={t('dashboard.serverErrorDescription')}
                />
              ) : !processedReport || processedReport.rows.length === 0 ? (
                <EmptyState
                  icon={<IconUsers width={24} height={24} />}
                  title={t('dashboard.noProcessedDataTitle')}
                  description={t('dashboard.noProcessedDataDescription')}
                />
              ) : (
                <>
                  {processedReport.byEmployee.length > 0 && (
                    <div className="table-wrap">
                      <table className="tickets-table">
                        <thead>
                          <tr>
                            <SortableTh
                              label={t('dashboard.colEmployee')}
                              sortKey="name"
                              current={employeeSummarySort}
                              onSort={handleEmployeeSummarySort}
                            />
                            <SortableTh
                              label={t('dashboard.colTotalCompleted')}
                              sortKey="ticketsCompleted"
                              current={employeeSummarySort}
                              onSort={handleEmployeeSummarySort}
                            />
                            <SortableTh
                              label={t('dashboard.colAvgResolutionTime')}
                              sortKey="avgDurationMinutes"
                              current={employeeSummarySort}
                              onSort={handleEmployeeSummarySort}
                            />
                            <SortableTh
                              label={t('dashboard.colTotalSpentTime')}
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
                          <th>{t('dashboard.colNumber')}</th>
                          <SortableTh
                            label={t('dashboard.colEmployee')}
                            sortKey="employeeName"
                            current={processedRowSort}
                            onSort={handleProcessedRowSort}
                          />
                          <SortableTh
                            label={t('dashboard.colOrganization')}
                            sortKey="organizationName"
                            current={processedRowSort}
                            onSort={handleProcessedRowSort}
                          />
                          <th>{t('dashboard.colTicket')}</th>
                          <th>{t('dashboard.statusLabel')}</th>
                          <th>{t('dashboard.colReceivedAt')}</th>
                          <th>{t('dashboard.colStartedAt')}</th>
                          <th>{t('dashboard.colCompletedAt')}</th>
                          <SortableTh
                            label={t('dashboard.colResolutionTime')}
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
                            <td>{formatDateTime(row.receivedAt, dateLocale)}</td>
                            <td
                              title={
                                row.processingStartedAtIsFallback
                                  ? t('dashboard.fallbackStartedAtTitle')
                                  : undefined
                              }
                            >
                              {formatDateTime(row.processingStartedAt, dateLocale)}
                              {row.processingStartedAtIsFallback && ' *'}
                            </td>
                            <td>{formatDateTime(row.completedAt, dateLocale)}</td>
                            <td>{formatProcessingDuration(row.durationMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="chart-summary-note">{t('dashboard.fallbackFootnote')}</p>
                </>
              )}
            </div>
            )}
          </div>
        ))
      )}
    </AppShell>
  );
}
