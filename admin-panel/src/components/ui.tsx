import { ReactNode, useEffect, useState } from 'react';
import { IconClose, IconFilter } from './icons';
import { useLanguage } from '../i18n/LanguageContext';

const CATEGORY_CLUSTER_ORDER = ['yonalish', 'mahsulot'];

export function CategoryOptionGroups({
  categories,
}: {
  categories: { id: string; name: string; cluster?: string }[];
}) {
  const { t } = useLanguage();
  const CATEGORY_CLUSTER_LABELS: Record<string, string> = {
    yonalish: t('ui.clusterDirection'),
    mahsulot: t('ui.clusterProduct'),
  };
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
  const { t } = useLanguage();
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
          {t('ui.rangeTemplate')
            .replace('{start}', String(rangeStart))
            .replace('{end}', String(rangeEnd))
            .replace('{total}', String(totalItems))}
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
            {t('ui.prev')}
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
            {t('ui.next')}
          </button>
        </>
      )}
      {onPageSizeChange && pageSize !== undefined && (
        <label className="pagination-page-size">
          {t('ui.perPage')}
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

/**
 * T19 — mobilda (<768px) filtrlarni "Filtrlar (N)" tugmasi ortidagi pastki shtorkaga yig'adi.
 * `children` bitta marta render qilinadi — CSS uni desktopda oddiy oqimda, mobilda esa
 * (ochiq bo'lganda) fixed bottom-sheet sifatida ko'rsatadi, shu bilan filtr state'i ikkilanmaydi.
 */
export function MobileFilterDrawer({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('mobile-filter-drawer-lock');
    return () => document.body.classList.remove('mobile-filter-drawer-lock');
  }, [isOpen]);

  return (
    <>
      <button type="button" className="mobile-filter-toggle" onClick={() => setIsOpen(true)}>
        <IconFilter width={14} height={14} />
        {t('ui.filters')}
        {activeCount > 0 ? ` (${activeCount})` : ''}
      </button>
      {isOpen && <div className="mobile-filter-backdrop" onClick={() => setIsOpen(false)} />}
      <div className={`mobile-filter-drawer${isOpen ? ' mobile-filter-drawer--open' : ''}`}>
        <div className="mobile-filter-drawer-head">
          <span>{t('ui.filters')}</span>
          <button
            type="button"
            className="mobile-filter-drawer-close"
            aria-label={t('ui.closeFilters')}
            onClick={() => setIsOpen(false)}
          >
            <IconClose width={16} height={16} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
