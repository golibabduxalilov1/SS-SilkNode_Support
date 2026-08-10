import { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-description">{description}</p>}
    </div>
  );
}

export function Avatar({ name, size = 'sm' }: { name: string | null | undefined; size?: 'sm' | 'md' }) {
  const letters = (name ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
  return <span className={`avatar avatar--${size}`}>{letters.join('') || '?'}</span>;
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card stat-card--skeleton">
      <div className="skeleton skeleton-icon" />
      <div className="skeleton skeleton-line" style={{ width: '60%', height: 28 }} />
      <div className="skeleton skeleton-line" style={{ width: '80%' }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-skeleton">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="table-skeleton-row" key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <div className="skeleton skeleton-line" key={c} />
          ))}
        </div>
      ))}
    </div>
  );
}
