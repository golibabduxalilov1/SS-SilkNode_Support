import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDayLabel } from '../../pages/Dashboard';

export interface DailyTrendPoint {
  date: string;
  created: number;
  closed: number;
  open: number;
}

type Granularity = 'day' | 'week' | 'month';

const GRANULARITY_OPTIONS: Array<{ key: Granularity; label: string }> = [
  { key: 'day', label: 'Kunlik' },
  { key: 'week', label: 'Haftalik' },
  { key: 'month', label: 'Oylik' },
];

// dailyTrend'dagi "YYYY-MM-DD" satrini mahalliy vaqt zonasida Date'ga aylantiradi
// (new Date(str) UTC deb talqin qilib, kun chegaralarini bir kun surib yuborishi mumkin).
function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isoDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function weekBucketKey(date: Date): string {
  const day = date.getDay();
  const diff = (day + 6) % 7; // dushanba boshlanadi
  const monday = new Date(date);
  monday.setDate(monday.getDate() - diff);
  return isoDateKey(monday);
}

function monthBucketKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatWeekLabel(dateStr: string): string {
  return `${formatDayLabel(dateStr)} h.`;
}

function formatMonthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function aggregateTrend(data: DailyTrendPoint[], granularity: Granularity): DailyTrendPoint[] {
  if (granularity === 'day') return data;
  const bucketKeyFn = granularity === 'week' ? weekBucketKey : monthBucketKey;
  const buckets = new Map<string, DailyTrendPoint>();
  const order: string[] = [];

  for (const point of data) {
    const key = bucketKeyFn(parseDateKey(point.date));
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { date: key, created: 0, closed: 0, open: 0 };
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.created += point.created;
    bucket.closed += point.closed;
    // "open" kumulyativ qoldiq — bucket ichidagi so'nggi kun holati bucket yakuniy holatini bildiradi.
    bucket.open = point.open;
  }

  return order.map((key) => buckets.get(key)!);
}

function trendLabelFormatter(granularity: Granularity): (dateStr: string) => string {
  if (granularity === 'week') return formatWeekLabel;
  if (granularity === 'month') return formatMonthLabel;
  return formatDayLabel;
}

interface TooltipPayloadEntry {
  color?: string;
  dataKey?: string;
  name?: string;
  value?: number;
  payload: DailyTrendPoint;
}

function TrendTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  labelFormatter: (dateStr: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const throughput = point.created > 0 ? `${Math.round((point.closed / point.created) * 100)}%` : '—';
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{labelFormatter(label ?? '')}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-swatch" style={{ background: 'var(--primary)' }} />
        <span>Yasalgan</span>
        <strong>{point.created}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-swatch" style={{ background: 'var(--success)' }} />
        <span>Yopilgan</span>
        <strong>{point.closed}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-swatch" style={{ background: 'var(--priority-high)' }} />
        <span>Ochiq (kumulyativ)</span>
        <strong>{point.open > 0 ? `+${point.open}` : point.open}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-swatch" style={{ background: 'transparent' }} />
        <span>Throughput</span>
        <strong>{throughput}</strong>
      </div>
    </div>
  );
}

export function TrendChart({ data, periodLabel }: { data: DailyTrendPoint[]; periodLabel: string }) {
  const [granularity, setGranularity] = useState<Granularity>('day');
  const chartData = useMemo(() => aggregateTrend(data, granularity), [data, granularity]);
  const labelFormatter = trendLabelFormatter(granularity);

  const totalCreated = chartData.reduce((sum, p) => sum + p.created, 0);
  const totalClosed = chartData.reduce((sum, p) => sum + p.closed, 0);
  const hasData = totalCreated > 0 || totalClosed > 0;
  const throughput = totalCreated > 0 ? `${Math.round((totalClosed / totalCreated) * 100)}%` : '—';

  return (
    <>
      <div className="trend-chart-toolbar">
        <ul className="chart-legend chart-legend--inline">
          <li className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: 'var(--primary)' }} />
            <span className="chart-legend-name">Yasalgan</span>
          </li>
          <li className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: 'var(--success)' }} />
            <span className="chart-legend-name">Yopilgan</span>
          </li>
          <li className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: 'var(--priority-high)' }} />
            <span className="chart-legend-name">Ochiq qolganlar (kumulyativ)</span>
          </li>
        </ul>
        <div className="segmented-control" role="group" aria-label="Davr kesimi">
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`segmented-control-btn${granularity === opt.key ? ' is-active' : ''}`}
              onClick={() => setGranularity(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
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
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis
            dataKey="date"
            tickFormatter={labelFormatter}
            stroke="var(--text-tertiary)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={<TrendTooltip labelFormatter={labelFormatter} />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="created"
            name="Yasalgan"
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
          <Line
            type="monotone"
            dataKey="open"
            name="Ochiq qolganlar"
            stroke="var(--priority-high)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {hasData ? (
        <p className="chart-summary-note">
          {periodLabel}: <strong>{totalCreated}</strong> ta yasaldi, <strong>{totalClosed}</strong> ta yopildi,
          throughput: <strong>{throughput}</strong>
        </p>
      ) : (
        <p className="chart-empty-note">Hozircha maʼlumot yoʻq — murojaatlar kelib tushishi bilan grafik to'ladi.</p>
      )}
    </>
  );
}
