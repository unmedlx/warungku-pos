import { useMemo, useState } from 'react';
import type { Trend, TrendPoint } from '@/lib/types';
import { formatMonthLabel, formatNumber, formatRp, formatRpShort } from '@/lib/format';
import { Card, Skeleton } from './Common';
import { cn } from '@/lib/cn';

type Metric = 'revenue' | 'netProfit' | 'transactions';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'revenue', label: 'Omzet' },
  { id: 'netProfit', label: 'Laba' },
  { id: 'transactions', label: 'Transaksi' },
];

const W = 1000;
const H = 240;
const PAD_X = 40;
const TOP = 20;
const BOTTOM = 205;

/**
 * 1.3 — tren jangka panjang dengan pembanding periode yang sama tahun lalu.
 * Inilah bagian yang secara teknis tidak bisa disediakan aplikasi kasir lokal:
 * IndexedDB di HP tidak menyimpan riwayat sepanjang ini dan hilang saat ganti HP.
 *
 * Warna garis diambil dari token lewat kelas Tailwind (`stroke-chart-1`), bukan
 * atribut `stroke="#..."`, supaya grafiknya ikut berubah di mode gelap.
 */
export function TrendSection({ data, loading }: { data: Trend | null; loading: boolean }) {
  const [metric, setMetric] = useState<Metric>('revenue');
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (!data?.months.length) return null;
    const values = [...data.months, ...data.previousYear].map((p) => p[metric]);
    const max = Math.max(...values, 1);
    const step = data.months.length > 1 ? (W - PAD_X * 2) / (data.months.length - 1) : 0;
    const y = (v: number) => BOTTOM - (v / max) * (BOTTOM - TOP);
    const pts = (arr: TrendPoint[]) => arr.map((p, i) => `${PAD_X + i * step},${y(p[metric])}`);
    return { step, max, current: pts(data.months), previous: pts(data.previousYear) };
  }, [data, metric]);

  if (loading || !data) return <Skeleton className="h-[320px]" />;
  if (!geom || !data.months.length) return null;

  const fmt = (v: number) => (metric === 'transactions' ? formatNumber(v) : formatRpShort(v));
  const fmtFull = (v: number) => (metric === 'transactions' ? formatNumber(v) : formatRp(v));

  const last = data.months[data.months.length - 1];
  const lastPrev = data.previousYear[data.previousYear.length - 1];
  const yoy =
    lastPrev && lastPrev[metric]
      ? ((last[metric] - lastPrev[metric]) / Math.abs(lastPrev[metric])) * 100
      : null;

  const point = hover !== null ? data.months[hover] : null;
  const prevPoint = hover !== null ? data.previousYear[hover] : null;

  return (
    <Card className="p-4">
      <div className="mb-4 flex justify-end">
        <div className="seg">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              aria-pressed={metric === m.id}
              className={cn('seg-item', metric === m.id && 'seg-item-on')}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          className="w-full"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Grafik tren bulanan dibanding tahun lalu"
          onMouseLeave={() => setHover(null)}
        >
          <g className="stroke-border" strokeWidth={1}>
            {[TOP, 70, 120, 170, BOTTOM].map((y) => (
              <line key={y} x1={0} y1={y} x2={W} y2={y} strokeDasharray="2 4" />
            ))}
          </g>

          <polyline
            className="fill-none stroke-chart-4"
            strokeWidth={2}
            strokeDasharray="5 5"
            points={geom.previous.join(' ')}
          />
          <polygon
            className="fill-chart-1/[0.08]"
            points={`${geom.current.join(' ')} ${W - PAD_X},${BOTTOM} ${PAD_X},${BOTTOM}`}
          />
          <polyline
            className="fill-none stroke-chart-1"
            strokeWidth={2.5}
            strokeLinejoin="round"
            points={geom.current.join(' ')}
          />

          {data.months.map((p, i) => {
            const [x, y] = geom.current[i].split(',').map(Number);
            return (
              <g key={p.month}>
                <circle
                  cx={x}
                  cy={y}
                  r={hover === i ? 5 : 0}
                  className="fill-chart-1 stroke-card"
                  strokeWidth={2.5}
                />
                <rect
                  x={x - geom.step / 2}
                  y={0}
                  width={Math.max(geom.step, 10)}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
                <text
                  x={x}
                  y={228}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-muted-foreground"
                >
                  {formatMonthLabel(p.month)}
                </text>
              </g>
            );
          })}
        </svg>

        {point && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
            <div className="font-medium">{formatMonthLabel(point.month)}</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums">{fmtFull(point[metric])}</div>
            {prevPoint && (
              <div className="mt-0.5 tabular-nums text-muted-foreground">
                tahun lalu: {fmt(prevPoint[metric])}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>
          <i className="mr-1.5 inline-block h-[9px] w-[9px] rounded-xs bg-chart-1 align-middle" />
          {data.months.length} bulan terakhir
        </span>
        <span>
          <i className="mr-1.5 inline-block h-[9px] w-[9px] rounded-xs bg-chart-4 align-middle" />
          periode sama tahun lalu
        </span>
        <span className="ml-auto font-medium text-foreground tabular-nums">
          {formatMonthLabel(last.month)} berjalan: {fmt(last[metric])}
          {yoy !== null && ` · ${yoy >= 0 ? '+' : ''}${yoy.toFixed(0)}% YoY`}
        </span>
      </div>
    </Card>
  );
}
