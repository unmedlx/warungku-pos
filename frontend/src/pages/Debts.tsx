import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { Banknote, CheckCircle2, ChevronRight, CreditCard, Receipt, Search, UserRound } from '@/components/icons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db, type Debt } from '@/lib/db';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { Badge } from '@/components/jokoui/badge';
import { Button } from '@/components/jokoui/button';
import { Card, CardContent } from '@/components/jokoui/card';
import { StatCard } from '@/components/jokoui/stat-card';
import {
  MoneyPanel,
  MoneyPanelAmount,
  MoneyPanelFooter,
  MoneyPanelLabel,
} from '@/components/jokoui/money-panel';
import { SegmentGroup } from '@/components/jokoui/segment-group';
import { SectionTitle } from '@/components/jokoui/section-title';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemGroup } from '@/components/jokoui/item';
import { DataList, DataListRow } from '@/components/jokoui/data-list';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/jokoui/page-header';
import HubTabs from '@/components/layout/HubTabs';
import { WhatsAppAction } from '@/components/jokoui/whatsapp-action';
import { bucketDebtsByUrgency, daysOverdue, debtUrgency } from '@/lib/debt-urgency';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/jokoui/textarea';
import { useTranslation } from 'react-i18next';

const LOCALES: Record<string, Locale> = { id, en: enUS, ms };
const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

type DebtFilter = 'active' | 'paid' | 'all';

export default function DebtsPage() {
  const navigate = useNavigate();
  const { can, currentUser } = useAuth();
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? id;
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[i18n.language] ?? 'Rp';

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DebtFilter>('active');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const debts = useLiveQuery(() => db.debts.orderBy('createdAt').reverse().toArray());
  const payments = useLiveQuery(() => db.debtPayments.orderBy('date').reverse().toArray());
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());
  const customers = useLiveQuery(() => db.customers.filter((c) => c.isDeleted === 0).toArray());
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  const customerById = useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c])),
    [customers],
  );

  const txById = useMemo(
    () => new Map((transactions ?? []).map((tx) => [tx.id, tx])),
    [transactions],
  );
  const paymentsByDebt = useMemo(() => {
    const map = new Map<number, typeof payments>();
    for (const payment of payments ?? []) {
      const list = map.get(payment.debtId) ?? [];
      list.push(payment);
      map.set(payment.debtId, list);
    }
    return map;
  }, [payments]);

  if (!can('manage_customers')) {
    return <LockedPage title={t('debts.locked.title')} permissionLabel={t('debts.locked.permissionLabel')} />;
  }

  const activeDebts = debts?.filter((debt) => debt.status !== 'paid') ?? [];
  const totalReceivable = activeDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const filteredDebts = (debts ?? []).filter((debt) => {
    if (filter === 'active' && debt.status === 'paid') return false;
    if (filter === 'paid' && debt.status !== 'paid') return false;
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const tx = txById.get(debt.transactionId);
    return debt.customerName.toLowerCase().includes(query) ||
      (tx?.receiptNumber?.toLowerCase() ?? '').includes(query);
  });

  // Dihitung langsung, bukan useMemo: ada early-return di atas sehingga hook
  // tidak boleh dipanggil di sini, dan daftar kasbon selalu kecil.
  const now = new Date();
  const buckets = bucketDebtsByUrgency(debts ?? [], now);

  /**
   * Saat menampilkan kasbon aktif, urutkan dari yang paling mendesak. Filter
   * "lunas" dan "semua" tetap urut waktu — di sana yang dicari riwayat, bukan
   * tindakan.
   */
  const orderedDebts = filter === 'active'
    ? [...buckets.overdue, ...buckets.dueSoon, ...buckets.safe].filter((debt) => filteredDebts.includes(debt))
    : filteredDebts;

  const rp = (value: number) => `${currencySymbol} ${value.toLocaleString(numberLocale)}`;
  const getPaymentName = (id: number) =>
    paymentMethods?.find((method) => method.id === id)?.name ?? t('debts.deletedMethodFallback');

  const openPayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount(String(debt.remainingAmount));
    setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? '');
    setPaymentNotes('');
    setPaymentOpen(true);
  };

  const savePayment = async () => {
    if (!selectedDebt?.id) return;
    const amount = Number(paymentAmount) || 0;
    if (amount <= 0 || amount > selectedDebt.remainingAmount) {
      toast.error(t('debts.toast.invalidAmount'));
      return;
    }
    if (!paymentMethodId) {
      toast.error(t('debts.toast.selectMethod'));
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const remainingAmount = selectedDebt.remainingAmount - amount;
      await db.transaction('rw', db.debts, db.debtPayments, async () => {
        await db.debtPayments.add({
          debtId: selectedDebt.id!,
          amount,
          paymentMethodId: Number(paymentMethodId),
          date: now,
          notes: paymentNotes.trim() || undefined,
          createdBy: currentUser?.id,
        });
        await db.debts.update(selectedDebt.id!, {
          remainingAmount,
          status: remainingAmount === 0 ? 'paid' : 'partial',
          settledAt: remainingAmount === 0 ? now : null,
        });
      });
      setSelectedDebt({ ...selectedDebt, remainingAmount, status: remainingAmount === 0 ? 'paid' : 'partial', settledAt: remainingAmount === 0 ? now : null });
      setPaymentOpen(false);
      toast.success(remainingAmount === 0 ? t('debts.toast.paidOff') : t('debts.toast.recorded'));
    } catch {
      toast.error(t('debts.toast.failed'));
    } finally {
      setSaving(false);
    }
  };

  const filterItems: { value: DebtFilter; label: string }[] = [
    { value: 'active', label: t('debts.filters.active') },
    { value: 'paid', label: t('debts.filters.paid') },
    { value: 'all', label: t('debts.filters.all') },
  ];

  const urgencyBadge = (debt: Debt) => {
    if (debt.status === 'paid') return <Badge variant="success" size="sm">{t('debts.detail.status.paid')}</Badge>;
    if (!debt.dueDate) return null;
    const urgency = debtUrgency(debt, now);
    if (urgency === 'overdue') {
      return <Badge variant="destructive" size="sm">{t('debts.urgency.lateByDays', { count: daysOverdue(debt, now) })}</Badge>;
    }
    return (
      <Badge variant={urgency === 'dueSoon' ? 'warning' : 'success'} size="sm">
        {t('debts.urgency.dueOn', { date: format(new Date(debt.dueDate), 'd MMM', { locale: dateLocale }) })}
      </Badge>
    );
  };

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={CreditCard} title={t('debts.title')} onBack={() => navigate(-1)} />
      <HubTabs />

      {/* Piutang adalah uang, jadi ia memakai tata bahasa dompet: satu
          bidang brand yang dicelup, nominalnya sebagai objek, dan tiga
          keranjang urgensi di kakinya — bukan satu kartu ditambah tiga
          kartu stat terpisah yang memecah satu urusan jadi empat permukaan.
          Yang menentukan tindakan hari ini adalah berapa yang sudah telat,
          bukan total piutangnya, jadi keranjang itu tinggal di objek yang
          sama dengan totalnya. */}
      <MoneyPanel variant="card">
        <div className="flex items-start justify-between gap-2">
          <MoneyPanelLabel>{t('debts.summary.totalReceivable')}</MoneyPanelLabel>
          {buckets.overdue.length > 0 && (
            <Badge variant="destructive" size="sm" className="shrink-0 border-0">
              {t('debts.summary.overdueCount', { count: buckets.overdue.length })}
            </Badge>
          )}
        </div>
        <MoneyPanelAmount value={totalReceivable} />
        <p className="mt-1 text-2xs font-medium text-primary-dim">
          {t('debts.summary.activeDebts')}: {activeDebts.length}
        </p>

        <MoneyPanelFooter className="justify-start divide-x divide-white/20">
          {[
            { key: 'overdue', label: t('debts.urgency.overdue'), value: buckets.totals.overdue },
            { key: 'dueSoon', label: t('debts.urgency.dueSoon'), value: buckets.totals.dueSoon },
            { key: 'safe', label: t('debts.urgency.safe'), value: buckets.totals.safe },
          ].map((bucket, i) => (
            <div key={bucket.key} className={cn('min-w-0 flex-1', i === 0 ? 'pr-3' : 'px-3 last:pr-0')}>
              <span className="block truncate text-3xs font-semibold uppercase tracking-[0.04em] text-primary-dim">
                {bucket.label}
              </span>
              <span className="mt-0.5 block truncate text-xsm font-bold tabular-nums text-primary-foreground">
                {rp(bucket.value)}
              </span>
            </div>
          ))}
        </MoneyPanelFooter>
      </MoneyPanel>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('debts.searchPlaceholder')}
          className="pl-8"
        />
      </div>

      <SegmentGroup<DebtFilter> layout="full" value={filter} onValueChange={setFilter} items={filterItems} />

      {orderedDebts.length === 0 ? (
        <EmptyState icon={CheckCircle2} title={t('debts.empty')} />
      ) : (
        <ItemGroup>
          {orderedDebts.map((debt) => {
            const tx = txById.get(debt.transactionId);
            const paid = debt.originalAmount - debt.remainingAmount;
            const urgency = debtUrgency(debt, now);
            const tone = debt.status === 'paid' ? 'success' : urgency === 'overdue' ? 'destructive' : urgency === 'dueSoon' ? 'warning' : 'muted';
            return (
              <Item
                key={debt.id}
                className={cn(
                  'flex-col items-stretch gap-2.5',
                  debt.status !== 'paid' && urgency === 'overdue' && 'border-destructive/30',
                  debt.status !== 'paid' && urgency === 'dueSoon' && 'border-warning/30',
                )}
              >
                <button type="button" className="flex w-full items-center gap-3 text-left outline-none" onClick={() => setSelectedDebt(debt)}>
                  <ItemMedia tone={tone}><UserRound /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>{debt.customerName}</ItemTitle>
                    <ItemDescription className="flex items-center gap-1.5">
                      <span className="truncate">{tx?.receiptNumber ?? '-'} · {format(new Date(debt.createdAt), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}</span>
                      {urgencyBadge(debt)}
                    </ItemDescription>
                  </ItemContent>
                  <span className={cn('text-sm font-semibold tabular-nums', debt.status === 'paid' ? 'text-success-text' : 'text-foreground')}>{rp(debt.remainingAmount)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <DataList className="rounded-lg bg-muted/50 px-3">
                  <DataListRow className="py-1.5 text-xs" label={t('debts.labels.originalAmount')} value={rp(debt.originalAmount)} />
                  <DataListRow className="py-1.5 text-xs" label={t('debts.labels.paid')} value={rp(paid)} valueClassName="text-success-text" />
                </DataList>
                {debt.status !== 'paid' && (
                  <Button variant="secondary" className="w-full" onClick={() => openPayment(debt)}>
                    <Banknote />
                    {t('debts.recordPayment')}
                  </Button>
                )}
              </Item>
            );
          })}
        </ItemGroup>
      )}

      <Sheet open={!!selectedDebt && !paymentOpen} onOpenChange={(open) => { if (!open) setSelectedDebt(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          {selectedDebt && (() => {
            const tx = txById.get(selectedDebt.transactionId);
            const debtPayments = paymentsByDebt.get(selectedDebt.id!) ?? [];
            return (
              <>
                <SheetHeader>
                  <SheetTitle>{t('debts.detail.title')}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <Item>
                    <ItemMedia tone={selectedDebt.status === 'paid' ? 'success' : 'warning'}><UserRound /></ItemMedia>
                    <ItemContent>
                      <ItemTitle>{selectedDebt.customerName}</ItemTitle>
                      <ItemDescription>
                        <button type="button" className="inline-flex items-center gap-1 text-primary" onClick={() => navigate(`/history?txId=${selectedDebt.transactionId}`)}>
                          <Receipt className="h-3.5 w-3.5" />
                          {tx?.receiptNumber ?? t('debts.detail.viewTransaction')}
                        </button>
                      </ItemDescription>
                    </ItemContent>
                    <Badge variant={selectedDebt.status === 'paid' ? 'success' : selectedDebt.status === 'partial' ? 'info' : 'warning'} size="sm">
                      {selectedDebt.status === 'paid' ? t('debts.detail.status.paid') : selectedDebt.status === 'partial' ? t('debts.detail.status.partial') : t('debts.detail.status.unpaid')}
                    </Badge>
                  </Item>

                  <div className="grid grid-cols-2 gap-2">
                    <StatCard label={t('debts.labels.originalAmount')} value={rp(selectedDebt.originalAmount)} />
                    <StatCard label={t('debts.labels.remaining')} value={rp(selectedDebt.remainingAmount)} valueClassName={selectedDebt.status === 'paid' ? 'text-success-text' : 'text-warning-text'} />
                  </div>

                  <div>
                    <SectionTitle title={t('debts.detail.paymentHistory')} />
                    {debtPayments.length === 0 ? (
                      <p className="py-4 text-center text-xsm text-muted-foreground">{t('debts.detail.noInstallments')}</p>
                    ) : (
                      <Card className="divide-y divide-border overflow-hidden">
                        {debtPayments.map((payment) => (
                          <Item key={payment.id} variant="flat" className="px-3">
                            <ItemMedia tone="success" size="sm"><Banknote /></ItemMedia>
                            <ItemContent>
                              <ItemTitle>{getPaymentName(payment.paymentMethodId)}</ItemTitle>
                              <ItemDescription>
                                {format(new Date(payment.date), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                                {payment.notes ? ` · ${payment.notes}` : ''}
                              </ItemDescription>
                            </ItemContent>
                            <span className="text-sm font-semibold tabular-nums text-success-text">{rp(payment.amount)}</span>
                          </Item>
                        ))}
                      </Card>
                    )}
                  </div>

                  {selectedDebt.status !== 'paid' && (
                    <div className="flex gap-2">
                      {/* Menagih itu canggung — kalimatnya disusunkan supaya
                          hambatannya tinggal satu ketukan. */}
                      <WhatsAppAction
                        className="flex-1"
                        phone={customerById.get(selectedDebt.customerId)?.phone ?? ''}
                        label={t('debts.remindViaWhatsApp', { defaultValue: 'Tagih via WA' })}
                        message={t('debts.whatsAppMessage', {
                          defaultValue:
                            'Halo {{name}}, mengingatkan kasbon di {{store}} sebesar {{amount}} yang belum lunas. Terima kasih 🙏',
                          name: selectedDebt.customerName,
                          store: storeSettings?.storeName ?? '',
                          amount: rp(selectedDebt.remainingAmount),
                        })}
                      />
                      <Button className="flex-1" onClick={() => openPayment(selectedDebt)}>
                        <Banknote />
                        {t('debts.recordPayment')}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('debts.paymentDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <DataList className="rounded-lg border border-warning/30 bg-warning/5 px-3">
              <DataListRow label={t('debts.paymentDialog.remainingDebt')} value={rp(selectedDebt?.remainingAmount ?? 0)} valueClassName="text-warning-text" />
            </DataList>
            <div className="space-y-1.5">
              <Label>{t('debts.paymentDialog.amountLabel')}</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className="text-lg font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('debts.paymentDialog.methodLabel')}</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger><SelectValue placeholder={t('debts.paymentDialog.methodPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {paymentMethods?.map((method) => (
                    <SelectItem key={method.id} value={String(method.id)}>{method.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('debts.paymentDialog.notesLabel')}</Label>
              <Textarea
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                placeholder={t('debts.paymentDialog.notesPlaceholder')}
                rows={3}
              />
            </div>
            <Button size="xl" className="w-full" onClick={savePayment} disabled={saving || !paymentMethodId || Number(paymentAmount) <= 0}>
              {saving ? t('debts.paymentDialog.saving') : t('debts.paymentDialog.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
