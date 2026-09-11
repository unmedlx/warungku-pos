import { useState } from 'react';
import type { Comparison, CompareRow } from '@/lib/types';
import { formatNumber, formatPercent, formatRp, formatRpShort } from '@/lib/format';
import { Bar, Card, DeltaBadge, Skeleton } from './Common';
import { cn } from '@/lib/cn';

type SortKey = keyof Pick<
  CompareRow,
  'revenue' | 'transactions' | 'avgTicket' | 'netProfit' | 'margin' | 'contribution'
>;

const COLUMNS: { key: SortKey | 'name'; label: string }[] = [
  { key: 'name', label: 'Toko' },
  { key: 'revenue', label: 'Omzet' },
  { key: 'contribution', label: 'Kontribusi' },
  { key: 'transactions', label: 'Transaksi' },
  { key: 'avgTicket', label: 'Rata-rata nota' },
  { key: 'netProfit', label: 'Laba bersih' },
  { key: 'margin', label: 'Margin' },
];

/** 1.2 — perbandingan antar cabang. Kolom bisa diklik untuk mengurutkan. */
export function ComparisonSection({ data, loading }: { data: Comparison | null; loading: boolean }) {
  const [sort, setSort] = useState<SortKey>('revenue');

  if (loading || !data) return <Skeleton className="h-[260px]" />;
  if (!data.rows.length) return null;

  const rows = [...data.rows].sort((a, b) => b[sort] - a[sort]);
  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);
  const totals = data.totals.current;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="tabel min-w-[900px]">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.key !== 'name' && setSort(c.key as SortKey)}
                  aria-sort={sort === c.key ? 'descending' : undefined}
                  className={cn(
                    c.key !== 'name' && 'cursor-pointer text-right hover:text-foreground',
                    sort === c.key && 'text-foreground',
                  )}
                >
                  {c.label}
                  {sort === c.key && <span aria-hidden="true"> ↓</span>}
                </th>
              ))}
              <th className="text-right">vs periode lalu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="font-medium">
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'grid h-[22px] w-[22px] flex-none place-items-center rounded-md text-xs font-medium',
                        i === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                    {r.name}
                  </span>
                </td>
                <Cell title={formatRp(r.revenue)}>{formatRpShort(r.revenue)}</Cell>
                <td className="text-right tabular-nums">
                  <Bar
                    percent={(r.revenue / maxRevenue) * 100}
                    className="mr-2 inline-block w-[46px] align-middle"
                  />
                  {formatPercent(r.contribution)}
                </td>
                <Cell>{formatNumber(r.transactions)}</Cell>
                <Cell title={formatRp(r.avgTicket)}>{formatRpShort(r.avgTicket)}</Cell>
                <Cell title={formatRp(r.netProfit)}>{formatRpShort(r.netProfit)}</Cell>
                <Cell>{formatPercent(r.margin)}</Cell>
                <td className="text-right">
                  <DeltaBadge value={r.deltaRevenue} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <Cell title={formatRp(totals.revenue)}>{formatRpShort(totals.revenue)}</Cell>
              <Cell>100%</Cell>
              <Cell>{formatNumber(totals.transactions)}</Cell>
              <Cell title={formatRp(totals.avgTicket)}>{formatRpShort(totals.avgTicket)}</Cell>
              <Cell title={formatRp(totals.netProfit)}>{formatRpShort(totals.netProfit)}</Cell>
              <Cell>{formatPercent(totals.margin)}</Cell>
              <td className="text-right">
                <DeltaBadge value={data.totals.delta.revenue} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function Cell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <td title={title} className="text-right tabular-nums">
      {children}
    </td>
  );
}
