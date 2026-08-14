import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip, formatDayLabel } from '../../pages/Dashboard';

export interface ResolutionFlowPoint {
  date: string;
  opened: number;
  resolved: number;
}

export function ResolutionFlowChart({ data }: { data: ResolutionFlowPoint[] }) {
  const totalOpened = data.reduce((sum, p) => sum + p.opened, 0);
  const totalResolved = data.reduce((sum, p) => sum + p.resolved, 0);
  const hasData = totalOpened > 0 || totalResolved > 0;

  if (!hasData) {
    return <p className="chart-empty-note">Hozircha maʼlumot yoʻq — murojaatlar kelib tushishi bilan grafik to'ladi.</p>;
  }

  return (
    <>
      <ul className="chart-legend chart-legend--inline">
        <li className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: 'var(--primary)' }} />
          <span className="chart-legend-name">Ochilgan</span>
        </li>
        <li className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: 'var(--success)' }} />
          <span className="chart-legend-name">Hal qilingan</span>
        </li>
      </ul>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
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
          <Tooltip content={<ChartTooltip labelFormatter={formatDayLabel} />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="opened"
            name="Ochilgan"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="resolved"
            name="Hal qilingan"
            stroke="var(--success)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="chart-summary-note">
        Oxirgi {data.length} kunda: <strong>{totalOpened}</strong> ta ochildi, <strong>{totalResolved}</strong> ta hal qilindi
      </p>
    </>
  );
}
