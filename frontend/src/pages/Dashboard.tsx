import { useLiveQuery } from 'dexie-react-hooks';
import { db, isStockManaged, type TransactionItemRecord } from '@/lib/db';
import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Receipt,
  ChevronRight,
  ClipboardList,
  Wallet,
  Store,
  Bell,
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  Users,
  LayoutGrid,
  Package,
} from '@/components/icons';
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/jokoui/card';
import { Badge } from '@/components/jokoui/badge';
import { Button } from '@/components/jokoui/button';
import { EmptyState } from '@/components/jokoui/empty-state';
import { SectionTitle } from '@/components/jokoui/section-title';
import { StatCard } from '@/components/jokoui/stat-card';
import { TransactionItem } from '@/components/jokoui/transaction-item';
import { UserGreeting } from '@/components/jokoui/user-greeting';
import { ServiceTile, TileGrid, type TileTone } from '@/components/jokoui/service-tile';
import { toneForRoute } from '@/lib/tones';
import { AlertStrip } from '@/components/jokoui/alert-strip';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { Link, useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, isSameDay, eachDayOfInterval, formatDistanceToNow } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import WhatsNewModal from '@/components/WhatsNewModal';
import { DailyPllCard } from '@/components/DailyPllCard';
import { HomeInterrupt } from '@/components/home/HomeInterrupt';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getUnseenFeatures } from '@/lib/whats-new';
import { useAuth } from '@/hooks/use-auth';
import type { PermissionKey } from '@/lib/db';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const LOCALES: Record<string, Locale> = { id, en: enUS, ms };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

function getGreeting(hour: number, lang: string) {
  const isEn = lang.startsWith('en');
  if (hour < 12) return isEn ? 'Good morning' : 'Selamat pagi';
  if (hour < 15) return isEn ? 'Good afternoon' : 'Selamat siang';
  if (hour < 19) return isEn ? 'Good evening' : 'Selamat sore';
  return isEn ? 'Good night' : 'Selamat malam';
}

interface WeeklyBar {
  day: Date;
  label: string;
  total: number;
}

/**
 * Grafik batang 7 hari yang hidup DI DALAM panel dompet, bukan di kartunya
 * sendiri. Karena ia berdiri di atas bidang brand yang dicelup, batangnya
 * digambar dari putih transparan dan hari ini dicetak putih penuh — palet
 * `bg-muted`/`bg-primary` tidak akan terbaca sama sekali di sana.
 *
 * Ini data, bukan sparkline hiasan: tiap batang punya labelnya sendiri dan
 * tingginya proporsional terhadap hari tertinggi dalam pekan itu.
 */
function WeeklyBars({ data, today, max, emptyTitle }: { data: WeeklyBar[]; today: Date; max: number; emptyTitle: string }) {
  if (data.every((d) => d.total === 0)) {
    /* Keadaan kosong tidak memesan tinggi grafik: toko baru akan melihat
       panel ini sepanjang hari pertamanya, dan lubang setinggi grafik di
       tengah objek utama layar terbaca seperti ada yang gagal dimuat. */
    return <p className="text-2xs font-medium text-primary-dim">{emptyTitle}</p>;
  }
  return (
    <div>
      <div className="flex h-14 items-end gap-1.5">
        {data.map((d, i) => {
          const isToday = isSameDay(d.day, today);
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-t-sm transition-[height] duration-500 motion-reduce:transition-none',
                isToday ? 'bg-primary-foreground' : 'bg-white/30',
              )}
              style={{ height: `${Math.max((d.total / max) * 100, d.total > 0 ? 6 : 3)}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-3xs font-semibold text-primary-dim">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { can } = useAuth();
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const dateLocale = LOCALES[i18n.language] ?? id;
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';

  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  const todayTransactions = useLiveQuery(async () => {
    const all = await db.transactions.where('date').aboveOrEqual(today).toArray();
    return all.filter((t) => t.status !== 'open');
  }, []);

  const yesterdayTransactions = useLiveQuery(async () => {
    const all = await db.transactions.where('date').aboveOrEqual(yesterday).toArray();
    return all.filter((t) => t.status !== 'open' && new Date(t.date) < today);
  }, []);

  const weeklyTransactions = useLiveQuery(async () => {
    const start = subDays(today, 6);
    const all = await db.transactions.where('date').aboveOrEqual(start).toArray();
    return all.filter((t) => t.status !== 'open');
  }, []);

  const openBillsCount = useLiveQuery(async () => {
    const open = await db.transactions.where('status').equals('open').toArray();
    return open.length;
  }, []);

  const lowStockProducts = useLiveQuery(
    () => db.products.filter((p) => p.isDeleted === 0 && isStockManaged(p) && p.stock <= 5).toArray(),
  );

  const alertCount = (openBillsCount ?? 0) + (lowStockProducts?.length ?? 0);
  const hasAlerts = alertCount > 0;

  const todayExpenses = useLiveQuery(async () => {
    const all = await db.expenses.where('date').aboveOrEqual(today).toArray();
    return all.filter((e) => e.isDeleted === 0);
  }, []);

  const recentTransactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().limit(5).toArray());

  const recentTxItems = useLiveQuery(async () => {
    if (!recentTransactions || recentTransactions.length === 0) return {};
    const txIds = recentTransactions.map((t) => t.id!).filter(Boolean);
    const items = await db.transactionItems.where('transactionId').anyOf(txIds).toArray();
    const map: Record<number, TransactionItemRecord[]> = {};
    for (const item of items) {
      if (!map[item.transactionId]) map[item.transactionId] = [];
      map[item.transactionId].push(item);
    }
    return map;
  }, [recentTransactions]);

  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());

  const unseenFeatures = useMemo(
    () => getUnseenFeatures(storeSettings?.seenWhatsNewIds),
    [storeSettings?.seenWhatsNewIds],
  );

  useEffect(() => {
    if (!storeSettings) return;
    if (!storeSettings.onboardingDone) return;
    if (unseenFeatures.length === 0) return;
    setWhatsNewOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSettings?.id, unseenFeatures.length > 0]);

  const weeklyChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    return days.map((day) => {
      const total =
        weeklyTransactions?.reduce((sum, t) => {
          const d = new Date(t.date);
          return isSameDay(startOfDay(d), day) ? sum + t.total : sum;
        }, 0) ?? 0;
      return {
        day,
        label: format(day, 'EEE', { locale: dateLocale }),
        total,
      };
    });
  }, [weeklyTransactions, today, dateLocale]);

  // Jangan pernah `return null` di sini. Semua pemakaian `storeSettings` di
  // bawah sudah optional-chained, dan kalau observer liveQuery-nya telat/
  // tersendat (mis. saat komponen mount tepat setelah penulisan Dexie waktu
  // login) beranda akan tampil kosong total tanpa cara pulih.

  const totalSales = todayTransactions?.reduce((sum, t) => sum + t.total, 0) ?? 0;
  const totalProfit = todayTransactions?.reduce((sum, t) => sum + t.profit, 0) ?? 0;
  const totalExpensesToday = todayExpenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const txCount = todayTransactions?.length ?? 0;
  const expenseCount = todayExpenses?.length ?? 0;
  const yesterdaySales = yesterdayTransactions?.reduce((sum, t) => sum + t.total, 0) ?? 0;
  const avgTransaction = txCount > 0 ? totalSales / txCount : 0;
  const salesTrend = yesterdaySales > 0 ? ((totalSales - yesterdaySales) / yesterdaySales) * 100 : 0;

  const maxDailySales = Math.max(...weeklyChartData.map((d) => d.total), 1);

  const statCards = [
    {
      key: 'sales',
      icon: ShoppingCart,
      color: 'bg-primary/10 text-primary',
      label: t('stats.salesToday'),
      value: `Rp ${totalSales.toLocaleString(numberLocale)}`,
      sub: t('stats.salesSub', { count: txCount, trend: salesTrend.toFixed(0), defaultValue: '{{count}} transaksi, {{trend}}% vs kemarin' }),
    },
    {
      key: 'avgTransaction',
      icon: Receipt,
      color: 'bg-info/10 text-info-text',
      label: t('stats.avgTransaction', { defaultValue: 'Rata-rata' }),
      value: `Rp ${avgTransaction.toLocaleString(numberLocale)}`,
      sub: t('stats.perTransaction', { defaultValue: 'per transaksi' }),
    },
    {
      key: 'profit',
      icon: TrendingUp,
      color: 'bg-success/10 text-success-text',
      label: t('stats.profitToday'),
      value: `Rp ${totalProfit.toLocaleString(numberLocale)}`,
      hidden: !can('view_reports'),
    },
    {
      key: 'expenses',
      icon: Wallet,
      color: 'bg-warning/10 text-warning-text',
      label: t('stats.expensesToday'),
      value: `Rp ${totalExpensesToday.toLocaleString(numberLocale)}`,
      sub: t('stats.expenseNotes', { count: expenseCount }),
      hidden: !(can('view_expenses') || can('manage_expenses')),
    },
  ].filter((s) => !s.hidden);

  const [salesStat, ...secondaryStats] = statCards;

  /**
   * Kisi menu. Sebelumnya empat akses cepat berdiri sejajar dengan tombol
   * "Semua" yang membuka sheet — artinya tiga dari delapan tujuan yang
   * dipakai sehari-hari selalu berada satu ketukan lebih jauh, dan tidak
   * ada yang bisa dihafal posisinya.
   *
   * Sekarang seluruh menu tampil sekaligus sebagai kisi ubin berwarna.
   * Warnanya datang dari `lib/tones`, bukan ditulis di sini, supaya satu
   * urusan memegang warna yang sama di ubin ini, pita kategori kasir, dan
   * ikon daftar transaksi.
   */
  const menuTiles: { to: string; icon: typeof ShoppingCart; label: string; tone: TileTone; count?: number; perm?: PermissionKey | PermissionKey[] }[] = [
    { to: '/cashier', icon: ShoppingCart, label: t('quickActions.cashier'), tone: toneForRoute('/cashier'), perm: 'create_transaction' },
    { to: '/products', icon: Package, label: t('quickActions.products'), tone: toneForRoute('/products'), perm: 'manage_products' },
    { to: '/stock-in', icon: ArrowDownToLine, label: t('quickActions.stockIn'), tone: toneForRoute('/stock-in'), perm: 'manage_stock_inout' },
    { to: '/stock-out', icon: ArrowUpFromLine, label: t('quickActions.stockOut'), tone: toneForRoute('/stock-out'), perm: 'manage_stock_inout' },
    { to: '/debts', icon: HandCoins, label: t('quickActions.debts', { defaultValue: 'Kasbon' }), tone: toneForRoute('/debts') },
    { to: '/expenses', icon: Wallet, label: t('quickActions.expenses'), tone: toneForRoute('/expenses'), perm: ['view_expenses', 'manage_expenses'] },
    { to: '/reports', icon: BarChart3, label: t('quickActions.reports'), tone: toneForRoute('/reports'), perm: 'view_reports' },
    { to: '/customers', icon: Users, label: t('quickActions.customers'), tone: toneForRoute('/customers') },
  ];
  const visibleTiles = menuTiles.filter((a) => !a.perm || (Array.isArray(a.perm) ? a.perm.some(can) : can(a.perm)));

  const formatTxDate = (date: Date) => {
    const d = new Date(date);
    return isSameDay(startOfDay(d), today)
      ? format(d, 'HH:mm', { locale: dateLocale })
      : format(d, 'd MMM HH:mm', { locale: dateLocale });
  };

  const hour = new Date().getHours();
  const greeting = getGreeting(hour, i18n.language);

  const weeklyChart = (
    <WeeklyBars
      data={weeklyChartData}
      today={today}
      max={maxDailySales}
      emptyTitle={t('chart.noData', { defaultValue: 'Belum ada data penjualan' })}
    />
  );

  return (
    <div className="pb-28 md:pb-32">
      <Sheet open={alertOpen} onOpenChange={setAlertOpen}>
        {/* Header polos: avatar toko + nama + sapaan, lonceng di kanan */}
        {/* Latar pejal, bukan backdrop-blur: di WebView HP kelas bawah blur
            dibayar setiap frame gulir, dan di bawah matahari ia menurunkan
            kontras baris yang paling sering dibaca di app ini. */}
        <div className="sticky top-0 z-30 bg-background px-4 pb-2 pt-2 md:px-8">
          <UserGreeting
            avatarPosition="leading"
            greeting={greeting}
            name={storeSettings?.storeName || t('title.storeNameFallback')}
            avatar={
              <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                {storeSettings?.logo ? (
                  <img
                    src={storeSettings.logo}
                    alt={t('storeLogoAlt', { defaultValue: 'Logo toko' })}
                    className="h-full w-full object-cover"
                  />
                ) : storeSettings?.storeName ? (
                  <span className="text-sm font-semibold leading-none">
                    {/* Inisial kata, bukan dua huruf pertama: "Warung Bu
                        Siti" harus terbaca WB, bukan WA. */}
                    {storeSettings.storeName
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                ) : (
                  <Store className="h-5 w-5" />
                )}
              </div>
            }
            action={
              <SheetTrigger asChild>
                <Button variant="outline" size="icon-lg" aria-label={t('attention.title', { defaultValue: 'Perlu Perhatian' })}>
                  <Bell />
                  {hasAlerts && (
                    <Badge
                      variant="warning"
                      size="sm"
                      shape="pill"
                      /* Di dalam tombol, bukan digantung di luarnya: header
                         ini lengket di puncak halaman dan apa pun yang
                         menjorok ke atas terpotong saat digulir. */
                      className="absolute right-0.5 top-0.5 h-4.5 min-w-4.5 px-1 text-3xs"
                    >
                      {alertCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
            }
          />
        </div>

        {/* Sheet notifikasi: daftar Item flat */}
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{t('attention.title', { defaultValue: 'Perlu Perhatian' })}</SheetTitle>
          </SheetHeader>
          <div className="-mx-4 py-2 divide-y divide-border">
            {openBillsCount != null && openBillsCount > 0 && (
              <Item asChild variant="flat" interactive>
                <Link to="/cashier" state={{ openBills: true }} onClick={() => setAlertOpen(false)}>
                  <ItemMedia tone="warning"><ClipboardList /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>{t('openBills.title')}</ItemTitle>
                    <ItemDescription>{t('openBills.description', { count: openBillsCount })}</ItemDescription>
                  </ItemContent>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </Item>
            )}
            {lowStockProducts && lowStockProducts.length > 0 && (
              <Item asChild variant="flat" interactive>
                <Link to="/products" onClick={() => setAlertOpen(false)}>
                  <ItemMedia tone="destructive"><AlertTriangle /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>{t('lowStock.title')}</ItemTitle>
                    <ItemDescription>
                      {t('lowStock.summary', {
                        count: lowStockProducts.length,
                        defaultValue: `${lowStockProducts.length} produk perlu restock`,
                      })}
                    </ItemDescription>
                  </ItemContent>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </Item>
            )}
            {!hasAlerts && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t('attention.empty', { defaultValue: 'Tidak ada notifikasi' })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="space-y-3 px-4 pt-1 md:px-8">
        {/* Panel uang memimpin layar, apa pun keadaan tokonya.
            Sebelumnya `HomeInterrupt` berdiri di atasnya, dan pada toko baru
            kartu "Siapkan toko" memakan hampir separuh viewport pertama —
            sehingga janji layar ini ("buka app, langsung tahu berapa hari
            ini") gagal justru di hari-hari pertama, ketika pemiliknya paling
            sering membuka app. Ajakan itu tetap tampil, hanya tidak lagi
            menggeser objek utama layar ke bawah lipatan.

            P&L untuk pemilik, ringkasan penjualan untuk staf. */}
        {can('view_reports') ? (
          <DailyPllCard onViewReport={() => navigate('/reports')} chart={weeklyChart} />
        ) : (
          salesStat && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>{salesStat.label}</CardDescription>
                  <CardAction>
                    <Badge variant={salesTrend >= 0 ? 'success' : 'destructive'} shape="pill">
                      {salesTrend >= 0 ? <TrendingUp /> : <TrendingDown />}
                      {salesTrend !== 0
                        ? `${salesTrend > 0 ? '+' : '-'}${Math.abs(salesTrend).toFixed(0)}%`
                        : t('chart.todayLabel', { defaultValue: 'Hari ini' })}
                    </Badge>
                  </CardAction>
                  <p className="col-start-1 break-words text-metric font-semibold leading-[1.1] tracking-tight tabular-nums">{salesStat.value}</p>
                  <p className="col-start-1 text-xs text-muted-foreground">
                    {t('stats.transactions', { count: txCount, defaultValue: `${txCount} transaksi` })}
                    {' · '}
                    {format(new Date(), 'EEEE, d MMM', { locale: dateLocale })}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">{weeklyChart}</CardContent>
              </Card>

              {secondaryStats.length > 0 && (
                <div className={cn('grid gap-2', secondaryStats.length === 1 ? 'grid-cols-1' : secondaryStats.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                  {secondaryStats.map((s) => (
                    <StatCard key={s.key} label={s.label} value={s.value} sub={s.sub} size="sm" />
                  ))}
                </div>
              )}
            </>
          )
        )}

        {/* Paling banyak satu ajakan, dipilih berdasarkan prioritas di
            `lib/home-interrupts`. */}
        <HomeInterrupt
          lastBackupAt={storeSettings?.lastBackupAt}
          canBackup={can('manage_backup')}
          settingsLoaded={!!storeSettings}
          dateLocale={dateLocale}
        />

        {/* Kejadian yang bikin rugi diam-diam: stok menipis & bill yang belum
            ditutup. Sebelumnya hanya ada di balik ikon lonceng — sesuatu yang
            perlu ditindak tidak boleh menunggu dicari. */}
        {hasAlerts && (
          <div className="space-y-2">
            {lowStockProducts && lowStockProducts.length > 0 && (
              <AlertStrip
                icon={AlertTriangle}
                tone="warning"
                title={t('lowStock.title')}
                description={lowStockProducts.slice(0, 3).map((p) => p.name).join(', ')}
                onClick={() => navigate('/products')}
              />
            )}
            {openBillsCount != null && openBillsCount > 0 && (
              <AlertStrip
                icon={ClipboardList}
                tone="destructive"
                title={t('openBills.title')}
                description={t('openBills.description', { count: openBillsCount })}
                onClick={() => navigate('/cashier', { state: { openBills: true } })}
              />
            )}
          </div>
        )}

        {/* Menu: kisi ubin berwarna. Warna adalah sistem pengenal, bukan
            hiasan — lihat `lib/tones`. */}
        {visibleTiles.length > 0 && (
          <div className="pt-1">
            <SectionTitle title={t('quickActions.title')} />
            <TileGrid>
              {visibleTiles.map((tile) => (
                <ServiceTile
                  key={tile.to}
                  to={tile.to}
                  icon={tile.icon}
                  label={tile.label}
                  tone={tile.tone}
                  count={tile.to === '/cashier' ? undefined : tile.count}
                />
              ))}
            </TileGrid>
          </div>
        )}

        {/* Transaksi terakhir: satu Card berisi baris-baris terpisah garis */}
        <div className="pt-1">
          <SectionTitle
            title={t('recentTransactions.title')}
            action={recentTransactions && recentTransactions.length > 0 ? (
              <Link to="/history" className="inline-flex items-center gap-0.5">
                {t('recentTransactions.viewAll')} <ChevronRight className="h-4 w-4" />
              </Link>
            ) : undefined}
          />
          {recentTransactions && recentTransactions.length > 0 ? (
            <Card className="divide-y divide-border overflow-hidden">
              {recentTransactions.map((tx) => {
                const items = recentTxItems?.[tx.id!] ?? [];
                const itemCount = items.length;
                const primaryLabel = tx.customerName
                  ? `#${tx.receiptNumber} · ${tx.customerName}`
                  : `#${tx.receiptNumber}`;
                return (
                  <Link key={tx.id ?? tx.receiptNumber} to={`/history?txId=${tx.id ?? tx.receiptNumber}`} className="block">
                  <TransactionItem
                    variant="row"
                    icon={Receipt}
                    iconColor={tx.status === 'open' ? 'bg-warning/10 text-warning-text' : undefined}
                    title={primaryLabel}
                    meta={
                      <span className="flex items-center gap-1.5">
                        <span>{t('recentTransactions.itemCount', { count: itemCount, defaultValue: `${itemCount} produk` })}</span>
                        <span>·</span>
                        <span>{paymentMethods?.find((pm) => pm.id === tx.paymentMethodId)?.name || t('recentTransactions.cashFallback')}</span>
                        <span>·</span>
                        <span>{formatTxDate(tx.date)}</span>
                      </span>
                    }
                    amount={`Rp ${tx.total.toLocaleString(numberLocale)}`}
                    className="hover:bg-muted/60 active:bg-muted"
                  />
                  </Link>
                );
              })}
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={Receipt}
                title={t('recentTransactions.emptyTitle', { defaultValue: 'Belum ada transaksi hari ini' })}
                description={t('recentTransactions.emptyDesc', { defaultValue: 'Buat transaksi pertama untuk melihat riwayat penjualan.' })}
                action={
                  can('create_transaction') ? (
                    <Button asChild size="sm">
                      <Link to="/cashier">
                        <ShoppingCart /> {t('quickActions.cashier')}
                      </Link>
                    </Button>
                  ) : undefined
                }
                className="py-6"
              />
            </Card>
          )}
        </div>
      </div>

      <WhatsNewModal open={whatsNewOpen} onOpenChange={setWhatsNewOpen} features={unseenFeatures} />
    </div>
  );
}
