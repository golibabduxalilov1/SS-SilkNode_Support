import { ReactNode } from 'react';

/** T16 — kategoriya select'larida ikki klaster ("Yo'nalish" / "Mahsulot/tizim") bo'yicha optgroup. */
const CATEGORY_CLUSTER_LABELS: Record<string, string> = {
  yonalish: "Yo'nalish",
  mahsulot: 'Mahsulot/tizim',
};
const CATEGORY_CLUSTER_ORDER = ['yonalish', 'mahsulot'];

export function CategoryOptionGroups({
  categories,
}: {
  categories: { id: string; name: string; cluster?: string }[];
}) {
  return (
    <>
      {CATEGORY_CLUSTER_ORDER.map((cluster) => {
        const items = categories.filter((c) => (c.cluster ?? 'mahsulot') === cluster);
        if (items.length === 0) return null;
        return (
          <optgroup key={cluster} label={CATEGORY_CLUSTER_LABELS[cluster]}>
            {items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  /** T17 — filtr natijasi bo'sh bo'lganda "Filterlarni tozalash" kabi amal tugmasi. */
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-description">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-secondary btn-sm empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
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

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <div className="skeleton skeleton-chart" style={{ height }} />;
}

export function Pagination({
  page,
  totalPages,
  onChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [15, 30, 50],
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** T10 — "1–15 / 37 ta" diapazon matni va sahifa hajmi tanlovi uchun (ixtiyoriy — berilmasa avvalgidek). */
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  const showRange = totalItems !== undefined && pageSize !== undefined && totalItems > 0;
  if (totalPages <= 1 && !showRange) return null;

  const rangeStart = showRange ? (page - 1) * (pageSize as number) + 1 : null;
  const rangeEnd = showRange ? Math.min(page * (pageSize as number), totalItems as number) : null;

  const pages: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p += 1) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="pagination">
      {showRange && (
        <span className="pagination-range">
          {rangeStart}–{rangeEnd} / {totalItems} ta
        </span>
      )}
      {totalPages > 1 && (
        <>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            Oldingi
          </button>
          <div className="pagination-pages">
            {pages.map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="pagination-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`pagination-page${p === page ? ' pagination-page--active' : ''}`}
                  onClick={() => onChange(p)}
                >
                  {p}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
          >
            Keyingi
          </button>
        </>
      )}
      {onPageSizeChange && pageSize !== undefined && (
        <label className="pagination-page-size">
          Sahifada
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
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
