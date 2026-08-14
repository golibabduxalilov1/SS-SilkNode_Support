import { useMemo } from 'react';
import { formatDayLabel } from '../../pages/Dashboard';
import { EmptyState } from '../ui';
import { IconSearch } from '../icons';

export interface WorkloadHeatmapEntry {
  userId: string;
  fullname: string | null;
  count: number;
}

export interface WorkloadHeatmapPoint {
  date: string;
  byAssignee: WorkloadHeatmapEntry[];
}

interface AssigneeOption {
  userId: string;
  fullname: string | null;
}

const INTENSITY_TIERS = 4;

function intensityTier(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(INTENSITY_TIERS, Math.max(1, Math.ceil((count / max) * INTENSITY_TIERS)));
}

export function WorkloadHeatmap({ data, assignees }: { data: WorkloadHeatmapPoint[]; assignees: AssigneeOption[] }) {
  const { rows, max } = useMemo(() => {
    const countsByAssignee = new Map<string, number[]>();
    for (const a of assignees) countsByAssignee.set(a.userId, new Array(data.length).fill(0));

    data.forEach((point, dayIndex) => {
      for (const entry of point.byAssignee) {
        const series = countsByAssignee.get(entry.userId);
        if (series) series[dayIndex] = entry.count;
      }
    });

    let maxCount = 0;
    for (const series of countsByAssignee.values()) {
      for (const v of series) if (v > maxCount) maxCount = v;
    }

    const builtRows = assignees
      .map((a) => ({
        userId: a.userId,
        name: a.fullname ?? a.userId,
        counts: countsByAssignee.get(a.userId) ?? [],
        total: (countsByAssignee.get(a.userId) ?? []).reduce((sum, v) => sum + v, 0),
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);

    return { rows: builtRows, max: maxCount };
  }, [data, assignees]);

  if (rows.length === 0 || data.length === 0) {
    return (
      <EmptyState
        icon={<IconSearch width={22} height={22} />}
        title="Bu davrda yuklama ma'lumoti yo'q"
        description="Tanlangan davrda hech kimga murojaat tayinlanmagan."
      />
    );
  }

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-grid">
        <div className="heatmap-row heatmap-row--header">
          <div className="heatmap-label" />
          {data.map((point) => (
            <div key={point.date} className="heatmap-cell heatmap-cell--header" title={formatDayLabel(point.date)}>
              {formatDayLabel(point.date)}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.userId} className="heatmap-row">
            <div className="heatmap-label" title={row.name}>
              {row.name}
            </div>
            {row.counts.map((count, i) => (
              <div
                key={data[i].date}
                className={`heatmap-cell heatmap-cell--tier${intensityTier(count, max)}`}
                title={`${row.name} · ${formatDayLabel(data[i].date)}: ${count} ta`}
              >
                {count > 0 ? count : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Kam</span>
        {Array.from({ length: INTENSITY_TIERS + 1 }).map((_, i) => (
          <span key={i} className={`heatmap-cell heatmap-cell--tier${i} heatmap-legend-swatch`} />
        ))}
        <span>Ko'p</span>
      </div>
    </div>
  );
}
