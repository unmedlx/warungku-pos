import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, LineChart, Wallet, CreditCard, Smartphone, QrCode, Banknote } from '@/components/icons';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { SegmentedBarChart } from '@/components/jokoui/segmented-bar-chart';
import { OverviewRow } from '@/components/jokoui/overview-row';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '@/components/jokoui/card';

const LOCALES: Record<string, Locale> = { id, en: enUS, ms };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

/** Icon + circle tone per payment-method category (mirrors the coloured logos in the SVG). */
const CATEGORY_STYLE: Record<string, { icon: typeof Wallet; className: string }> = {
  tunai: { icon: Banknote, className: 'bg-success/10 text-success-text' },
  cash: { icon: Banknote, className: 'bg-success/10 text-success-text' },
  transfer: { icon: CreditCard, className: 'bg-primary/10 text-primary' },
  'e-wallet': { icon: Smartphone, className: 'bg-info/10 text-info-text' },
  ewallet: { icon: Smartphone, className: 'bg-info/10 text-info-text' },
  qris: { icon: QrCode, className: 'bg-warning/10 text-warning-text' },
};

interface TransactionOverviewProps {
  /** Months shown in the chart (design shows 6). */
  months?: number;
  className?: string;
}

export default function TransactionOverview({ months = 6, className }: TransactionOverviewProps) {
  const { t, i18n } = useTranslation('reports');
  const dateLocale = LOCALES[i18n.language] ?? id;
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const [mode, setMode] = useState<'bar' | 'line'>('bar');

  const rangeStart = useMemo(() => startOfMonth(subMonths(new Date(), months - 1)), [months]);
  const rangeEnd = useMemo(() => endOfMonth(new Date()), []);

  const transactions = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(rangeStart, rangeEnd, true, true)
        .filter((tx) => tx.status !== 'open')
        .toArray(),
    [rangeStart.getTime(), rangeEnd.getTime()],
  );
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());

  const buckets = useMemo(() => {
    // one bucket per month, oldest first
    return Array.from({ length: months }, (_, i) => {
      const monthDate = subMonths(new Date(), months - 1 - i);
      return {
        key: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'LLL', { locale: dateLocale }),
        value: 0,
      };
    });
  }, [months, dateLocale]);

  const { chartData, rows, hasData } = useMemo(() => {
    const monthly = buckets.map((b) => ({ ...b }));
    const byKey = new Map(monthly.map((b, i) => [b.key, i]));

    const latestKey = monthly[monthly.length - 1]?.key;
    const prevKey = monthly[monthly.length - 2]?.key;

    const perMethod = new Map<number, { total: number; latest: number; prev: number }>();

    for (const tx of transactions ?? []) {
      const key = format(new Date(tx.date), 'yyyy-MM');
      const idx = byKey.get(key);
      if (idx != null) monthly[idx].value += tx.total;

      const mId = tx.paymentMethodId ?? 0;
      const entry = perMethod.get(mId) ?? { total: 0, latest: 0, prev: 0 };
      entry.total += tx.total;
      if (key === latestKey) entry.latest += tx.total;
      if (key === prevKey) entry.prev += tx.total;
      perMethod.set(mId, entry);
    }

    const grandTotal = [...perMethod.values()].reduce((s, e) => s + e.total, 0);

    const list = [...perMethod.entries()]
      .map(([methodId, e]) => {
        const method = paymentMethods?.find((p) => p.id === methodId);
        const category = (method?.category ?? '').toLowerCase();
        const style = CATEGORY_STYLE[category] ?? { icon: Wallet, className: 'bg-primary/10 text-primary' };
        // delta = bulan terakhir vs bulan sebelumnya; null kalau belum ada pembanding
        const delta = e.prev > 0 ? ((e.latest - e.prev) / e.prev) * 100 : null;
        return {
          id: methodId,
          name: method?.name ?? t('fallbacks.noMethod'),
          amount: e.total,
          share: grandTotal > 0 ? (e.total / grandTotal) * 100 : 0,
          delta,
          ...style,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      chartData: monthly,
      rows: list,
      hasData: monthly.some((m) => m.value > 0),
    };
  }, [transactions, paymentMethods, buckets, t]);

  const compact = (n: number) =>
    new Intl.NumberFormat(numberLocale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  const rp = (n: number) => `Rp ${n.toLocaleString(numberLocale)}`;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="grid-cols-[1fr_auto] pb-2">
        <CardTitle className="text-sm">{t('overview.title', { defaultValue: 'Ringkasan Transaksi' })}</CardTitle>
        <CardDescription className="text-xs">{t('overview.subtitle', { defaultValue: 'Analisis performa penjualan' })}</CardDescription>
        <CardAction>
          {/* Toggle batang / tren: dua tombol ikon di dalam satu segmen kotak */}
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5" role="group">
            {([
              { key: 'bar' as const, icon: BarChart3, label: t('overview.modeBar', { defaultValue: 'Grafik batang' }) },
              { key: 'line' as const, icon: LineChart, label: t('overview.modeLine', { defaultValue: 'Grafik tren' }) },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-label={label}
                aria-pressed={mode === key}
                className={cn(
                  'flex h-7 w-8 items-center justify-center rounded-md transition-colors',
                  mode === key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-1">
        {hasData ? (
          <SegmentedBarChart data={chartData} mode={mode} formatTick={compact} />
        ) : (
          <EmptyState
            icon={BarChart3}
            title={t('overview.empty', { defaultValue: 'Belum ada penjualan pada rentang ini' })}
            className="py-8"
          />
        )}
      </CardContent>

      {rows.length > 0 && (
        <div className="divide-y divide-border border-t border-border px-4">
          {rows.map((row) => (
            <OverviewRow
              key={row.id}
              icon={<row.icon className="h-[18px] w-[18px]" />}
              iconClassName={row.className}
              label={row.name}
              progress={row.share}
              amount={rp(row.amount)}
              delta={row.delta}
              deltaTitle={t('overview.deltaHint', { defaultValue: 'dibanding bulan lalu' })}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
