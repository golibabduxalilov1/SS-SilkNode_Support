import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip, formatDayLabel } from '../../pages/Dashboard';
import { IconSearch } from '../icons';
import { EmptyState } from '../ui';

export interface AssigneeResolutionTrendEntry {
  userId: string;
  fullname: string | null;
  closedCount: number;
}

export interface AssigneeResolutionTrendPoint {
  date: string;
  byAssignee: AssigneeResolutionTrendEntry[];
}

interface PivotRow {
  date: string;
  [seriesKey: string]: number | string;
}

interface Series {
  key: string;
  name: string;
  color: string;
  muted?: boolean;
}

const TOP_ASSIGNEE_COLORS = ['var(--indigo-600)', 'var(--success)', 'var(--priority-high)', 'var(--info)', 'var(--warning)'];
const OTHERS_COLOR = 'var(--text-muted)';
const MAX_INDIVIDUAL_LINES = 5;

function computeTotals(data: AssigneeResolutionTrendPoint[]): Map<string, { fullname: string | null; total: number }> {
  const totals = new Map<string, { fullname: string | null; total: number }>();
  for (const point of data) {
    for (const entry of point.byAssignee) {
      const curr = totals.get(entry.userId);
      if (curr) {
        curr.total += entry.closedCount;
      } else {
        totals.set(entry.userId, { fullname: entry.fullname, total: entry.closedCount });
      }
    }
  }
  return totals;
}

function buildSingleAssigneeView(
  data: AssigneeResolutionTrendPoint[],
  selectedAssigneeId: string,
  selectedAssigneeName: string,
): { rows: PivotRow[]; series: Series[] } {
  const rows: PivotRow[] = data.map((point) => {
    let selected = 0;
    let others = 0;
    for (const entry of point.byAssignee) {
      if (entry.userId === selectedAssigneeId) selected += entry.closedCount;
      else others += entry.closedCount;
    }
    return { date: point.date, selected, others };
  });
  return {
    rows,
    series: [
      { key: 'selected', name: selectedAssigneeName, color: 'var(--indigo-600)' },
      { key: 'others', name: 'Boshqalar (jami)', color: OTHERS_COLOR, muted: true },
    ],
  };
}

function buildTopAssigneesView(data: AssigneeResolutionTrendPoint[]): { rows: PivotRow[]; series: Series[] } {
  const totals = computeTotals(data);
  const ranked = Array.from(totals.entries()).sort((a, b) => b[1].total - a[1].total);
  const top = ranked.slice(0, MAX_INDIVIDUAL_LINES);
  const rest = new Set(ranked.slice(MAX_INDIVIDUAL_LINES).map(([userId]) => userId));

  const series: Series[] = top.map(([userId, info], i) => ({
    key: userId,
    name: info.fullname ?? userId,
    color: TOP_ASSIGNEE_COLORS[i % TOP_ASSIGNEE_COLORS.length],
  }));
  if (rest.size > 0) {
    series.push({ key: 'others', name: 'Boshqalar', color: OTHERS_COLOR, muted: true });
  }

  const rows: PivotRow[] = data.map((point) => {
    const row: PivotRow = { date: point.date };
    for (const s of series) row[s.key] = 0;
    for (const entry of point.byAssignee) {
      if (rest.has(entry.userId)) {
        row.others = (Number(row.others) || 0) + entry.closedCount;
      } else if (entry.userId in row) {
        row[entry.userId] = (Number(row[entry.userId]) || 0) + entry.closedCount;
      }
    }
    return row;
  });

  return { rows, series };
}

export function AssigneeTrendChart({
  data,
  selectedAssigneeId,
  selectedAssigneeName,
}: {
  data: AssigneeResolutionTrendPoint[];
  selectedAssigneeId: string | null;
  selectedAssigneeName: string | null;
}) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const totals = useMemo(() => computeTotals(data), [data]);
  const hasAnyData = useMemo(() => Array.from(totals.values()).some((t) => t.total > 0), [totals]);
  const selectedHasData = selectedAssigneeId ? (totals.get(selectedAssigneeId)?.total ?? 0) > 0 : true;

  const { rows, series } = useMemo(() => {
    if (selectedAssigneeId && selectedAssigneeName) {
      return buildSingleAssigneeView(data, selectedAssigneeId, selectedAssigneeName);
    }
    return buildTopAssigneesView(data);
  }, [data, selectedAssigneeId, selectedAssigneeName]);

  if (!hasAnyData || !selectedHasData) {
    return (
      <EmptyState
        icon={<IconSearch width={22} height={22} />}
        title="Bu filtr bo'yicha ma'lumot yo'q"
        description={
          selectedAssigneeId
            ? "Tanlangan ijrochi shu davrda hech qanday murojaat yopmagan."
            : "Tanlangan davrda hech qanday murojaat yopilmagan."
        }
      />
    );
  }

  function toggleKey(key: string) {
    setHiddenKeys((curr) => {
      const next = new Set(curr);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
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
        <Legend
          onClick={(e) => typeof e.dataKey === 'string' && toggleKey(e.dataKey)}
          wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={s.muted ? 1.5 : 2.5}
            strokeDasharray={s.muted ? '4 3' : undefined}
            strokeOpacity={s.muted ? 0.65 : 1}
            dot={false}
            activeDot={{ r: 4 }}
            hide={hiddenKeys.has(s.key)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
