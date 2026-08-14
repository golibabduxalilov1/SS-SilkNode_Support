import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
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
  IconClock,
  IconClose,
  IconLayers,
  IconShield,
  IconSpinner,
  IconTicketNew,
  IconTrendDown,
  IconTrendFlat,
  IconTrendUp,
  IconUsers,
  IconWait,
} from '../components/icons';
import { Avatar, EmptyState, StatCardSkeleton, TableSkeleton } from '../components/ui';

interface ClosedByPriority {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface AssigneeStats {
  userId: string;
  fullname: string | null;
  ticketsAssignedTotal: number;
  ticketsOpenNow: number;
  ticketsClosed: number;
  closedByPriority: ClosedByPriority;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  slaFirstResponseBreachCount: number;
  slaResolutionBreachCount: number;
  slaComplianceRate: number;
  trendVsPreviousPeriod: {
    ticketsClosedDelta: number;
  };
}

interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  ticketsCount: number;
  avgResolutionMinutes: number | null;
}

interface DailyTrendPoint {
  date: string;
  created: number;
  closed: number;
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
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  byAssignee: AssigneeStats[];
  byOrganization: OrganizationStats[];
  dailyTrend: DailyTrendPoint[];
  slaThresholds: {
    firstResponse: number;
    resolution: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  waiting_user: 'Javob kutilmoqda',
  resolved: 'Yechilgan',
  closed: 'Yopilgan',
};

const STATUS_ORDER: Array<keyof DashboardStats['statusCounts']> = [
  'new',
  'in_progress',
  'waiting_user',
  'resolved',
  'closed',
];

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} daq.`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} soat ${rest} daq.`;
}

function gaugeTier(minutes: number | null, goodMax: number, warnMax: number): 'good' | 'warn' | 'bad' {
  if (minutes == null) return 'good';
  if (minutes <= goodMax) return 'good';
  if (minutes <= warnMax) return 'warn';
  return 'bad';
}

function gaugePercent(minutes: number | null, warnMax: number): number {
  if (minutes == null) return 0;
  return Math.max(4, Math.min(100, Math.round((minutes / warnMax) * 100)));
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

function formatDayLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}`;
}

function percentDelta(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function ChartTooltip({ active, payload, label, labelFormatter }: any) {
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

function TrendBadge({ delta, title }: { delta: number; title: string }) {
  const tone = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const Icon = tone === 'up' ? IconTrendUp : tone === 'down' ? IconTrendDown : IconTrendFlat;
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`stat-card-trend stat-card-trend--${tone}`} title={title}>
      <Icon width={11} height={11} />
      {sign}
      {delta}%
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

function TimeGauge({
  icon,
  label,
  minutes,
  goodMax,
  warnMax,
}: {
  icon: ReactNode;
  label: string;
  minutes: number | null;
  goodMax: number;
  warnMax: number;
}) {
  const tier = gaugeTier(minutes, goodMax, warnMax);
  const percent = gaugePercent(minutes, warnMax);
  const data = [{ value: percent }];

  return (
    <div className="radial-gauge">
      <div className="radial-gauge-chart">
        <ResponsiveContainer width="100%" height={150}>
          <RadialBarChart
            data={data}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={13}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} fill={TIER_COLOR[tier]} background={{ fill: 'var(--surface-alt)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="radial-gauge-center">
          <span className="radial-gauge-value">{formatMinutes(minutes)}</span>
        </div>
      </div>
      <span className="stat-label">
        {icon} {label}
      </span>
    </div>
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

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    api
      .get('/admin/dashboard/stats', {
        params: selectedAssigneeId ? { assignedToId: selectedAssigneeId } : undefined,
      })
      .then((res) => {
        if (!cancelled) setStats(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAssigneeId]);

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

  const selectedAssigneeName = useMemo(() => {
    if (!selectedAssigneeId || !stats) return null;
    return stats.byAssignee.find((a) => a.userId === selectedAssigneeId)?.fullname ?? selectedAssigneeId;
  }, [selectedAssigneeId, stats]);

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

  const trendTotal = useMemo(
    () => (stats ? stats.dailyTrend.reduce((sum, p) => sum + p.created + p.closed, 0) : 0),
    [stats],
  );

  const trendDelta = useMemo(() => {
    if (!stats || stats.dailyTrend.length < 2) return null;
    const today = stats.dailyTrend[stats.dailyTrend.length - 1];
    const yesterday = stats.dailyTrend[stats.dailyTrend.length - 2];
    return {
      created: percentDelta(today.created, yesterday.created),
      closed: percentDelta(today.closed, yesterday.closed),
    };
  }, [stats]);

  return (
    <AppShell title="Dashboard" breadcrumb="Umumiy ko'rinish">
      {isLoading ? (
        <>
          <div className="stat-cards">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={6} cols={7} />
        </>
      ) : hasError ? (
        <EmptyState
          icon={<IconAlert width={24} height={24} />}
          title="Statistikani yuklab bo'lmadi"
          description="Server bilan bog'lanishda xatolik yuz berdi. Sahifani qayta yuklab ko'ring."
        />
      ) : (
        stats && (
          <>
            <div className="stat-cards">
              {[
                {
                  key: 'new',
                  icon: <IconTicketNew width={17} height={17} />,
                  value: stats.statusCounts.new,
                  label: 'Yangi',
                  accent: 'var(--status-new)',
                  accentSoft: 'var(--status-new-soft)',
                  trend: trendDelta
                    ? { delta: trendDelta.created, title: 'Bugun yaratilgan murojaatlar, kechaga nisbatan' }
                    : null,
                },
                {
                  key: 'in_progress',
                  icon: <IconSpinner width={17} height={17} />,
                  value: stats.statusCounts.in_progress,
                  label: 'Ish jarayonida',
                  accent: 'var(--status-in_progress)',
                  accentSoft: 'var(--status-in_progress-soft)',
                  trend: null,
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
                  trend: trendDelta
                    ? { delta: trendDelta.closed, title: 'Bugun yopilgan murojaatlar, kechaga nisbatan' }
                    : null,
                },
                {
                  key: 'allOpen',
                  icon: <IconLayers width={17} height={17} />,
                  value: stats.allOpen,
                  label: 'Barcha ochiq',
                  accent: null,
                  accentSoft: null,
                  trend: null,
                },
              ].map((card) => (
                <div className="stat-card" key={card.key}>
                  <div className="stat-card-top">
                    <span
                      className="stat-card-icon"
                      style={
                        card.accent
                          ? { ['--accent' as any]: card.accent, ['--accent-soft' as any]: card.accentSoft }
                          : undefined
                      }
                    >
                      {card.icon}
                    </span>
                    {card.trend && <TrendBadge delta={card.trend.delta} title={card.trend.title} />}
                  </div>
                  <span className="stat-value">{card.value}</span>
                  <span className="stat-label">{card.label}</span>
                </div>
              ))}
            </div>

            <div className="bento-grid">
              <div className="chart-card span-12 trend-chart-card">
                <div className="chart-card-head">
                  <div>
                    <h3>Kunlik dinamika</h3>
                    <p className="chart-card-subtitle">Oxirgi 14 kun: yaratilgan va yopilgan murojaatlar</p>
                  </div>
                  <ul className="chart-legend chart-legend--inline">
                    <li className="chart-legend-item">
                      <span className="chart-legend-swatch" style={{ background: 'var(--primary)' }} />
                      <span className="chart-legend-name">Yaratilgan</span>
                    </li>
                    <li className="chart-legend-item">
                      <span className="chart-legend-swatch" style={{ background: 'var(--success)' }} />
                      <span className="chart-legend-name">Yopilgan</span>
                    </li>
                  </ul>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={stats.dailyTrend} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendCreatedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="trendClosedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDayLabel}
                      stroke="var(--text-tertiary)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis allowDecimals={false} stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={32} />
                    <Tooltip content={<ChartTooltip labelFormatter={formatDayLabel} />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="created"
                      name="Yaratilgan"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#trendCreatedFill)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="closed"
                      name="Yopilgan"
                      stroke="var(--success)"
                      strokeWidth={2.5}
                      fill="url(#trendClosedFill)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                {trendTotal === 0 && (
                  <p className="chart-empty-note">Hozircha maʼlumot yoʻq — murojaatlar kelib tushishi bilan grafik to'ladi.</p>
                )}
              </div>

              <div className="chart-card span-5">
                <h3>Holat bo'yicha taqsimot</h3>
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
              </div>

              <div className="chart-card span-4 time-tracking">
                <h3>Time Tracking</h3>
                <p className="time-tracking-subtitle">SLA maqsadlariga nisbatan o'rtacha ko'rsatkichlar</p>
                <div className="radial-gauges">
                  <TimeGauge
                    icon={<IconClock width={13} height={13} />}
                    label="O'rtacha birinchi javob vaqti"
                    minutes={stats.avgFirstResponseMinutes}
                    goodMax={stats.slaThresholds.firstResponse}
                    warnMax={120}
                  />
                  <TimeGauge
                    icon={<IconClock width={13} height={13} />}
                    label="O'rtacha yopish vaqti"
                    minutes={stats.avgResolutionMinutes}
                    goodMax={240}
                    warnMax={stats.slaThresholds.resolution}
                  />
                </div>
              </div>

              <div className="chart-card span-3">
                <h3>Yopilgan murojaatlar dinamikasi</h3>
                <div className="closed-stats-grid closed-stats-grid--stack">
                  <div className="closed-stat">
                    <span className="closed-stat-value">{stats.closedToday}</span>
                    <span className="stat-label">Bugun</span>
                  </div>
                  <div className="closed-stat">
                    <span className="closed-stat-value">{stats.closedThisWeek}</span>
                    <span className="stat-label">Shu hafta</span>
                  </div>
                  <div className="closed-stat">
                    <span className="closed-stat-value">{stats.closedThisMonth}</span>
                    <span className="stat-label">Shu oy</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="section-card assignee-analytics" ref={assigneeSectionRef}>
              <div className="chart-card-head">
                <div>
                  <h3>Ijrochilar bo'yicha</h3>
                  <p className="chart-card-subtitle">
                    Har bir xodimning ish sifati va yuklamasi bo'yicha chuqur tahlil
                  </p>
                </div>
                {selectedAssigneeId && (
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
                )}
              </div>

              {stats.byAssignee.length === 0 ? (
                <EmptyState
                  icon={<IconUsers width={24} height={24} />}
                  title="Hali hech kimga murojaat tayinlanmagan"
                  description="Xodimlar bo'yicha tahlil murojaatlar tayinlangach shu yerda paydo bo'ladi."
                />
              ) : (
                <>
                  {assigneeSummary && (
                    <div className="assignee-summary">
                      <div className="stat-card stat-card--mini">
                        <span
                          className="stat-card-icon"
                          style={{ '--accent': 'var(--primary)', '--accent-soft': 'var(--primary-soft)' } as AccentStyle}
                        >
                          <IconUsers width={15} height={15} />
                        </span>
                        <span className="stat-value">{assigneeSummary.activeCount}</span>
                        <span className="stat-label">Faol xodimlar</span>
                      </div>
                      <div className="stat-card stat-card--mini">
                        <span
                          className="stat-card-icon"
                          style={
                            {
                              '--accent': 'var(--status-in_progress)',
                              '--accent-soft': 'var(--status-in_progress-soft)',
                            } as AccentStyle
                          }
                        >
                          <IconLayers width={15} height={15} />
                        </span>
                        <span className="stat-value">{assigneeSummary.avgWorkload}</span>
                        <span className="stat-label">O'rtacha yuklama (kishi boshiga)</span>
                      </div>
                      <div className="stat-card stat-card--mini">
                        <span
                          className="stat-card-icon"
                          style={{ '--accent': 'var(--success)', '--accent-soft': 'var(--success-tint)' } as AccentStyle}
                        >
                          <IconShield width={15} height={15} />
                        </span>
                        <span className="stat-value">
                          {assigneeSummary.bestSla ? `${assigneeSummary.bestSla.slaComplianceRate}%` : '—'}
                        </span>
                        <span className="stat-label">
                          Eng yuqori SLA
                          {assigneeSummary.bestSla && ` — ${assigneeSummary.bestSla.fullname ?? assigneeSummary.bestSla.userId}`}
                        </span>
                      </div>
                      <div className="stat-card stat-card--mini stat-card--danger">
                        <span
                          className="stat-card-icon"
                          style={{ '--accent': 'var(--danger)', '--accent-soft': 'var(--error-tint)' } as AccentStyle}
                        >
                          <IconAlert width={15} height={15} />
                        </span>
                        <span className="stat-value">
                          {assigneeSummary.worstSla ? `${assigneeSummary.worstSla.slaComplianceRate}%` : '—'}
                        </span>
                        <span className="stat-label">
                          Eng past SLA
                          {assigneeSummary.worstSla && ` — ${assigneeSummary.worstSla.fullname ?? assigneeSummary.worstSla.userId}`}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="table-wrap assignee-table-wrap">
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <th>Xodim</th>
                          <th>Joriy yuklama</th>
                          <th>Yopilgan</th>
                          <th>Muhimlik taqsimoti</th>
                          <th>O'rtacha javob</th>
                          <th>O'rtacha yopish</th>
                          <th>SLA muvofiqligi</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byAssignee.map((a) => (
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
                                <TrendBadge
                                  delta={a.trendVsPreviousPeriod.ticketsClosedDelta}
                                  title="Oldingi teng davrga nisbatan yopilgan murojaatlar"
                                />
                              </span>
                            </td>
                            <td>
                              <PriorityStackedBar data={a.closedByPriority} />
                            </td>
                            <td>{formatMinutes(a.avgFirstResponseMinutes)}</td>
                            <td>{formatMinutes(a.avgResolutionMinutes)}</td>
                            <td>
                              <SlaBadge complianceRate={a.slaComplianceRate} />
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
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bento-grid assignee-charts">
                    <div className="chart-card span-6">
                      <h3>SLA muvofiqligi reytingi</h3>
                      <ResponsiveContainer width="100%" height={Math.max(160, assigneeSlaChartData.length * 38)}>
                        <BarChart data={assigneeSlaChartData} layout="vertical" margin={{ left: 8, right: 40 }}>
                          <CartesianGrid horizontal={false} stroke="var(--border)" />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                            stroke="var(--text-tertiary)"
                            fontSize={12}
                          />
                          <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={12} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                          <Bar dataKey="value" name="SLA muvofiqligi" radius={[0, 6, 6, 0]} barSize={20}>
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
                      <h3>Ish yuki taqsimoti</h3>
                      <p className="chart-card-subtitle">Hozirgi ochiq tiketlar, o'rtacha chiziqqa nisbatan</p>
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(200, 40 + assigneeWorkloadChartData.length * 34)}
                      >
                        <BarChart data={assigneeWorkloadChartData} margin={{ top: 16, right: 16, left: -16, bottom: 8 }}>
                          <CartesianGrid vertical={false} stroke="var(--border)" />
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
                            fontSize={12}
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
                          <Bar dataKey="value" name="Ochiq tiketlar" radius={[6, 6, 0, 0]} barSize={26}>
                            {assigneeWorkloadChartData.map((entry) => (
                              <Cell key={entry.userId} fill={TIER_COLOR[getWorkloadTier(entry.value)]} />
                            ))}
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
                <h3>Tashkilotlar bo'yicha</h3>
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
                      <CartesianGrid horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={12} />
                      <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={12} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                      <Bar
                        dataKey="value"
                        name="Murojaatlar soni"
                        fill="url(#orgBarGradient)"
                        filter="url(#orgBarSoftShadow)"
                        radius={[0, 6, 6, 0]}
                        barSize={26}
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
                          <th>O'rtacha yopish vaqti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byOrganization.map((o) => (
                          <tr key={o.organizationId}>
                            <td className="cell-primary">{o.organizationName}</td>
                            <td>{o.ticketsCount}</td>
                            <td>{formatMinutes(o.avgResolutionMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      )}
    </AppShell>
  );
}
