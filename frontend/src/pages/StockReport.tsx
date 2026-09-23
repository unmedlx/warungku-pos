import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useState } from 'react';
import { Package, AlertTriangle, Warehouse } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { SectionTitle } from '@/components/jokoui/section-title';
import { DataList, DataListRow } from '@/components/jokoui/data-list';
import { Tabs, TabsList, TabsTrigger } from '@/components/jokoui/tabs';
import { PageHeader } from '@/components/jokoui/page-header';
import HubTabs from '@/components/layout/HubTabs';
import { StatCard } from '@/components/jokoui/stat-card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

export default function StockReport() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { t, i18n } = useTranslation('settings');
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[i18n.language] ?? 'Rp';
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const days = Number(period);
  const since = startOfDay(subDays(new Date(), days));

  const products = useLiveQuery(() => db.products.toArray());
  const stockIns = useLiveQuery(async () => db.stockIns.where('date').aboveOrEqual(since).toArray(), [days]);
  const stockOuts = useLiveQuery(async () => db.stockOuts.where('date').aboveOrEqual(since).toArray(), [days]);

  if (!can('view_reports')) {
    return <LockedPage title={t('stockReport.locked.title')} permissionLabel={t('stockReport.locked.permissionLabel')} />;
  }

  const totalStockIn = stockIns?.reduce((s, si) => s + si.quantity, 0) ?? 0;
  const totalStockInValue = stockIns?.reduce((s, si) => s + si.totalPrice, 0) ?? 0;
  const totalStockOut = stockOuts?.reduce((s, so) => s + so.quantity, 0) ?? 0;

  const stockOutByReason = stockOuts?.reduce((acc, so) => {
    acc[so.reason] = (acc[so.reason] || 0) + so.quantity;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const currentStock = products?.reduce((s, p) => s + p.stock, 0) ?? 0;
  const lowStockProducts = products?.filter(p => p.stock > 0 && p.stock <= 5) ?? [];
  const outOfStockProducts = products?.filter(p => p.stock === 0) ?? [];

  const getProductName = (pid: number) => products?.find(p => p.id === pid)?.name ?? '-';

  const chartData = (() => {
    const map: Record<string, { stockIn: number; stockOut: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'dd/MM');
      map[d] = { stockIn: 0, stockOut: 0 };
    }
    stockIns?.forEach(si => {
      const d = format(new Date(si.date), 'dd/MM');
      if (map[d]) map[d].stockIn += si.quantity;
    });
    stockOuts?.forEach(so => {
      const d = format(new Date(so.date), 'dd/MM');
      if (map[d]) map[d].stockOut += so.quantity;
    });
    return Object.entries(map).map(([date, data]) => ({ date, ...data }));
  })();

  const stockMovementData = (() => {
    const map: Record<string, number> = {};
    let cumulative = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'dd/MM');
      map[d] = 0;
    }
    stockIns?.forEach(si => {
      const d = format(new Date(si.date), 'dd/MM');
      if (map[d] !== undefined) map[d] += si.quantity;
    });
    stockOuts?.forEach(so => {
      const d = format(new Date(so.date), 'dd/MM');
      if (map[d] !== undefined) map[d] -= so.quantity;
    });
    return Object.entries(map).map(([date, movement]) => {
      cumulative += movement;
      return { date, stock: cumulative };
    });
  })();

  const rp = (n: number) => `${currencySymbol} ${n.toLocaleString(numberLocale)}`;

  const getReasonLabel = (reason: string) => {
    const keyMap: Record<string, string> = {
      rusak: 'damaged',
      hilang: 'lost',
      retur: 'return',
      expired: 'expired',
      sample: 'sample',
      opname: 'opname',
      lain: 'other',
    };
    return t(`stockReport.reasons.${keyMap[reason] ?? 'other'}`, reason);
  };

  const hasMovement = chartData.some((d) => d.stockIn > 0 || d.stockOut > 0);
  const stockInLabel = t('stockReport.movementChart.in');
  const stockOutLabel = t('stockReport.movementChart.out');

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={Warehouse} title={t('stockReport.title')} />
      <HubTabs />

      <Tabs variant="pill" value={period} onValueChange={v => setPeriod(v as '7' | '30')}>
        <TabsList className="w-full">
          <TabsTrigger value="7" className="flex-1">{t('stockReport.period.7days')}</TabsTrigger>
          <TabsTrigger value="30" className="flex-1">{t('stockReport.period.30days')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label={t('stockReport.summary.in')} value={totalStockIn} valueClassName="text-success-text" />
        <StatCard label={t('stockReport.summary.out')} value={totalStockOut} valueClassName="text-destructive-text" />
        <StatCard label={t('stockReport.summary.available')} value={currentStock} />
      </div>

      {/* Stock In Value */}
      <Card>
        <CardContent className="p-4">
          <SectionTitle title={t('stockReport.stockInValue.title')} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t('stockReport.stockInValue.totalPurchase')}</span>
            <span className="text-lg font-semibold tabular-nums text-success-text">{rp(totalStockInValue)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('stockReport.stockInValue.average', { avg: totalStockIn > 0 ? rp(totalStockInValue / totalStockIn) : rp(0) })}
          </p>
        </CardContent>
      </Card>

      {/* Stock Movement Chart */}
      <Card>
        <CardContent className="p-4">
          <SectionTitle title={t('stockReport.movementChart.title')} />
          {hasMovement ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number, name: string) => [v, name === 'stockIn' ? stockInLabel : stockOutLabel]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                  labelStyle={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}
                  cursor={{ fill: 'hsl(var(--accent))' }}
                />
                {/* Warna diambil dari token, bukan ditulis mati. Sebelumnya
                    dua batang ini memakai hijau dan merah versi lama yang
                    tidak ikut mode gelap maupun tema aksen. */}
                <Bar dataKey="stockIn" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} name={stockInLabel} />
                <Bar dataKey="stockOut" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} name={stockOutLabel} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            /* Tanpa ini, kartu ini memesan 180px kosong dan terbaca seperti
               grafik yang gagal dimuat — bukan seperti toko yang memang
               belum mencatat pergerakan stok. */
            <p className="py-6 text-center text-xsm text-muted-foreground">
              {t('stockReport.movementChart.empty', {
                defaultValue: 'Belum ada pergerakan stok di rentang ini.',
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stock Out by Reason */}
      {Object.keys(stockOutByReason).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <SectionTitle title={t('stockReport.reasons.title')} />
            <DataList>
              {Object.entries(stockOutByReason).map(([reason, qty]) => (
                <DataListRow key={reason} label={getReasonLabel(reason)} value={`${qty} ${t('stockReport.reasons.unit')}`} valueClassName="text-destructive-text" />
              ))}
            </DataList>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <SectionTitle
              title={
                <span className="flex items-center gap-1.5 text-warning-text">
                  <AlertTriangle className="h-4 w-4" />
                  {t('stockReport.lowStock.title', { count: lowStockProducts.length })}
                </span>
              }
            />
            <DataList>
              {lowStockProducts.slice(0, 5).map(p => (
                <DataListRow key={p.id} label={<span className="truncate">{p.name}</span>} value={`${p.stock} ${p.unit}`} valueClassName="text-warning-text" />
              ))}
            </DataList>
            {lowStockProducts.length > 5 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t('stockReport.lowStock.more', { count: lowStockProducts.length - 5 })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Out of Stock */}
      {outOfStockProducts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <SectionTitle
              title={
                <span className="flex items-center gap-1.5 text-destructive-text">
                  <Package className="h-4 w-4" />
                  {t('stockReport.outOfStock.title', { count: outOfStockProducts.length })}
                </span>
              }
            />
            <DataList>
              {outOfStockProducts.slice(0, 5).map(p => (
                <DataListRow key={p.id} label={<span className="truncate">{p.name}</span>} value={`0 ${p.unit}`} valueClassName="text-destructive-text" />
              ))}
            </DataList>
            {outOfStockProducts.length > 5 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t('stockReport.lowStock.more', { count: outOfStockProducts.length - 5 })}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
