import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction, type TransactionItemRecord } from '@/lib/db';
import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { Search, Receipt as ReceiptIcon, ChevronRight, CalendarIcon, X, Trash2, ShoppingCart, UserCircle2 } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Input } from '@/components/jokoui/input';
import { Button } from '@/components/jokoui/button';
import { Badge } from '@/components/jokoui/badge';
import { PageHeader } from '@/components/jokoui/page-header';
import HubTabs from '@/components/layout/HubTabs';
import { EmptyState } from '@/components/jokoui/empty-state';
import { StatCard } from '@/components/jokoui/stat-card';
import { SegmentGroup } from '@/components/jokoui/segment-group';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from '@/components/jokoui/item';
import { DataList, DataListRow } from '@/components/jokoui/data-list';
import { SectionTitle } from '@/components/jokoui/section-title';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/jokoui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ReceiptDialog from '@/components/Receipt';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

const LOCALES: Record<string, Locale> = { id: idLocale, en: enUS, ms };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

export default function TransactionHistory() {
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? idLocale;
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can, multiUserEnabled } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreStock, setRestoreStock] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'open'>('all');
  const [filterCashier, setFilterCashier] = useState<string>('all');

  const transactions = useLiveQuery(() =>
    db.transactions.orderBy('date').reverse().toArray()
  );

  // Query all transaction items and build lookup map
  const txItemsMap = useLiveQuery(async () => {
    const items = await db.transactionItems.toArray();
    const map: Record<number, TransactionItemRecord[]> = {};
    for (const item of items) {
      if (!map[item.transactionId]) map[item.transactionId] = [];
      map[item.transactionId].push(item);
    }
    return map;
  });

  const getTxItems = (txId: number | undefined): TransactionItemRecord[] =>
    txId ? (txItemsMap?.[txId] ?? []) : [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const users = useLiveQuery(() => db.users.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());

  const userById = (uid?: number) => (uid ? users?.find((u) => u.id === uid) : undefined);
  const cashierName = (uid?: number) => userById(uid)?.name ?? '—';

  const getPaymentName = (pmId: number) =>
    paymentMethods?.find(pm => pm.id === pmId)?.name || t('transactionHistory.cashFallback');

  // Auto-open detail if txId is in URL
  const txIdParam = searchParams.get('txId');
  useEffect(() => {
    if (txIdParam && transactions) {
      const tx = transactions.find(t => t.id === Number(txIdParam) || t.receiptNumber === txIdParam);
      if (tx) {
        setSelectedTx(tx);
        setDetailOpen(true);
      }
    }
  }, [txIdParam, transactions]);

  const getDebt = (txId?: number) => txId ? debts?.find((debt) => debt.transactionId === txId) : undefined;

  const filtered = transactions?.filter(tx => {
    // Status filter
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
    // Cashier filter
    if (filterCashier !== 'all') {
      if (filterCashier === 'unknown') {
        if (tx.createdBy !== undefined && tx.createdBy !== null) return false;
      } else if (String(tx.createdBy) !== filterCashier) {
        return false;
      }
    }
    // Date filter
    if (dateFrom) {
      const txDate = new Date(tx.date);
      if (txDate < startOfDay(dateFrom)) return false;
    }
    if (dateTo) {
      const txDate = new Date(tx.date);
      if (txDate > endOfDay(dateTo)) return false;
    }
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const items = getTxItems(tx.id);
      return (
        tx.receiptNumber.toLowerCase().includes(q) ||
        items.some(it => it.productName.toLowerCase().includes(q))
      );
    }
    return true;
  }) ?? [];

  // Open bills surface as OrderCards above the list (design `Order Card.svg`);
  // exclude them from the grouped list so they don't appear twice.
  const openBillsList = filtered.filter(tx => tx.status === 'open');
  const showOpenSection = openBillsList.length > 0 && filterStatus !== 'completed';
  const listSource = showOpenSection ? filtered.filter(tx => tx.status !== 'open') : filtered;

  // Group by date
  const grouped = listSource.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = format(new Date(tx.date), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const filteredTotal = filtered.filter(t => t.status !== 'open').reduce((s, t) => s + t.total, 0);
  const hasDateFilter = dateFrom || dateTo;

  const openDetail = (tx: Transaction) => {
    setSelectedTx(tx);
    setDetailOpen(true);
  };

  const openReceipt = () => {
    setDetailOpen(false);
    setTimeout(() => setReceiptOpen(true), 200);
  };

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTx?.id) return;
    try {
      const debt = getDebt(selectedTx.id);
      if (debt?.id) {
        const installmentCount = await db.debtPayments.where('debtId').equals(debt.id).count();
        if (installmentCount > 0) {
          toast.error(t('transactionHistory.toast.hasDebtPayments'));
          setDeleteDialogOpen(false);
          return;
        }
        await db.debts.delete(debt.id);
      }
      if (restoreStock) {
        const items = getTxItems(selectedTx.id);
        for (const item of items) {
          const product = await db.products.get(item.productId);
          if (product) {
            await db.products.update(item.productId, { stock: product.stock + item.quantity });
          }
        }
      }
      await db.transactionItems.where('transactionId').equals(selectedTx.id).delete();
      await db.transactions.delete(selectedTx.id);
      setDeleteDialogOpen(false);
      setDetailOpen(false);
      setSelectedTx(null);
      toast.success(t('transactionHistory.toast.deleteSuccess'));
    } catch {
      toast.error(t('transactionHistory.toast.deleteFailed'));
    }
  };

  const rp = (n: number) => `Rp ${n.toLocaleString(numberLocale)}`;

  const statusItems = [
    { value: 'all' as const, label: t('transactionHistory.status.all') },
    { value: 'open' as const, label: t('transactionHistory.status.open') },
    { value: 'completed' as const, label: t('transactionHistory.status.completed') },
  ];

  // Label metode bayar untuk deskripsi baris: "-" untuk open bill, "+ Kasbon" bila ada utang.
  const paymentLabel = (tx: Transaction) =>
    tx.status === 'open'
      ? '-'
      : getDebt(tx.id)
        ? `${tx.paymentAmount > 0 ? `${getPaymentName(tx.paymentMethodId)} + ` : ''}${t('transactionHistory.badges.debt')}`
        : getPaymentName(tx.paymentMethodId);

  return (
    <div className="page-container">
      <PageHeader
        icon={ReceiptIcon}
        title={t('transactionHistory.title')}
        onBack={() => navigate(-1)}
      />
      <HubTabs />

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('transactionHistory.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Rentang tanggal: dua tombol outline dengan popover kalender */}
      <div className="mb-3 flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('flex-1 justify-start', !dateFrom && 'text-muted-foreground')}>
              <CalendarIcon />
              {dateFrom ? format(dateFrom, 'd MMM yyyy', { locale: dateLocale }) : t('transactionHistory.dateFrom')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground">–</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('flex-1 justify-start', !dateTo && 'text-muted-foreground')}>
              <CalendarIcon />
              {dateTo ? format(dateTo, 'd MMM yyyy', { locale: dateLocale }) : t('transactionHistory.dateTo')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarPicker
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {hasDateFilter && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={clearDateFilter} aria-label="Reset">
            <X />
          </Button>
        )}
      </div>

      {/* Filter status */}
      <SegmentGroup<'all' | 'open' | 'completed'>
        layout="full"
        className="mb-3"
        value={filterStatus}
        onValueChange={setFilterStatus}
        items={statusItems}
        aria-label={t('transactionHistory.status.all')}
      />

      {/* Cashier filter (only when multi-user is on) */}
      {multiUserEnabled && users && users.length > 0 && (
        <div className="mb-3">
          <Select value={filterCashier} onValueChange={setFilterCashier}>
            <SelectTrigger>
              <div className="flex items-center gap-1.5">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={t('transactionHistory.cashierFilter.placeholder')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transactionHistory.cashierFilter.all')}</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {t('transactionHistory.cashierFilter.cashierLabel', { name: u.name, username: u.username })}
                </SelectItem>
              ))}
              <SelectItem value="unknown">{t('transactionHistory.cashierFilter.unknown')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <StatCard label={t('transactionHistory.summary.totalTransactions')} value={filtered.length} />
          <StatCard label={t('transactionHistory.summary.totalSales')} value={rp(filteredTotal)} />
        </div>
      )}

      {/* Open bill: ditarik keluar dari sheet kasir supaya bill yang menganggur tetap terlihat */}
      {showOpenSection && (
        <div className="mb-4">
          <SectionTitle
            title={
              <span className="inline-flex items-center gap-2">
                {t('transactionHistory.status.open')}
                <Badge variant="warning" size="sm">{openBillsList.length}</Badge>
              </span>
            }
          />
          <ItemGroup>
            {openBillsList.map(tx => {
              const items = getTxItems(tx.id);
              const billLabel = [
                tx.tableNumber ? t('transactionHistory.detail.table', { number: tx.tableNumber }) : null,
                tx.customerName || null,
              ].filter(Boolean).join(' · ');
              return (
                <Item
                  key={tx.id ?? tx.receiptNumber}
                  interactive
                  className="border-warning/30"
                  onClick={() => openDetail(tx)}
                >
                  <ItemMedia tone="warning"><ShoppingCart /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>{billLabel ? `${billLabel} · ${tx.receiptNumber}` : tx.receiptNumber}</ItemTitle>
                    <ItemDescription>
                      {items.length > 0 ? `${items.length} ${t('transactionHistory.detail.items')} · ` : ''}
                      {format(new Date(tx.openedAt ?? tx.date), 'd MMM HH:mm', { locale: dateLocale })}
                      {multiUserEnabled ? ` · ${cashierName(tx.createdBy)}` : ''}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <span className="text-sm font-semibold tabular-nums">{rp(tx.total)}</span>
                    {can('create_transaction') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/cashier', { state: { loadBillId: tx.id } });
                        }}
                      >
                        {t('transactionHistory.continueBill', { defaultValue: 'Lanjut' })}
                      </Button>
                    )}
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
        </div>
      )}

      {/* Daftar transaksi per hari */}
      {dateKeys.length === 0 ? (
        !showOpenSection ? (
          <EmptyState
            /* `ShoppingBag` di registry ikon app ini dipetakan ke SVG
               percent/discount, jadi layar "belum ada transaksi" mencetak
               lambang persen. `Receipt` adalah objek yang memang dibicarakan
               layar ini. */
            icon={ReceiptIcon}
            title={t('transactionHistory.empty.title', { defaultValue: hasDateFilter ? 'Tidak ada transaksi di rentang ini' : 'Belum ada transaksi' })}
            description={hasDateFilter ? t('transactionHistory.empty.withDateFilter') : t('transactionHistory.empty.noDateFilter')}
          />
        ) : null
      ) : (
        <div className="space-y-4">
          {dateKeys.map(dateKey => (
            <div key={dateKey}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {t('transactionHistory.groupHeader_other', { date: format(new Date(dateKey), 'EEEE, dd MMMM yyyy', { locale: dateLocale }), count: grouped[dateKey].length })}
              </p>
              <Card className="divide-y divide-border overflow-hidden">
                {grouped[dateKey].map(tx => {
                  const items = getTxItems(tx.id);
                  const debt = getDebt(tx.id);
                  const hasDebt = debt?.status !== undefined && debt?.status !== 'paid';
                  return (
                    <Item
                      key={tx.id ?? tx.receiptNumber}
                      variant="flat"
                      interactive
                      onClick={() => openDetail(tx)}
                    >
                      <ItemMedia tone={tx.status === 'open' ? 'warning' : 'muted'}>
                        {tx.status === 'open' ? <ShoppingCart /> : <ReceiptIcon />}
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          {tx.receiptNumber}
                          {tx.customerName ? ` · ${tx.customerName}` : ''}
                          {tx.tableNumber ? ` · ${t('transactionHistory.detail.table', { number: tx.tableNumber })}` : ''}
                        </ItemTitle>
                        <ItemDescription className="flex items-center gap-1.5">
                          <span className="truncate">
                            {items.length} {t('transactionHistory.detail.items')} · {paymentLabel(tx)} · {format(new Date(tx.date), 'HH:mm')}
                            {multiUserEnabled ? ` · ${cashierName(tx.createdBy)}` : ''}
                          </span>
                          {tx.status === 'open' ? (
                            <Badge variant="warning" size="sm">{t('transactionHistory.badges.open')}</Badge>
                          ) : hasDebt ? (
                            <Badge variant="info" size="sm">{t('transactionHistory.badges.debt')}</Badge>
                          ) : null}
                        </ItemDescription>
                      </ItemContent>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{rp(tx.total)}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Item>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="mx-auto flex h-[80vh] max-w-lg flex-col rounded-t-2xl md:max-w-xl">
          <SheetHeader className="shrink-0">
            <SheetTitle className="text-left">{t('transactionHistory.detail.title')}</SheetTitle>
          </SheetHeader>
          {selectedTx && (
            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pb-6">
              <Card>
                <CardContent className="px-4 py-1">
                  <DataList>
                    <DataListRow
                      label={t('transactionHistory.detail.status.label')}
                      value={
                        <Badge variant={selectedTx.status === 'open' ? 'warning' : 'success'} size="sm">
                          {selectedTx.status === 'open' ? t('transactionHistory.detail.status.open') : t('transactionHistory.detail.status.paid')}
                        </Badge>
                      }
                    />
                    <DataListRow label={t('transactionHistory.detail.receiptNumber')} value={selectedTx.receiptNumber} />
                    <DataListRow label={t('transactionHistory.detail.date')} value={format(new Date(selectedTx.date), 'dd MMM yyyy, HH:mm', { locale: dateLocale })} />
                    <DataListRow label={t('transactionHistory.detail.payment')} value={paymentLabel(selectedTx)} />
                    {multiUserEnabled && (
                      <DataListRow label={t('transactionHistory.detail.cashier')} value={cashierName(selectedTx.createdBy)} />
                    )}
                    {selectedTx.customerName && (
                      <DataListRow label={t('transactionHistory.detail.customer')} value={selectedTx.customerName} />
                    )}
                    {selectedTx.tableNumber && (
                      <DataListRow label={t('transactionHistory.detail.table', { number: selectedTx.tableNumber })} value="" />
                    )}
                    {selectedTx.remarks && (
                      <DataListRow label={t('transactionHistory.detail.notes')} value={selectedTx.remarks} valueClassName="max-w-[60%] text-right font-normal" />
                    )}
                  </DataList>
                </CardContent>
              </Card>

              <div>
                <SectionTitle title={t('transactionHistory.detail.items')} />
                <Card className="divide-y divide-border overflow-hidden">
                  {getTxItems(selectedTx.id).map((item, i) => (
                    <Item key={i} variant="flat" className="px-3 py-2.5">
                      <ItemContent>
                        <ItemTitle>{item.productName}</ItemTitle>
                        <ItemDescription>
                          {t('transactionHistory.detail.quantityFormat', { qty: item.quantity, price: rp(item.price) })}
                          {item.discountAmount > 0 && ` (${t('transactionHistory.detail.discount', { amount: rp(item.discountAmount) })})`}
                        </ItemDescription>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        )}
                      </ItemContent>
                      <span className="text-sm font-semibold tabular-nums">{rp(item.subtotal)}</span>
                    </Item>
                  ))}
                </Card>
              </div>

              <DataList>
                <DataListRow label={t('transactionHistory.detail.subtotal')} value={rp(selectedTx.subtotal)} />
                {selectedTx.discountAmount > 0 && (
                  <DataListRow label={t('transactionHistory.detail.discountAmount')} value={`-${rp(selectedTx.discountAmount)}`} valueClassName="text-destructive-text" />
                )}
                <DataListRow total label={t('transactionHistory.detail.total')} value={rp(selectedTx.total)} valueClassName="text-base" />
                {getDebt(selectedTx.id) && (
                  <DataListRow
                    label={t('transactionHistory.detail.remainingDebt')}
                    value={rp(getDebt(selectedTx.id)?.remainingAmount ?? 0)}
                    valueClassName={getDebt(selectedTx.id)?.status === 'paid' ? 'text-success-text' : 'text-warning-text'}
                  />
                )}
                {selectedTx.status !== 'open' ? (
                  <>
                    <DataListRow label={t('transactionHistory.detail.paid')} value={rp(selectedTx.paymentAmount)} />
                    {!getDebt(selectedTx.id) && (
                      <DataListRow label={t('transactionHistory.detail.change')} value={rp(selectedTx.change)} valueClassName="text-success-text" />
                    )}
                    <DataListRow label={t('transactionHistory.detail.profit')} value={rp(selectedTx.profit)} valueClassName="text-success-text" />
                  </>
                ) : null}
              </DataList>
              {selectedTx.status === 'open' && (
                <p className="text-xs text-warning-text">{t('transactionHistory.detail.unpaidBill')}</p>
              )}

              {selectedTx.status === 'open' ? (
                <Button size="xl" className="w-full" onClick={() => { setDetailOpen(false); navigate('/cashier'); }}>
                  <ShoppingCart />
                  {t('transactionHistory.detail.continueInCashier')}
                </Button>
              ) : (
                <Button size="xl" className="w-full" onClick={openReceipt}>
                  <ReceiptIcon />
                  {t('transactionHistory.detail.viewReceipt')}
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full border-destructive/30 text-destructive-text hover:bg-destructive/5"
                onClick={() => { setRestoreStock(true); setDeleteDialogOpen(true); }}
                disabled={!can('delete_transaction')}
                title={!can('delete_transaction') ? t('transactionHistory.detail.noDeletePermission') : undefined}
              >
                <Trash2 />
                {t('transactionHistory.detail.delete')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Receipt reprint */}
      {selectedTx && (
        <ReceiptDialog
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          transaction={selectedTx}
          items={getTxItems(selectedTx.id)}
          storeSettings={storeSettings}
          paymentMethodName={
            getDebt(selectedTx.id)
              ? `${selectedTx.paymentAmount > 0 ? `${getPaymentName(selectedTx.paymentMethodId)} + ` : ''}${t('transactionHistory.badges.debt')}`
              : getPaymentName(selectedTx.paymentMethodId)
          }
          cashierName={selectedTx.createdBy ? cashierName(selectedTx.createdBy) : undefined}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transactionHistory.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t('transactionHistory.deleteDialog.description', { receiptNumber: selectedTx?.receiptNumber, amount: rp(selectedTx?.total ?? 0) })}</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="restore-stock"
                    checked={restoreStock}
                    onCheckedChange={(checked) => setRestoreStock(checked === true)}
                  />
                  <label htmlFor="restore-stock" className="cursor-pointer text-sm">
                    {t('transactionHistory.deleteDialog.restoreStock')}
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('transactionHistory.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive text-white hover:bg-destructive/90">
              {t('transactionHistory.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
