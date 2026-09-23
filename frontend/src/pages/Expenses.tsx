import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense, type ExpenseCategory } from '@/lib/db';
import { useState, useMemo } from 'react';
import { Wallet, Plus, Edit2, Trash2, FilterX } from '@/components/icons';
import { Card } from '@/components/jokoui/card';
import { SegmentGroup } from '@/components/jokoui/segment-group';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription } from '@/components/jokoui/item';
import { Alert, AlertDescription } from '@/components/jokoui/alert';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Textarea } from '@/components/jokoui/textarea';
import { PageHeader } from '@/components/jokoui/page-header';
import HubTabs from '@/components/layout/HubTabs';
import { StatCard } from '@/components/jokoui/stat-card';
import {
  MoneyPanel,
  MoneyPanelAmount,
  MoneyPanelFooter,
  MoneyPanelLabel,
} from '@/components/jokoui/money-panel';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, startOfDay, startOfMonth, subDays } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';

type RangePreset = 'today' | '7' | '30' | 'month' | 'all';

const CURRENCY_SYMBOL: Record<string, string> = {
  id: 'Rp',
  en: '$',
  ms: 'Rp',
};

const NUMBER_LOCALES: Record<string, string> = {
  id: 'id-ID',
  en: 'en-US',
  ms: 'ms-MY',
};

const LOCALES: Record<string, Locale> = {
  id,
  en: enUS,
  ms,
};

function rangeStart(range: RangePreset): Date | null {
  const now = new Date();
  switch (range) {
    case 'today':
      return startOfDay(now);
    case '7':
      return startOfDay(subDays(now, 6));
    case '30':
      return startOfDay(subDays(now, 29));
    case 'month':
      return startOfMonth(now);
    case 'all':
      return null;
  }
}

export default function ExpensesPage() {
  const { currentUser, can } = useAuth();
  const { t, i18n } = useTranslation('settings');

  const lang = i18n.language?.split('-')[0] || 'id';
  const dateLocale = LOCALES[lang] || id;
  const numberLocale = NUMBER_LOCALES[lang] || 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[lang] || 'Rp';

  const rp = (n: number) => `${currencySymbol} ${n.toLocaleString(numberLocale)}`;

  const rangeKeyToLabel = (r: RangePreset): string => {
    const key: Record<RangePreset, string> = {
      today: 'expenses.range.today',
      '7': 'expenses.range.last7',
      '30': 'expenses.range.last30',
      month: 'expenses.range.thisMonth',
      all: 'expenses.range.all',
    };
    return t(key[r]);
  };

  const [range, setRange] = useState<RangePreset>('30');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

  // Add/edit form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const expenses = useLiveQuery(async () => {
    const start = rangeStart(range);
    const all = start
      ? await db.expenses.where('date').aboveOrEqual(start).toArray()
      : await db.expenses.toArray();
    return all.filter((e) => e.isDeleted === 0).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [range]);

  const categories = useLiveQuery(() =>
    db.expenseCategories.where('isDeleted').equals(0).toArray(),
  );
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());

  const canManage = can('manage_expenses');
  const canView = can('view_expenses') || canManage;

  const filtered = useMemo(() => {
    if (!expenses) return [];
    if (filterCategoryId === 'all') return expenses;
    return expenses.filter((e) => e.categoryId === Number(filterCategoryId));
  }, [expenses, filterCategoryId]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered],
  );

  const getCategory = (id: number): ExpenseCategory | undefined =>
    categories?.find((c) => c.id === id);
  const getPaymentName = (id: number): string =>
    paymentMethods?.find((p) => p.id === id)?.name ?? '-';

  // === Form helpers ===

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setCategoryId(categories && categories.length > 0 ? String(categories[0].id) : '');
    setAmount('');
    setPaymentMethodId(
      paymentMethods && paymentMethods.length > 0 ? String(paymentMethods[0].id) : '',
    );
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setTitle(exp.title);
    setCategoryId(String(exp.categoryId));
    setAmount(String(exp.amount));
    setPaymentMethodId(String(exp.paymentMethodId));
    setDate(format(new Date(exp.date), 'yyyy-MM-dd'));
    setNotes(exp.notes ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const numericAmount = Number(amount);
    if (!trimmedTitle) {
      toast.error(t('expenses.toast.titleRequired'));
      return;
    }
    if (!categoryId) {
      toast.error(t('expenses.toast.categoryRequired'));
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error(t('expenses.toast.amountInvalid'));
      return;
    }
    if (!paymentMethodId) {
      toast.error(t('expenses.toast.methodRequired'));
      return;
    }
    if (!date) {
      toast.error(t('expenses.toast.dateRequired'));
      return;
    }

    // Build a Date at midnight local; users only pick date, not time.
    const expenseDate = new Date(`${date}T00:00:00`);

    try {
      if (editing?.id) {
        await db.expenses.update(editing.id, {
          title: trimmedTitle,
          categoryId: Number(categoryId),
          amount: numericAmount,
          paymentMethodId: Number(paymentMethodId),
          date: expenseDate,
          notes: notes.trim() || undefined,
        });
        toast.success(t('expenses.toast.updated'));
      } else {
        await db.expenses.add({
          title: trimmedTitle,
          categoryId: Number(categoryId),
          amount: numericAmount,
          paymentMethodId: Number(paymentMethodId),
          date: expenseDate,
          notes: notes.trim() || undefined,
          createdAt: new Date(),
          createdBy: currentUser?.id,
          isDeleted: 0,
          deletedAt: null,
        });
        toast.success(t('expenses.toast.added'));
      }
      setDialogOpen(false);
    } catch {
      toast.error(t('expenses.toast.saveFailed'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await db.expenses.update(deleteTarget.id, {
      isDeleted: 1,
      deletedAt: new Date(),
    });
    toast.success(t('expenses.toast.deleted'));
    setDeleteTarget(null);
  };

  // === Permission gates ===

  if (!canView) {
    return <LockedPage title={t('expenses.locked.title')} permissionLabel={t('expenses.locked.permissionLabel')} />;
  }

  // === Render ===

  const noCategories = !categories || categories.length === 0;
  const noPaymentMethods = !paymentMethods || paymentMethods.length === 0;

  const rangeItems = (['today', '7', '30', 'month', 'all'] as RangePreset[]).map((r) => ({ value: r, label: rangeKeyToLabel(r) }));

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={Wallet} title={t('expenses.title')}>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus /> {t('expenses.add')}
          </Button>
        )}
      </PageHeader>
      <HubTabs />

      {/* Filter rentang */}
      <SegmentGroup<RangePreset> layout="scroll" value={range} onValueChange={setRange} items={rangeItems} />

      {/* Pengeluaran adalah uang: tata bahasa dompet, bukan kartu stat. */}
      <MoneyPanel variant="card">
        <MoneyPanelLabel>
          {t('expenses.summary.totalExpenses', { range: rangeKeyToLabel(range) })}
        </MoneyPanelLabel>
        <MoneyPanelAmount value={totalAmount} />
        <p className="mt-1 text-2xs font-medium text-primary-dim">
          {t('expenses.summary.count', { count: filtered.length })}
        </p>
      </MoneyPanel>

      {/* Filter kategori */}
      <div className="flex items-center gap-2">
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('expenses.categoryFilter.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('expenses.categoryFilter.all')}</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterCategoryId !== 'all' && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setFilterCategoryId('all')}
            title={t('expenses.clearFilter')}
            aria-label={t('expenses.clearFilter')}
          >
            <FilterX />
          </Button>
        )}
      </div>

      {/* Daftar */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={expenses && expenses.length === 0 ? t('expenses.empty.none') : t('expenses.empty.filtered')}
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {filtered.map((exp) => {
            const cat = getCategory(exp.categoryId);
            return (
              <Item key={exp.id} variant="flat" className="items-start">
                <ItemMedia className="text-base" style={{ backgroundColor: (cat?.color ?? '#6B7280') + '20' }}>
                  {cat?.icon ?? '📦'}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{exp.title}</ItemTitle>
                  <ItemDescription>
                    {cat?.name ?? '—'} · {getPaymentName(exp.paymentMethodId)} · {format(new Date(exp.date), 'dd MMM yyyy', { locale: dateLocale })}
                  </ItemDescription>
                  {exp.notes && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{exp.notes}</p>
                  )}
                  {canManage && (
                    <div className="mt-1 flex gap-1">
                      <Button variant="ghost" size="sm" className="-ml-2.5" onClick={() => openEdit(exp)}>
                        <Edit2 /> {t('expenses.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive-text hover:text-destructive-text" onClick={() => setDeleteTarget(exp)}>
                        <Trash2 /> {t('expenses.delete')}
                      </Button>
                    </div>
                  )}
                </ItemContent>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">-{rp(exp.amount)}</span>
              </Item>
            );
          })}
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('expenses.dialog.editTitle') : t('expenses.dialog.addTitle')}
            </DialogTitle>
          </DialogHeader>

          {(noCategories || noPaymentMethods) && (
            <Alert variant="warning">
              <Wallet />
              <AlertDescription>
                {noCategories && <p>{t('expenses.dialog.missingCategories')}</p>}
                {noPaymentMethods && <p>{t('expenses.dialog.missingPaymentMethods')}</p>}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>{t('expenses.dialog.titleLabel')}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('expenses.dialog.titlePlaceholder')}
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('expenses.dialog.categoryLabel')}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('expenses.dialog.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('expenses.dialog.amountLabel')}</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('expenses.dialog.amountPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('expenses.dialog.dateLabel')}</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('expenses.dialog.methodLabel')}</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('expenses.dialog.methodPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods?.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('expenses.dialog.notesLabel')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('expenses.dialog.notesPlaceholder')}
                rows={3}
                className="resize-none"
              />
            </div>

            <Button
              size="xl"
              className="w-full"
              onClick={handleSave}
              disabled={noCategories || noPaymentMethods}
            >
              {editing ? t('expenses.dialog.saveButton') : t('expenses.dialog.addButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('expenses.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('expenses.deleteDialog.description', {
                title: deleteTarget?.title ?? '',
                amount: deleteTarget ? rp(deleteTarget.amount) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('expenses.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t('expenses.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
