import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Package, CreditCard, Download, Printer } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from '@/components/jokoui/card';
import { Badge } from '@/components/jokoui/badge';
import { DataList, DataListRow } from '@/components/jokoui/data-list';
import { OverviewRow } from '@/components/jokoui/overview-row';
import { Tabs, TabsList, TabsTrigger } from '@/components/jokoui/tabs';
import { Switch } from '@/components/jokoui/switch';
import { Label } from '@/components/jokoui/label';
import { Input } from '@/components/jokoui/input';
import { Button } from '@/components/jokoui/button';
import { PageHeader } from '@/components/jokoui/page-header';
import HubTabs from '@/components/layout/HubTabs';
import { StatCard } from '@/components/jokoui/stat-card';
import { EmptyState } from '@/components/jokoui/empty-state';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import ExportReportDialog from '@/components/reports/ExportReportDialog';
import UserTypeModal from '@/components/UserTypeModal';
import { shouldShowUserTypeSurvey } from '@/lib/user-type';
import { toast } from 'sonner';
import { isNativePlatform, printRawNativeBluetooth, getDailyReportESCPOSData, type DailyReportPrintData } from '@/lib/printer';
import DailyReportReceipt from '@/components/reports/DailyReportReceipt';
import TransactionOverview from '@/components/reports/TransactionOverview';
import { useTranslation } from 'react-i18next';
import { InAppReview } from '@capacitor-community/in-app-review';

const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

export default function Laporan() {
  const { can, currentUser } = useAuth();
  const { t, i18n } = useTranslation('reports');
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[i18n.language] ?? 'Rp';
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const [period, setPeriod] = useState<'daily' | '7' | '30'>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<DailyReportPrintData | null>(null);
  const [shouldRequestReviewOnClose, setShouldRequestReviewOnClose] = useState(false);
  const days = period === 'daily' ? 1 : Number(period);


  const dateRange = (() => {
    if (period === 'daily') {
      const date = new Date(`${selectedDate}T00:00:00`);
      return { start: startOfDay(date), end: endOfDay(date) };
    }

    return { start: startOfDay(subDays(new Date(), days - 1)), end: endOfDay(new Date()) };
  })();

  const transactions = useLiveQuery(async () => {
    const all = await db.transactions.where('date').between(dateRange.start, dateRange.end, true, true).toArray();
    return all.filter(t => t.status !== 'open');
  }, [dateRange.start.getTime(), dateRange.end.getTime()]);

  const txItems = useLiveQuery(async () => {
    if (!transactions || transactions.length === 0) return [];
    const txIds = transactions.map(t => t.id!).filter(Boolean);
    return db.transactionItems.where('transactionId').anyOf(txIds).toArray();
  }, [transactions]);

  const expenses = useLiveQuery(async () => {
    const all = await db.expenses.where('date').between(dateRange.start, dateRange.end, true, true).toArray();
    return all.filter(e => e.isDeleted === 0);
  }, [dateRange.start.getTime(), dateRange.end.getTime()]);

  const debtPayments = useLiveQuery(
    () => db.debtPayments.where('date').between(dateRange.start, dateRange.end, true, true).toArray(),
    [dateRange.start.getTime(), dateRange.end.getTime()],
  );

  const expenseCategories = useLiveQuery(() =>
    db.expenseCategories.where('isDeleted').equals(0).toArray(),
  );

  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());

  if (!can('view_reports')) {
    return <LockedPage title={t('locked.title')} permissionLabel={t('locked.permissionLabel')} />;
  }

  const allItems = txItems ?? [];
  const totalSales = transactions?.reduce((s, t) => s + t.total, 0) ?? 0;
  const totalProfit = transactions?.reduce((s, t) => s + t.profit, 0) ?? 0;
  const txCount = transactions?.length ?? 0;
  const averageTransaction = txCount > 0 ? totalSales / txCount : 0;
  const initialPayments = transactions?.reduce((sum, transaction) => sum + Math.min(transaction.paymentAmount, transaction.total), 0) ?? 0;
  const installmentPayments = debtPayments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const totalCashIn = initialPayments + installmentPayments;

  const totalRevenue = transactions?.reduce((s, t) => s + t.subtotal, 0) ?? 0;
  const totalDiscount = transactions?.reduce((s, t) => s + t.discountAmount, 0) ?? 0;
  const totalHpp = allItems.reduce((s, item) => s + item.hpp * item.quantity, 0);
  const netSales = totalRevenue - totalDiscount;
  const grossProfit = netSales - totalHpp;
  const marginPercent = netSales > 0 ? (grossProfit / netSales * 100) : 0;

  const totalExpenses = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const appliedExpenses = includeExpenses ? totalExpenses : 0;
  const netProfit = grossProfit - appliedExpenses;
  const netMarginPercent = netSales > 0 ? (netProfit / netSales * 100) : 0;

  const expenseByCategory: Record<string, { name: string; icon: string; color: string; amount: number }> = {};
  expenses?.forEach(e => {
    const cat = expenseCategories?.find(c => c.id === e.categoryId);
    const key = cat?.name ?? t('fallbacks.uncategorized');
    if (!expenseByCategory[key]) {
      expenseByCategory[key] = {
        name: key,
        icon: cat?.icon ?? '📦',
        color: cat?.color ?? '#6B7280',
        amount: 0,
      };
    }
    expenseByCategory[key].amount += e.amount;
  });
  const topExpenseCategories = Object.values(expenseByCategory)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const chartData = (() => {
    const map: Record<string, number> = {};

    if (period === 'daily') {
      map[format(new Date(`${selectedDate}T00:00:00`), 'dd/MM')] = 0;
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'dd/MM');
        map[d] = 0;
      }
    }

    transactions?.forEach(t => {
      const d = format(new Date(t.date), 'dd/MM');
      if (map[d] !== undefined) map[d] += t.total;
    });
    return Object.entries(map).map(([date, sales]) => ({ date, sales }));
  })();

  const productSales: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
  allItems.forEach(item => {
    if (!productSales[item.productName]) productSales[item.productName] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
    productSales[item.productName].qty += item.quantity;
    productSales[item.productName].revenue += item.subtotal;
    productSales[item.productName].profit += (item.price - item.hpp) * item.quantity - item.discountAmount;
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, period === 'daily' ? 10 : 5);

  const paymentSummary: Record<number, { name: string; amount: number; count: number }> = {};
  transactions?.forEach(t => {
    if (t.paymentAmount <= 0) return;
    const method = paymentMethods?.find(p => p.id === t.paymentMethodId);
    const key = t.paymentMethodId ?? 0;
    if (!paymentSummary[key]) paymentSummary[key] = { name: method?.name ?? t('fallbacks.noMethod'), amount: 0, count: 0 };
    paymentSummary[key].amount += Math.min(t.paymentAmount, t.total);
    paymentSummary[key].count += 1;
  });
  debtPayments?.forEach((payment) => {
    const method = paymentMethods?.find((item) => item.id === payment.paymentMethodId);
    const key = payment.paymentMethodId;
    if (!paymentSummary[key]) paymentSummary[key] = { name: method?.name ?? t('fallbacks.deletedMethod'), amount: 0, count: 0 };
    paymentSummary[key].amount += payment.amount;
    paymentSummary[key].count += 1;
  });
  const paymentBreakdown = Object.values(paymentSummary).sort((a, b) => b.amount - a.amount);

  const rp = (n: number) => `${currencySymbol} ${n.toLocaleString(numberLocale)}`;

  const handlePrintDailyReport = () => {
    const itemsCount = allItems.reduce((s, item) => s + item.quantity, 0);
    const formattedDate = format(new Date(`${selectedDate}T00:00:00`), 'dd-MM-yyyy');

    const data: DailyReportPrintData = {
      dateStr: formattedDate,
      periodStr: `${formattedDate} 00:00 - 23:59`,
      txCount,
      itemCount: itemsCount,
      grossSales: totalRevenue,
      discount: totalDiscount,
      netSales: netSales,
      paymentBreakdown: paymentBreakdown.map(method => ({
        name: method.name,
        amount: method.amount,
        count: method.count
      })),
      topProducts: topProducts.map(p => ({
        name: p.name,
        qty: p.qty,
        revenue: p.revenue
      })),
      storeSettings,
      cashierName: currentUser?.name || t('fallbacks.owner'),
      includeExpenses,
      expensesAmount: appliedExpenses,
      netProfit: netProfit
    };

    setReportData(data);
    setReportOpen(true);

    const hasReviewed = localStorage.getItem('kg_has_requested_closing_review') === 'true';
    if (!hasReviewed) {
      setShouldRequestReviewOnClose(true);
    }
  };

  const rangeLabel = period === 'daily'
    ? format(dateRange.start, 'd MMM yyyy')
    : `${format(dateRange.start, 'd MMM')} – ${format(dateRange.end, 'd MMM yyyy')}`;
  const maxPayment = paymentBreakdown[0]?.amount ?? 0;

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={BarChart3} title={t('title')}>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <Download /> {t('export')}
        </Button>
      </PageHeader>
      <HubTabs />

      <ExportReportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        defaultStartMs={dateRange.start.getTime()}
        defaultEndMs={dateRange.end.getTime()}
      />

      {reportData && (
        <DailyReportReceipt
          open={reportOpen}
          onClose={async () => {
            setReportOpen(false);
            if (shouldRequestReviewOnClose) {
              setShouldRequestReviewOnClose(false);
              localStorage.setItem('kg_has_requested_closing_review', 'true');
              if (isNativePlatform()) {
                try {
                  await InAppReview.requestReview();
                } catch (err) {
                  console.error('Failed to request in-app review:', err);
                }
              } else {
                console.log('In-app review requested (mocked for PWA/Web)');
                toast.info(t('dailyReceipt.reviewPromptWeb', 'Beri rating aplikasi kami di Play Store!'));
              }
            }
          }}
          data={reportData}
        />
      )}

      {/* Pemilih periode */}
      <Tabs variant="pill" value={period} onValueChange={v => setPeriod(v as 'daily' | '7' | '30')}>
        <TabsList className="w-full">
          <TabsTrigger value="daily" className="flex-1">{t('tabs.daily')}</TabsTrigger>
          <TabsTrigger value="7" className="flex-1">{t('tabs.7days')}</TabsTrigger>
          <TabsTrigger value="30" className="flex-1">{t('tabs.30days')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {period === 'daily' && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-date">{t('daily.reportDate')}</Label>
              <Input
                id="report-date"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label htmlFor="include-expenses">{t('daily.includeExpenses')}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{t('daily.includeExpensesHint')}</p>
              </div>
              <Switch id="include-expenses" checked={includeExpenses} onCheckedChange={setIncludeExpenses} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Laba rugi */}
      <Card>
        <CardHeader className="grid-cols-[1fr_auto] pb-2">
          <CardTitle className="text-sm">{t(period === 'daily' ? 'pl.daily' : 'pl.title')}</CardTitle>
          <CardDescription className="text-xs">{rangeLabel}</CardDescription>
          <CardAction>
            <Badge variant={netProfit >= 0 ? 'success' : 'destructive'} shape="pill">
              {netProfit >= 0 ? <TrendingUp /> : <TrendingDown />}
              {netMarginPercent.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-0">
          <DataList>
            <DataListRow label={t('pl.grossRevenue')} value={rp(totalRevenue)} />
            {totalDiscount > 0 && (
              <DataListRow label={t('pl.discount')} value={`− ${rp(totalDiscount)}`} valueClassName="text-destructive-text" />
            )}
            <DataListRow label={t('pl.netSales')} value={rp(netSales)} />
            <DataListRow label={t('pl.cogs')} value={`− ${rp(totalHpp)}`} valueClassName="text-destructive-text" />
            <DataListRow
              total
              label={
                <span>
                  {t('pl.grossProfit')}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t('pl.grossMargin')} {marginPercent.toFixed(1)}%</span>
                </span>
              }
              value={rp(grossProfit)}
              valueClassName={grossProfit < 0 ? 'text-destructive-text' : undefined}
            />
            {totalExpenses > 0 && (
              <DataListRow
                label={`${t('pl.operationalExpenses')}${!includeExpenses ? t('pl.notIncluded') : ''}`}
                value={`− ${rp(totalExpenses)}`}
                valueClassName={includeExpenses ? 'text-destructive-text' : 'text-muted-foreground line-through'}
              />
            )}
            <DataListRow
              total
              label={t('pl.netProfit')}
              value={rp(netProfit)}
              valueClassName={`text-lg ${netProfit >= 0 ? 'text-success-text' : 'text-destructive-text'}`}
            />
          </DataList>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label={t('summary.transactions')} value={txCount} />
        <StatCard label={t('summary.sales')} value={rp(totalSales)} />
        <StatCard label={t('summary.profit')} value={rp(totalProfit)} valueClassName={totalProfit < 0 ? 'text-destructive-text' : undefined} />
      </div>

      {/* Metode pembayaran + tombol cetak laporan penutupan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('dailySales.title')}</CardTitle>
          {period === 'daily' && (
            <CardDescription className="text-xs">
              {t('dailySales.cashIn')} {rp(totalCashIn)} · {t('dailySales.avgTransaction')} {rp(averageTransaction)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {paymentBreakdown.length === 0 ? (
            <EmptyState icon={CreditCard} title={t('dailySales.noSales')} className="py-4" />
          ) : (
            <div className="divide-y divide-border">
              {paymentBreakdown.map(method => (
                <OverviewRow
                  key={method.name}
                  icon={<CreditCard className="h-[18px] w-[18px]" />}
                  label={
                    <span>
                      {method.name}
                      <span className="ml-1 text-muted-foreground">· {t('dailySales.transactionCount', { count: method.count })}</span>
                    </span>
                  }
                  progress={maxPayment > 0 ? (method.amount / maxPayment) * 100 : 0}
                  amount={rp(method.amount)}
                />
              ))}
            </div>
          )}
        </CardContent>
        {period === 'daily' && (
          <CardFooter className="flex-col items-stretch gap-1.5">
            <Button variant="outline" className="w-full" onClick={handlePrintDailyReport} disabled={txCount === 0}>
              <Printer />
              {t('daily.printClosingReport')}
            </Button>
            {txCount === 0 && (
              <p className="text-center text-xs text-muted-foreground">{t('daily.noSalesSelectedDate')}</p>
            )}
          </CardFooter>
        )}
      </Card>

      {topExpenseCategories.length > 0 && includeExpenses && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('expenses.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {topExpenseCategories.map(cat => {
              const percent = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ backgroundColor: cat.color + '20' }}>{cat.icon}</span>
                      <span className="truncate text-sm font-medium">{cat.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">{rp(cat.amount)}</p>
                      <p className="text-xs text-muted-foreground">{percent.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {period !== 'daily' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('chart.title')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => [`${currencySymbol} ${v.toLocaleString(numberLocale)}`, t('chart.tooltipLabel')]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tren 6 bulan + rincian metode bayar (rentangnya sendiri, tidak terikat tab periode) */}
      <TransactionOverview />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t(period === 'daily' ? 'products.daily' : 'products.title')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {topProducts.length === 0 ? (
            <EmptyState icon={Package} title={t('products.noData')} className="py-4" />
          ) : (
            <div className="divide-y divide-border">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium tabular-nums text-muted-foreground">{i + 1}</span>
                    <span className="truncate text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{rp(p.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{t('products.sold', { qty: p.qty, profit: rp(p.profit) })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
