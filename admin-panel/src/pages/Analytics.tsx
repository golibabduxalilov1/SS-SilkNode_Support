import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '../components/AppShell';
import {
  IconActivity,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconMoon,
  IconPercent,
  IconSort,
  IconSun,
  IconTrendDown,
  IconTrendUp,
  IconUsers,
  IconWallet,
} from '../components/icons';
import './analytics.css';

/* ---------------------------------------------------------------------- */
/* Namuna ma'lumotlar (so'nggi 6 oy) — 2026-mart .. 2026-avgust           */
/* ---------------------------------------------------------------------- */

const MONTHS = ['Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust'];

const REVENUE_TREND = [
  { month: 'Mart', thisYear: 82_400_000, lastYear: 61_200_000, orders: 1180 },
  { month: 'Aprel', thisYear: 91_800_000, lastYear: 68_900_000, orders: 1305 },
  { month: 'May', thisYear: 87_600_000, lastYear: 71_400_000, orders: 1247 },
  { month: 'Iyun', thisYear: 104_300_000, lastYear: 79_800_000, orders: 1489 },
  { month: 'Iyul', thisYear: 118_950_000, lastYear: 85_100_000, orders: 1622 },
  { month: 'Avgust', thisYear: 132_700_000, lastYear: 92_600_000, orders: 1781 },
];

const CATEGORY_SALES = [
  { name: 'Elektronika', value: 48_200_000 },
  { name: 'Kiyim-kechak', value: 36_750_000 },
  { name: 'Uy jihozlari', value: 27_400_000 },
  { name: 'Go‘zallik', value: 21_900_000 },
  { name: 'Sport', value: 15_600_000 },
  { name: 'Kitoblar', value: 9_300_000 },
];

const REVENUE_SOURCES = [
  { key: 'organic', name: 'Organik qidiruv', value: 38, color: 'var(--az-blue)' },
  { key: 'social', name: 'Ijtimoiy tarmoqlar', value: 26, color: 'var(--az-green)' },
  { key: 'direct', name: 'To‘g‘ridan-to‘g‘ri', value: 18, color: 'var(--az-yellow)' },
  { key: 'referral', name: 'Referral', value: 11, color: 'var(--az-violet)' },
  { key: 'ads', name: 'Reklama', value: 7, color: 'var(--az-red)' },
];

interface Transaction {
  id: string;
  customer: string;
  product: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
}

const TRANSACTIONS: Transaction[] = [
  { id: 'TX-10482', customer: 'Aziz Karimov', product: 'Wireless Earbuds Pro', date: '2026-08-11', amount: 640_000, status: 'paid' },
  { id: 'TX-10481', customer: 'Madina Yusupova', product: 'Smart Watch S3', date: '2026-08-11', amount: 1_250_000, status: 'paid' },
  { id: 'TX-10480', customer: 'Jasur Toshev', product: 'Yoga Mat Premium', date: '2026-08-10', amount: 180_000, status: 'pending' },
  { id: 'TX-10479', customer: 'Nilufar Rashidova', product: 'Cast Iron Skillet Set', date: '2026-08-10', amount: 420_000, status: 'paid' },
  { id: 'TX-10478', customer: 'Bekzod Aliyev', product: 'Running Shoes X2', date: '2026-08-09', amount: 890_000, status: 'failed' },
  { id: 'TX-10477', customer: 'Zarina Nazarova', product: 'Skincare Bundle', date: '2026-08-09', amount: 310_000, status: 'paid' },
  { id: 'TX-10476', customer: 'Sardor Ergashev', product: 'Bluetooth Speaker', date: '2026-08-08', amount: 275_000, status: 'paid' },
  { id: 'TX-10475', customer: 'Gulnora Islomova', product: 'Novel Collection (5 kitob)', date: '2026-08-08', amount: 150_000, status: 'pending' },
  { id: 'TX-10474', customer: 'Otabek Rahimov', product: '4K Monitor 27"', date: '2026-08-07', amount: 2_150_000, status: 'paid' },
  { id: 'TX-10473', customer: 'Dilnoza Saidova', product: 'Office Chair Ergo', date: '2026-08-06', amount: 980_000, status: 'paid' },
];

const RANGE_OPTIONS = [
  { key: 3, label: 'So‘nggi 3 oy' },
  { key: 6, label: 'So‘nggi 6 oy' },
];

const COLORS = ['var(--az-blue)', 'var(--az-green)', 'var(--az-yellow)', 'var(--az-violet)', 'var(--az-red)', '#0ea5e9'];

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} mlrd`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mln`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ming`;
  return String(n);
}

function formatUZS(n: number): string {
  return `${n.toLocaleString('en-US').replace(/,/g, ' ')} so'm`;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="az-tooltip">
      {label && <div className="az-tooltip-label">{label}</div>}
      {payload.map((entry: any, i: number) => (
        <div className="az-tooltip-row" key={i}>
          <span className="az-dot" style={{ background: entry.color ?? entry.payload?.fill }} />
          <span>{entry.name}</span>
          <strong>{formatter ? formatter(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ExportButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button type="button" className="az-export-btn" onClick={onClick} title={title} aria-label={title}>
      <IconDownload width={15} height={15} />
    </button>
  );
}

type SortDir = 'asc' | 'desc';

export function AnalyticsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [rangeMonths, setRangeMonths] = useState<number>(6);
  const [sortKey, setSortKey] = useState<keyof Transaction>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const trend = useMemo(() => REVENUE_TREND.slice(REVENUE_TREND.length - rangeMonths), [rangeMonths]);

  const totalRevenue = useMemo(() => trend.reduce((sum, d) => sum + d.thisYear, 0), [trend]);
  const prevRevenue = useMemo(() => trend.reduce((sum, d) => sum + d.lastYear, 0), [trend]);
  const revenueDelta = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const totalOrders = useMemo(() => trend.reduce((sum, d) => sum + d.orders, 0), [trend]);
  const activeUsers = 18_420;
  const conversionRate = 4.86;
  const growthRate = revenueDelta;

  const sortedTransactions = useMemo(() => {
    const copy = [...TRANSACTIONS];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [sortKey, sortDir]);

  function toggleSort(key: keyof Transaction) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <AppShell title="Analitika" breadcrumb="Umumiy ko'rinish">
      <div className="analytics-page" data-theme={theme}>
        <div className="az-wrap">
          <div className="az-header">
            <div>
              <h1>Analitika dashboard</h1>
              <p>Daromad, foydalanuvchilar va savdo ko'rsatkichlarining so'nggi holati va dinamikasi.</p>
            </div>
            <div className="az-header-actions">
              <button
                type="button"
                className="az-theme-toggle"
                onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              >
                {theme === 'light' ? <IconMoon width={15} height={15} /> : <IconSun width={15} height={15} />}
                {theme === 'light' ? 'Tungi rejim' : 'Kunduzgi rejim'}
              </button>
            </div>
          </div>

          <div className="az-filters">
            <span className="az-filters-label">
              <IconCalendar width={15} height={15} /> Davr:
            </span>
            <div className="az-range-group">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`az-range-btn${rangeMonths === opt.key ? ' is-active' : ''}`}
                  onClick={() => setRangeMonths(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="az-filters-meta">
              {trend[0]?.month} — {trend[trend.length - 1]?.month} 2026
            </span>
          </div>

          <div className="az-metrics">
            <div className="az-metric-card">
              <div className="az-metric-top">
                <span className="az-metric-icon" style={{ ['--accent' as any]: 'var(--az-blue)', ['--accent-soft' as any]: 'var(--az-blue-soft)' }}>
                  <IconWallet width={18} height={18} />
                </span>
                <span className={`az-metric-delta ${revenueDelta >= 0 ? 'up' : 'down'}`}>
                  {revenueDelta >= 0 ? <IconTrendUp width={13} height={13} /> : <IconTrendDown width={13} height={13} />}
                  {Math.abs(revenueDelta).toFixed(1)}%
                </span>
              </div>
              <span className="az-metric-value">{formatCompact(totalRevenue)} so'm</span>
              <span className="az-metric-label">Umumiy daromad</span>
            </div>

            <div className="az-metric-card">
              <div className="az-metric-top">
                <span className="az-metric-icon" style={{ ['--accent' as any]: 'var(--az-green)', ['--accent-soft' as any]: 'var(--az-green-soft)' }}>
                  <IconUsers width={18} height={18} />
                </span>
                <span className="az-metric-delta up">
                  <IconTrendUp width={13} height={13} /> 8.2%
                </span>
              </div>
              <span className="az-metric-value">{activeUsers.toLocaleString('en-US')}</span>
              <span className="az-metric-label">Faol foydalanuvchilar</span>
            </div>

            <div className="az-metric-card">
              <div className="az-metric-top">
                <span className="az-metric-icon" style={{ ['--accent' as any]: 'var(--az-yellow)', ['--accent-soft' as any]: 'var(--az-yellow-soft)' }}>
                  <IconPercent width={18} height={18} />
                </span>
                <span className="az-metric-delta up">
                  <IconTrendUp width={13} height={13} /> 1.4%
                </span>
              </div>
              <span className="az-metric-value">{conversionRate.toFixed(2)}%</span>
              <span className="az-metric-label">Konversiya darajasi</span>
            </div>

            <div className="az-metric-card">
              <div className="az-metric-top">
                <span className="az-metric-icon" style={{ ['--accent' as any]: 'var(--az-violet)', ['--accent-soft' as any]: 'var(--az-violet-soft)' }}>
                  <IconActivity width={18} height={18} />
                </span>
                <span className={`az-metric-delta ${growthRate >= 0 ? 'up' : 'down'}`}>
                  {growthRate >= 0 ? <IconTrendUp width={13} height={13} /> : <IconTrendDown width={13} height={13} />}
                  {Math.abs(growthRate).toFixed(1)}%
                </span>
              </div>
              <span className="az-metric-value">{totalOrders.toLocaleString('en-US')}</span>
              <span className="az-metric-label">O'sish sur'ati (buyurtmalar)</span>
            </div>
          </div>

          <div className="az-grid">
            <div className="az-card">
              <div className="az-card-head">
                <div>
                  <h3 className="az-card-title">Daromad dinamikasi</h3>
                  <p className="az-card-sub">Bu yil vs o'tgan yil, oylik</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="az-legend-inline">
                    <span><span className="az-dot" style={{ background: 'var(--az-blue)' }} /> Bu yil</span>
                    <span><span className="az-dot" style={{ background: 'var(--az-text-muted)' }} /> O'tgan yil</span>
                  </div>
                  <ExportButton
                    title="CSV eksport"
                    onClick={() =>
                      downloadCsv('daromad-dinamikasi.csv', [
                        ['Oy', 'Bu yil', 'Otgan yil'],
                        ...trend.map((d) => [d.month, d.thisYear, d.lastYear]),
                      ])
                    }
                  />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend} margin={{ left: 4, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} stroke="var(--az-border)" />
                  <XAxis dataKey="month" stroke="var(--az-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="var(--az-text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(v)}
                    width={54}
                  />
                  <Tooltip content={<ChartTooltip formatter={formatUZS} />} />
                  <Line type="monotone" dataKey="thisYear" name="Bu yil" stroke="var(--az-blue)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line
                    type="monotone"
                    dataKey="lastYear"
                    name="O'tgan yil"
                    stroke="var(--az-text-muted)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 2.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="az-card">
              <div className="az-card-head">
                <div>
                  <h3 className="az-card-title">Daromad manbalari</h3>
                  <p className="az-card-sub">Trafik kanallari bo'yicha ulush</p>
                </div>
                <ExportButton
                  title="CSV eksport"
                  onClick={() =>
                    downloadCsv('daromad-manbalari.csv', [
                      ['Manba', 'Ulush (%)'],
                      ...REVENUE_SOURCES.map((d) => [d.name, d.value]),
                    ])
                  }
                />
              </div>
              <div className="az-donut-layout">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={REVENUE_SOURCES}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="var(--az-surface)"
                      strokeWidth={2}
                    >
                      {REVENUE_SOURCES.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `${v}%`} />} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="az-donut-legend">
                  {REVENUE_SOURCES.map((entry) => (
                    <li key={entry.key}>
                      <span className="az-dot" style={{ background: entry.color }} />
                      <span className="name">{entry.name}</span>
                      <span className="pct">{entry.value}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="az-grid-2">
            <div className="az-card">
              <div className="az-card-head">
                <div>
                  <h3 className="az-card-title">Kategoriyalar bo'yicha sotuvlar</h3>
                  <p className="az-card-sub">Joriy oy, mahsulot toifalari kesimida</p>
                </div>
                <ExportButton
                  title="CSV eksport"
                  onClick={() =>
                    downloadCsv('kategoriyalar-sotuv.csv', [
                      ['Kategoriya', 'Summa'],
                      ...CATEGORY_SALES.map((d) => [d.name, d.value]),
                    ])
                  }
                />
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={CATEGORY_SALES} margin={{ left: 4, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} stroke="var(--az-border)" />
                  <XAxis dataKey="name" stroke="var(--az-text-muted)" fontSize={11.5} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis stroke="var(--az-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} width={54} />
                  <Tooltip content={<ChartTooltip formatter={formatUZS} />} cursor={{ fill: 'var(--az-surface-alt)' }} />
                  <Bar dataKey="value" name="Sotuv" radius={[6, 6, 0, 0]} barSize={34}>
                    {CATEGORY_SALES.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="az-card">
              <div className="az-card-head">
                <div>
                  <h3 className="az-card-title">Buyurtmalar hajmi</h3>
                  <p className="az-card-sub">Oylik buyurtmalar soni va trend</p>
                </div>
                <ExportButton
                  title="CSV eksport"
                  onClick={() =>
                    downloadCsv('buyurtmalar-hajmi.csv', [
                      ['Oy', 'Buyurtmalar'],
                      ...trend.map((d) => [d.month, d.orders]),
                    ])
                  }
                />
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ left: 4, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="azOrdersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--az-green)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--az-green)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--az-border)" />
                  <XAxis dataKey="month" stroke="var(--az-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--az-text-muted)" fontSize={12} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="orders" name="Buyurtmalar" stroke="var(--az-green)" strokeWidth={2.5} fill="url(#azOrdersFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="az-table-card">
            <div className="az-card-head">
              <div>
                <h3 className="az-card-title">So'nggi tranzaksiyalar</h3>
                <p className="az-card-sub">Ustun sarlavhasini bosib saralang</p>
              </div>
              <ExportButton
                title="CSV eksport"
                onClick={() =>
                  downloadCsv('tranzaksiyalar.csv', [
                    ['ID', 'Mijoz', 'Mahsulot', 'Sana', 'Summa', 'Holat'],
                    ...sortedTransactions.map((t) => [t.id, t.customer, t.product, t.date, t.amount, t.status]),
                  ])
                }
              />
            </div>
            <div className="az-table-wrap">
              <table className="az-table">
                <thead>
                  <tr>
                    {(
                      [
                        ['id', 'ID'],
                        ['customer', 'Mijoz'],
                        ['product', 'Mahsulot'],
                        ['date', 'Sana'],
                        ['amount', 'Summa'],
                        ['status', 'Holat'],
                      ] as [keyof Transaction, string][]
                    ).map(([key, label]) => (
                      <th key={key} onClick={() => toggleSort(key)}>
                        <span className="th-inner">
                          {label}
                          {sortKey === key ? (
                            sortDir === 'asc' ? (
                              <IconChevronUp width={12} height={12} style={{ color: 'var(--az-blue)' }} />
                            ) : (
                              <IconChevronDown width={12} height={12} style={{ color: 'var(--az-blue)' }} />
                            )
                          ) : (
                            <IconSort width={12} height={12} />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((t) => (
                    <tr key={t.id}>
                      <td className="az-cell-primary">{t.id}</td>
                      <td>{t.customer}</td>
                      <td>{t.product}</td>
                      <td>{t.date}</td>
                      <td>{formatUZS(t.amount)}</td>
                      <td>
                        <span className={`az-status-pill ${t.status}`}>
                          {t.status === 'paid' ? "To'langan" : t.status === 'pending' ? 'Kutilmoqda' : 'Xato'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
