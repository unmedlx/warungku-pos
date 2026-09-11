import { useLiveQuery } from 'dexie-react-hooks';
import { db, isStockManaged, type StockIn } from '@/lib/db';
import { useState } from 'react';
import { ArrowDownToLine, Plus, Trash2 } from '@/components/icons';
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from '@/components/jokoui/item';
import { Badge } from '@/components/jokoui/badge';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { PageHeader } from '@/components/jokoui/page-header';
import HubTabs from '@/components/layout/HubTabs';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import ProductPicker from '@/components/ProductPicker';
import SearchableSelect from '@/components/SearchableSelect';
import NumberInput from '@/components/NumberInput';
import { useTranslation } from 'react-i18next';

const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };
const LOCALES: Record<string, Locale> = { id: idLocale, en: enUS, ms };

export default function StockInPage() {
  const { currentUser, can } = useAuth();
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? idLocale;
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[i18n.language] ?? 'Rp';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<StockIn | null>(null);

  const stockIns = useLiveQuery(() => db.stockIns.orderBy('date').reverse().toArray());
  const products = useLiveQuery(() => db.products.where('isDeleted').equals(0).toArray());
  const suppliers = useLiveQuery(() => db.suppliers.where('isDeleted').equals(0).toArray());

  if (!can('manage_stock_inout')) {
    return <LockedPage title={t('stockIn.locked.title')} permissionLabel={t('stockIn.locked.permissionLabel')} />;
  }

  const filtered = stockIns?.filter(si =>
    filterSupplier === 'all' || si.supplierId === Number(filterSupplier)
  ) ?? [];

  const getProductName = (pid: number) => products?.find(p => p.id === pid)?.name ?? '-';
  const getSupplierName = (sid: number) => suppliers?.find(s => s.id === sid)?.name ?? '-';

  const openAdd = () => {
    setProductId(''); setSupplierId(''); setQuantity(''); setBuyPrice(''); setNotes('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const qty = Number(quantity);
    const price = Number(buyPrice);
    if (!productId || !supplierId || qty <= 0 || price <= 0) {
      toast.error(t('stockIn.toast.fillAll'));
      return;
    }

    const product = products?.find(p => p.id === Number(productId));
    if (!product) return;

    const stockInId = await db.stockIns.add({
      productId: Number(productId),
      supplierId: Number(supplierId),
      quantity: qty,
      buyPrice: price,
      totalPrice: qty * price,
      date: new Date(),
      notes: notes.trim(),
      createdBy: currentUser?.id,
    });

    const oldStock = product.stock;
    const oldHpp = product.hpp;
    const newStock = Math.round((oldStock + qty) * 1e6) / 1e6;
    const newHpp = newStock > 0 ? ((oldStock * oldHpp) + (qty * price)) / newStock : price;

    await db.hppHistory.add({
      productId: product.id!,
      stockInId,
      oldHpp,
      newHpp,
      source: 'stock_in',
      date: new Date(),
    });

    await db.products.update(product.id!, {
      stock: newStock,
      hpp: Math.round(newHpp),
      updatedAt: new Date(),
    });

    toast.success(t('stockIn.toast.success', { product: product.name, qty, hpp: Math.round(newHpp).toLocaleString(numberLocale) }));
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const si = deleteTarget;
    const product = products?.find(p => p.id === si.productId);
    if (!product) return;

    if (product.stock < si.quantity) {
      toast.error(t('stockIn.toast.deleteStockInsufficient'));
      setDeleteTarget(null);
      return;
    }

    try {
      // Cari hppHistory terkait (prefer by stockInId, fallback latest stock_in untuk produk)
      let hppRecord = await db.hppHistory.filter(h => h.stockInId === si.id!).first();
      const allStockInHistory = await db.hppHistory
        .where('productId')
        .equals(si.productId)
        .filter(h => h.source === 'stock_in')
        .toArray();
      const latestHistory = allStockInHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      if (!hppRecord && latestHistory) {
        const dateMatches = Math.abs(new Date(latestHistory.date).getTime() - new Date(si.date).getTime()) < 2000;
        if (dateMatches) hppRecord = latestHistory;
      }

      // Hanya izinkan hapus stock in terbaru untuk produk agar rollback HPP tetap akurat
      if (!hppRecord || hppRecord.id !== latestHistory?.id) {
        toast.error(t('stockIn.toast.deleteNotLatest'));
        setDeleteTarget(null);
        return;
      }

      const newStock = Math.round((product.stock - si.quantity) * 1e6) / 1e6;

      await db.transaction('rw', db.stockIns, db.hppHistory, db.products, async () => {
        await db.stockIns.delete(si.id!);
        if (hppRecord?.id) await db.hppHistory.delete(hppRecord.id);
        await db.products.update(product.id!, {
          stock: newStock,
          hpp: Math.round(hppRecord.oldHpp),
          updatedAt: new Date(),
        });
      });

      toast.success(t('stockIn.toast.deleted', { product: product.name, qty: si.quantity }));
    } catch {
      toast.error(t('stockIn.toast.deleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={ArrowDownToLine} title={t('stockIn.title')}>
        <Button onClick={openAdd}>
          <Plus /> {t('stockIn.add')}
        </Button>
      </PageHeader>
      <HubTabs />

      <SearchableSelect
        value={filterSupplier}
        onChange={setFilterSupplier}
        placeholder={t('stockIn.supplierFilter.placeholder')}
        searchPlaceholder={t('stockIn.supplierFilter.searchPlaceholder')}
        options={[
          { value: 'all', label: t('stockIn.supplierFilter.all') },
          ...(suppliers?.map(s => ({ value: s.id!.toString(), label: s.name })) ?? []),
        ]}
      />

      <p className="text-xs text-muted-foreground">{t('stockIn.count', { count: filtered.length })}</p>

      {filtered.length === 0 ? (
        <EmptyState icon={ArrowDownToLine} title={t('stockIn.empty')} />
      ) : (
        <ItemGroup>
          {filtered.map(si => (
            <Item key={si.id} className="items-start">
              <ItemContent>
                <ItemTitle>{getProductName(si.productId)}</ItemTitle>
                <ItemDescription>{t('stockIn.item.fromSupplier', { supplier: getSupplierName(si.supplierId) })}</ItemDescription>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant="success" size="sm">{t('stockIn.item.quantity', { qty: si.quantity })}</Badge>
                  <span className="text-xs text-muted-foreground">{t('stockIn.item.unitPrice', { price: si.buyPrice.toLocaleString(numberLocale) })}</span>
                </div>
                {si.notes && <p className="mt-0.5 text-xs italic text-muted-foreground">{si.notes}</p>}
              </ItemContent>
              <ItemActions className="flex-col items-end gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive-text hover:text-destructive-text"
                  onClick={() => setDeleteTarget(si)}
                  title={t('stockIn.delete.title')}
                  aria-label={t('stockIn.delete.title')}
                >
                  <Trash2 />
                </Button>
                <p className="text-xs text-muted-foreground">{format(new Date(si.date), 'dd MMM yy', { locale: dateLocale })}</p>
                <p className="text-sm font-semibold tabular-nums">{currencySymbol} {si.totalPrice.toLocaleString(numberLocale)}</p>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader><DialogTitle>{t('stockIn.dialog.title')}</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3.5">
            <div className="space-y-1.5">
              <Label>{t('stockIn.dialog.productLabel')}</Label>
              <ProductPicker
                products={products ?? []}
                value={productId}
                onChange={setProductId}
                filter={p => isStockManaged(p)}
                showHpp
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('stockIn.dialog.supplierLabel')}</Label>
              <SearchableSelect
                value={supplierId}
                onChange={setSupplierId}
                placeholder={t('stockIn.supplierFilter.searchPlaceholder')}
                searchPlaceholder={t('stockIn.supplierFilter.searchPlaceholder')}
                options={suppliers?.map(s => ({ value: s.id!.toString(), label: s.name })) ?? []}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('stockIn.dialog.quantityLabel')}</Label>
                <NumberInput value={quantity} onChange={setQuantity} placeholder={t('stockIn.dialog.quantityPlaceholder')} decimal />
              </div>
              <div className="space-y-1.5">
                <Label>{t('stockIn.dialog.buyPriceLabel')}</Label>
                <NumberInput value={buyPrice} onChange={setBuyPrice} placeholder={t('stockIn.dialog.buyPricePlaceholder')} decimal />
              </div>
            </div>
            {quantity && buyPrice && (
              <div className="rounded-xl bg-muted p-3 text-sm font-medium tabular-nums">
                {t('stockIn.dialog.total', { amount: (Number(quantity) * Number(buyPrice)).toLocaleString(numberLocale) })}
              </div>
            )}
            <div className="space-y-1.5"><Label>{t('stockIn.dialog.notesLabel')}</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('stockIn.dialog.notesPlaceholder')} /></div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="xl" className="flex-1" onClick={() => setDialogOpen(false)}>{t('stockIn.delete.cancel')}</Button>
              <Button size="xl" className="flex-[2]" onClick={handleSave}>{t('stockIn.dialog.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('stockIn.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('stockIn.delete.description', { product: getProductName(deleteTarget?.productId ?? 0), qty: deleteTarget?.quantity ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('stockIn.delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white shadow-destructive hover:bg-destructive/90">
              {t('stockIn.delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
