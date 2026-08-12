import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { IconCheck, IconClock, IconLayers, IconSpinner, IconTicketNew, IconWait } from '../components/icons';
import { Avatar, StatCardSkeleton, TableSkeleton } from '../components/ui';

interface AssigneeStats {
  userId: string;
  fullname: string | null;
  ticketsClosed: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  ticketsCount: number;
  avgResolutionMinutes: number | null;
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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      {label && <div className="chart-tooltip-label">{label}</div>}
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

function TimeGauge({
  icon,
  label,
  minutes,
  goodMax,
  warnMax,
}: {
  icon: React.ReactNode;
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

/** Asosiy TZ bo'lim 6 dagi Dashboard funksiyasi — faqat Web Admin Panel'da (bo'lim 5.3). Endi faqat tahliliy/vizual qism. */
export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard/stats')
      .then((res) => setStats(res.data.data))
      .finally(() => setIsLoading(false));
  }, []);

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

  const topAssignees = useMemo(() => {
    if (!stats) return [];
    return [...stats.byAssignee]
      .sort((a, b) => b.ticketsClosed - a.ticketsClosed)
      .slice(0, 5)
      .map((a) => ({ name: a.fullname ?? a.userId, value: a.ticketsClosed }))
      .reverse();
  }, [stats]);

  const topOrganizations = useMemo(() => {
    if (!stats) return [];
    return [...stats.byOrganization]
      .sort((a, b) => b.ticketsCount - a.ticketsCount)
      .slice(0, 5)
      .map((o) => ({ name: o.organizationName, value: o.ticketsCount }))
      .reverse();
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
      ) : (
        stats && (
          <>
            <div className="stat-cards">
              <div className="stat-card">
                <span
                  className="stat-card-icon"
                  style={{ ['--accent' as any]: 'var(--status-new)', ['--accent-soft' as any]: 'var(--status-new-soft)' }}
                >
                  <IconTicketNew width={17} height={17} />
                </span>
                <span className="stat-value">{stats.statusCounts.new}</span>
                <span className="stat-label">Yangi</span>
              </div>
              <div className="stat-card">
                <span
                  className="stat-card-icon"
                  style={{
                    ['--accent' as any]: 'var(--status-in_progress)',
                    ['--accent-soft' as any]: 'var(--status-in_progress-soft)',
                  }}
                >
                  <IconSpinner width={17} height={17} />
                </span>
                <span className="stat-value">{stats.statusCounts.in_progress}</span>
                <span className="stat-label">Ish jarayonida</span>
              </div>
              <div className="stat-card">
                <span
                  className="stat-card-icon"
                  style={{
                    ['--accent' as any]: 'var(--status-waiting_user)',
                    ['--accent-soft' as any]: 'var(--status-waiting_user-soft)',
                  }}
                >
                  <IconWait width={17} height={17} />
                </span>
                <span className="stat-value">{stats.statusCounts.waiting_user}</span>
                <span className="stat-label">Foydalanuvchi javobi kutilmoqda</span>
              </div>
              <div className="stat-card">
                <span
                  className="stat-card-icon"
                  style={{ ['--accent' as any]: 'var(--status-closed)', ['--accent-soft' as any]: 'var(--status-closed-soft)' }}
                >
                  <IconCheck width={17} height={17} />
                </span>
                <span className="stat-value">{stats.closedToday}</span>
                <span className="stat-label">Bugun yopilgan</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-icon">
                  <IconLayers width={17} height={17} />
                </span>
                <span className="stat-value">{stats.allOpen}</span>
                <span className="stat-label">Barcha ochiq</span>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="chart-card">
                <h3>Holat bo'yicha taqsimot</h3>
                <div className="donut-layout">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
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
                </div>
              </div>

              <div className="chart-card">
                <h3>Yopilgan murojaatlar dinamikasi</h3>
                <div className="closed-stats-grid">
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

            <div className="chart-card time-tracking">
              <h3>Time Tracking</h3>
              <p className="time-tracking-subtitle">SLA maqsadlariga nisbatan o'rtacha ko'rsatkichlar</p>
              <div className="radial-gauges">
                <TimeGauge
                  icon={<IconClock width={13} height={13} />}
                  label="O'rtacha birinchi javob vaqti"
                  minutes={stats.avgFirstResponseMinutes}
                  goodMax={30}
                  warnMax={120}
                />
                <TimeGauge
                  icon={<IconClock width={13} height={13} />}
                  label="O'rtacha yopish vaqti"
                  minutes={stats.avgResolutionMinutes}
                  goodMax={240}
                  warnMax={1440}
                />
              </div>
            </div>

            {stats.byAssignee.length > 0 && (
              <div className="section-card">
                <h3>Ijrochilar bo'yicha</h3>
                <div className="split-panel">
                  <ResponsiveContainer width="100%" height={Math.max(160, topAssignees.length * 42)}>
                    <BarChart data={topAssignees} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={12} />
                      <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={12} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                      <Bar dataKey="value" name="Yopgan murojaatlar" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="table-wrap">
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <th>F.I.Sh</th>
                          <th>Yopgan murojaatlar</th>
                          <th>O'rtacha javob vaqti</th>
                          <th>O'rtacha yopish vaqti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byAssignee.map((a) => (
                          <tr key={a.userId}>
                            <td>
                              <div className="cell-user">
                                <Avatar name={a.fullname} />
                                <span className="cell-primary">{a.fullname ?? a.userId}</span>
                              </div>
                            </td>
                            <td>{a.ticketsClosed}</td>
                            <td>{formatMinutes(a.avgFirstResponseMinutes)}</td>
                            <td>{formatMinutes(a.avgResolutionMinutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {stats.byOrganization.length > 0 && (
              <div className="section-card">
                <h3>Tashkilotlar bo'yicha</h3>
                <div className="split-panel">
                  <ResponsiveContainer width="100%" height={Math.max(160, topOrganizations.length * 42)}>
                    <BarChart data={topOrganizations} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} stroke="var(--text-tertiary)" fontSize={12} />
                      <YAxis type="category" dataKey="name" width={120} stroke="var(--text-tertiary)" fontSize={12} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-alt)' }} />
                      <Bar dataKey="value" name="Murojaatlar soni" fill="var(--status-resolved)" radius={[0, 4, 4, 0]} barSize={16} />
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
