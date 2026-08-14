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
import { ChartTooltip, formatDayLabel } from '../../pages/Dashboard';

export interface DailyTrendPoint {
  date: string;
  created: number;
  closed: number;
  open: number;
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
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const throughput = point.created > 0 ? `${Math.round((point.closed / point.created) * 100)}%` : '—';
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{formatDayLabel(label ?? '')}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-swatch" style={{ background: 'var(--primary)' }} />
        <span>Yaratilgan</span>
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
        <span>Kunlik throughput</span>
        <strong>{throughput}</strong>
      </div>
    </div>
  );
}

export function TrendChart({ data, periodLabel }: { data: DailyTrendPoint[]; periodLabel: string }) {
  const totalCreated = data.reduce((sum, p) => sum + p.created, 0);
  const totalClosed = data.reduce((sum, p) => sum + p.closed, 0);
  const hasData = totalCreated > 0 || totalClosed > 0;
  const throughput = totalCreated > 0 ? `${Math.round((totalClosed / totalCreated) * 100)}%` : '—';

  return (
    <>
      <ul className="chart-legend chart-legend--inline">
        <li className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: 'var(--primary)' }} />
          <span className="chart-legend-name">Yaratilgan</span>
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
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
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
            tickFormatter={formatDayLabel}
            stroke="var(--text-tertiary)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
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
          {periodLabel}: <strong>{totalCreated}</strong> ta yaratildi, <strong>{totalClosed}</strong> ta yopildi,
          throughput: <strong>{throughput}</strong>
        </p>
      ) : (
        <p className="chart-empty-note">Hozircha maʼlumot yoʻq — murojaatlar kelib tushishi bilan grafik to'ladi.</p>
      )}
    </>
  );
}
